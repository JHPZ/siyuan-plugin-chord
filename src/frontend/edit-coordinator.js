const EDIT_BLOCK_ID = /^\d{14}-[a-z0-9]{7}$/;

// One owner for lease changes, save barriers and explicit multi-block operations.
class EditCoordinator {
    constructor(plugin, adapter) {
        this.plugin = plugin;
        this.adapter = adapter;
        this.sequence = 0;
        this.revision = 0;
        this.epoch = 0;
        this.phase = 'browsing';
        this.editTarget = null;
        this.held = [];
        this.desired = [];
        this.jobs = [];
        this.lease = null;
        this.mayHold = false;
        this.leaseUntil = 0;
    }

    normalize(context) {
        if (!context || !EDIT_BLOCK_ID.test(context.documentId || '') || !Array.isArray(context.blocks) ||
            !context.blocks.length || context.blocks.length > 200) throw new Error('Invalid edit context');
        const blocks = new Map();
        for (const block of context.blocks) {
            if (!block || !EDIT_BLOCK_ID.test(block.blockId || '') || !Array.isArray(block.ancestors) || block.ancestors.length > 32 ||
                block.ancestors.some(id => !EDIT_BLOCK_ID.test(id || '') || id === block.blockId)) throw new Error('Invalid edit context');
            const normalized = { blockId: block.blockId, ancestors: [...new Set(block.ancestors)] };
            if (blocks.has(block.blockId) && JSON.stringify(blocks.get(block.blockId)) !== JSON.stringify(normalized)) throw new Error('Invalid edit context');
            blocks.set(block.blockId, normalized);
        }
        return { documentId: context.documentId, blocks: [...blocks.values()] };
    }

    key(context) {
        return JSON.stringify({ documentId: context.documentId, blocks: [...context.blocks].sort((a, b) => a.blockId.localeCompare(b.blockId)) });
    }

    enqueue(run) {
        const promise = new Promise((resolve, reject) => this.jobs.push({ run, resolve, reject }));
        this.pump();
        return promise;
    }

    async pump() {
        if (this.running) return;
        this.running = true;
        while (this.jobs.length) {
            const job = this.jobs.shift();
            try { job.resolve(await job.run()); } catch (error) { job.reject(error); }
        }
        this.running = false;
    }

    revoke() { this.held = []; this.leaseUntil = 0; }

    invalidate() {
        ++this.epoch; ++this.revision;
        if (this.operation) this.operation.cancelled = true;
        if (this.lease) this.failedFlush ||= this.lease.editors;
        this.lease = null; this.signature = ''; this.ready = false;
        this.revoke(); this.phase = 'blocked';
    }

    owns(context) {
        return this.ready && this.phase === 'editing' && this.leaseUntil > Date.now() && !this.conflict(context) &&
            context.blocks.every(block => this.held.some(held => held.blockId === block.blockId || block.ancestors.includes(held.blockId)));
    }

    async send(context) {
        if (this.renewing) await this.renewing;
        this.rpcPending = true;
        if (context) this.mayHold = true;
        const sequence = ++this.sequence, epoch = this.epoch;
        try {
            const state = await this.plugin.kernel.rpc.call.editClaim(this.plugin.sessionId, this.plugin.generation, sequence,
                context?.documentId || null, context?.blocks || []);
            if (epoch !== this.epoch) throw new Error('editUnavailable');
            if (typeof state?.granted !== 'boolean') throw new Error('Invalid edit response');
            this.update(state);
            if (!context && state.granted) this.mayHold = false;
            return state;
        } finally { this.rpcPending = false; }
    }

    renew() {
        if (!this.lease || this.renewing || this.rpcPending) return this.renewing;
        const lease = this.lease, started = Date.now(), sequence = ++this.sequence, epoch = this.epoch;
        this.renewing = this.plugin.kernel.rpc.call.editClaim(this.plugin.sessionId, this.plugin.generation, sequence,
            lease.context.documentId, lease.context.blocks).then(state => {
                if (epoch !== this.epoch) return;
                this.update(state);
                if (this.lease !== lease) return;
                if (!state.granted || lease.until <= started) throw new Error('editUnavailable');
                lease.until = started + state.ttl - 1000;
                if (this.phase === 'editing') this.leaseUntil = lease.until;
            }).catch(() => {
                if (epoch !== this.epoch) return;
                this.revoke(); this.ready = false; this.phase = 'blocked';
                if (this.operation) this.operation.cancelled = true;
            }).finally(() => { this.renewing = null; });
        return this.renewing;
    }

    async save(documentId) {
        this.phase = 'saving';
        this.revoke();
        this.flushContext = this.lease?.context;
        const editors = this.failedFlush || this.adapter.editors(documentId);
        // Retain the acquired editor even if it disappeared from getAllEditor during a close.
        const all = [...new Set([...editors, ...(this.lease?.editors || [])])];
        const flushing = (async () => {
            await this.inputBarrier;
            await this.adapter.flush(all);
        })();
        this.flushing = flushing;
        try { await flushing; this.failedFlush = null; }
        catch (error) {
            this.failedFlush = all; this.ready = false; this.phase = 'blocked';
            this.plugin.showEditMessage(this.plugin.i18n.editFlushFailed);
            throw error;
        } finally { if (this.flushing === flushing) { this.flushing = null; this.flushContext = null; } }
    }

    async acquire(context, current) {
        if (!current()) return false;
        this.phase = 'acquiring';
        const started = Date.now();
        const state = await this.send(context);
        if (state.granted) this.lease = { context, until: started + state.ttl - 1000, editors: this.adapter.editors(context.documentId) };
        if (!current()) return false;
        this.ready = true;
        if (!state.granted || this.lease.until <= Date.now()) { this.phase = 'blocked'; return false; }
        this.held = context.blocks; this.leaseUntil = this.lease.until; this.phase = 'editing';
        return true;
    }

    claim(context, force = false) {
        if (this.closing || this.stopped || this.operation || this.uncertain) return Promise.resolve(false);
        context = this.normalize(context);
        const signature = this.key(context);
        if (signature === this.signature) {
            if (this.pending) return this.pending;
            if (this.owns(context)) return force ? Promise.resolve(this.renew()).then(() => this.owns(context)) : Promise.resolve(true);
        }
        const revision = ++this.revision;
        this.signature = signature; this.desired = context.blocks; this.desiredDocumentId = context.documentId;
        this.revoke();
        const request = this.enqueue(async () => {
            const current = () => revision === this.revision && !this.closing && !this.stopped && !this.operation;
            if (!current()) return false;
            try {
                if (this.lease || this.failedFlush || this.inputBarrier) await this.save(this.lease?.context.documentId || context.documentId);
                return await this.acquire(context, current);
            }
            catch { this.ready = false; this.revoke(); this.phase = 'blocked'; return false; }
        });
        this.pending = request;
        request.finally(() => { if (this.pending === request) this.pending = null; });
        return request;
    }

    async relinquish() {
        if (this.uncertain) throw new Error('historyUncertain');
        if (this.lease || this.failedFlush || this.inputBarrier) await this.save(this.lease?.context.documentId);
        // Also invalidate an in-flight grant whose caller cancelled its intent.
        if (this.lease || this.mayHold) {
            const state = await this.send(null);
            if (!state.granted) throw new Error('editUnavailable');
        }
        this.lease = null; this.revoke(); this.phase = 'browsing';
    }

    release() {
        ++this.revision;
        if (this.operation) this.operation.cancelled = true;
        this.editTarget = null;
        this.signature = ''; this.desired = []; this.desiredDocumentId = null; this.revoke();
        return this.enqueue(async () => {
            try { await this.relinquish(); return true; }
            catch { this.phase = 'blocked'; return false; }
        });
    }

    // prepare/validate may read; only execute may write. All affected blocks belong to one claim.
    runOperation(plan) {
        if (this.uncertain) return Promise.reject(new Error('historyUncertain'));
        if (this.closing || this.stopped || this.operation) return Promise.reject(new Error('historyBusy'));
        ++this.revision;
        this.operation = plan;
        this.editTarget = null; this.signature = ''; this.desired = [];
        this.revoke();
        const current = () => !plan.cancelled && !this.closing && plan.current();
        return this.enqueue(async () => {
            let completed = false;
            try {
                await this.save(plan.documentId);
                if (!current()) return false;
                const prepared = await plan.prepare();
                if (!prepared || !current()) return false;
                const context = this.normalize(prepared);
                if (context.documentId !== plan.documentId) throw new Error('historyUnsupported');
                if (!await this.acquire(context, current)) {
                    if (current()) {
                        const conflict = this.conflict(context);
                        this.plugin.showEditMessage(conflict ? this.plugin.i18n.historyLocked.replace('${name}', conflict.name) : this.plugin.i18n.editUnavailable);
                    }
                    return false;
                }
                this.phase = 'validating'; this.revoke();
                await plan.validate(context);
                if (!current() || !this.ready || !this.lease || this.lease.until <= Date.now() || this.conflict(context)) return false;
                this.phase = 'executing';
                try { await plan.execute(context); }
                catch (error) {
                    if (error.commitUnknown) { this.uncertain = true; this.phase = 'blocked'; this.ready = false; }
                    throw error;
                }
                completed = true;
                return true;
            } finally {
                try { await this.relinquish(); }
                catch (error) {
                    this.revoke(); this.phase = 'blocked';
                    if (!completed) throw error;
                    this.plugin.showEditMessage(this.plugin.i18n.editReleaseFailed);
                }
                finally { this.operation = null; }
            }
        });
    }

    async close() {
        this.closing = true;
        const saved = await this.release();
        clearInterval(this.renewTimer);
        return saved;
    }
}
