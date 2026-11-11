class ChordRpcSocket {
    constructor(name, appId, onReconnect, onDisconnect) {
        const url = new URL('/plugin/private/' + encodeURIComponent(name) + '/rpc', window.location.origin);
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        if (appId) url.searchParams.set('appId', appId);
        this.url = url.href;
        this.onReconnect = onReconnect;
        this.onDisconnect = onDisconnect;
        this.pending = new Map();
        this.handlers = new Map();
        this.sequence = 0;
        this.retryDelay = 250;
        this.call = new Proxy({}, { get: (_, method) => (...params) => this.request(method, params) });
    }

    get isOpen() { return this.socket?.readyState === WebSocket.OPEN; }

    bind(method, handler) {
        if (!this.handlers.has(method)) this.handlers.set(method, new Set());
        this.handlers.get(method).add(handler);
    }

    unbind(method, handler) {
        const handlers = this.handlers.get(method);
        handlers?.delete(handler);
        if (!handlers?.size) this.handlers.delete(method);
    }

    connect() {
        if (this.closed) return Promise.reject(new Error('RPC transport closed'));
        if (this.isOpen) return Promise.resolve(this.socket);
        if (this.opening) return this.opening;
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
        this.opening = new Promise((resolve, reject) => { this.resolveOpen = resolve; this.rejectOpen = reject; });
        const opening = this.opening;
        this.connectTimer = setTimeout(() => this.disconnect(new Error('RPC connection timed out')), 10000);
        try {
            const socket = this.socket = new WebSocket(this.url);
            socket.onopen = () => {
                if (this.socket !== socket || this.closed) return;
                clearTimeout(this.connectTimer);
                this.opening = null;
                this.retryDelay = 250;
                this.resolveOpen(socket);
                this.resolveOpen = this.rejectOpen = null;
                if (this.recovering) Promise.resolve().then(() => this.onReconnect?.()).catch(error => console.error('RPC recovery failed:', error));
                this.recovering = false;
            };
            socket.onmessage = event => { if (this.socket === socket && !this.closed) this.receive(event.data); };
            socket.onerror = socket.onclose = () => {
                if (this.socket === socket) this.disconnect(new Error('RPC connection lost'));
            };
        } catch (error) { this.disconnect(error); }
        return opening;
    }

    async request(method, params, fullCursor = false) {
        if (this.closed) throw new Error('RPC transport closed');
        // Transient activity must never wait for a reconnect and replay an old position or click.
        if (['cursorUpdate', 'selectionUpdate', 'editingUpdate', 'shortcut', 'pointerClick'].includes(method) && !this.isOpen) {
            throw new Error('RPC connection unavailable');
        }
        const socket = await this.connect();
        if (this.closed || this.socket !== socket || !this.isOpen) throw new Error('RPC connection lost');
        if (this.pending.size >= 64) throw new Error('Too many pending RPC requests');
        if (socket.bufferedAmount > 1024 * 1024) {
            this.disconnect(new Error('RPC send buffer full'));
            throw new Error('RPC send buffer full');
        }
        let wireMethod = method, wireParams = params, upload = null;
        if (method === 'presenceHeartbeat' && (params[1] === undefined || params[1] && typeof params[1] === 'object' && !Array.isArray(params[1]))) wireParams = [params[0], {...params[1], wire:1, direct:1}];
        if (this.compact && method === 'cursorSnapshot') wireMethod = 'cursorSync';
        if (this.compact && method === 'cursorUpdate') {
            const value = JSON.parse(JSON.stringify(params[3])), sequence = params[2];
            const previous = !fullCursor && this.uploadCursor && this.uploadCursor.sequence < sequence ? this.uploadCursor : null;
            let patch = previous ? wireDiff(previous.value, value) || [1] : [0, wirePack(value)];
            let base = previous?.sequence ?? null;
            if (base !== null) {
                const replacement = [0, wirePack(value)];
                if (JSON.stringify(replacement).length < JSON.stringify(patch).length) { patch = replacement; base = null; }
            }
            wireMethod = 'cursorDelta'; wireParams = [params[0],params[1],sequence,base,patch];
            upload = {sequence, value};
        }
        const id = ++this.sequence;
        const body = JSON.stringify({ jsonrpc: '2.0', id, method:wireMethod, params:wireParams });
        const result = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => this.disconnect(new Error('RPC request timed out')), 10000);
            this.pending.set(id, { resolve, reject, timer });
            try { socket.send(body); }
            catch (error) { this.disconnect(error); }
        });
        if (this.closed || this.socket !== socket) throw new Error('RPC connection lost');
        if (method === 'presenceHeartbeat' && result?.wire === 1) this.compact = true;
        if (wireMethod === 'cursorSync') return this.acceptSnapshot(result);
        if (upload) {
            if (result?.reset === 1) {
                this.uploadCursor = null;
                if (fullCursor) throw Error('Compact cursor baseline rejected');
                return this.request(method, params, true);
            }
            if (result === true && (!this.uploadCursor || this.uploadCursor.sequence < upload.sequence)) this.uploadCursor = upload;
        }
        return result;
    }

    dispatch(method, params) {
        for (const handler of this.handlers.get(method) || []) {
            try { Promise.resolve(handler(...params)).catch(error => console.error('RPC notification failed:', error)); }
            catch (error) { console.error('RPC notification failed:', error); }
        }
    }

    acceptSnapshot(packet) {
        let next = wireReceive(this.download, packet);
        validateCursorState(next.value);
        for (const queued of (this.waitingDeltas || []).filter(value => value[1] === next.epoch && value[2] > next.revision).sort((a,b) => a[2]-b[2])) {
            next = wireReceive(next, queued);
            validateCursorState(next.value);
        }
        if (this.requiredRevision?.epoch === next.epoch && next.revision < this.requiredRevision.revision) throw Error('Compact recovery is behind received data');
        this.download = next;
        this.waitingDeltas = [];
        this.waitingBytes = 0;
        this.requiredRevision = null;
        return next.value;
    }

    rememberDelta(packet) {
        const [,epoch,revision] = packet;
        if (this.requiredRevision?.epoch !== epoch || this.requiredRevision.revision < revision) this.requiredRevision = {epoch,revision};
        const bytes = JSON.stringify(packet).length;
        if ((this.waitingDeltas?.length || 0) >= 512 || (this.waitingBytes || 0) + bytes > 1048576) {
            this.waitingDeltas = [];
            this.waitingBytes = 0;
            return;
        }
        (this.waitingDeltas ||= []).push(packet);
        this.waitingBytes = (this.waitingBytes || 0) + bytes;
    }

    recoverSnapshot(retried = false) {
        if (this.resync) return;
        const tick = this.download?.value.tick || 10;
        this.download = null;
        this.dispatch('cursor-changed', [{tick,cursors:[],selections:[],editing:[]}, true]);
        this.resync = this.request('cursorSnapshot', []).then(value => this.dispatch('cursor-changed', [value])).catch(() => {}).finally(() => {
            this.resync = null;
            if (this.requiredRevision && this.isOpen) {
                if (retried) this.disconnect(new Error('Compact recovery failed'));
                else this.recoverSnapshot(true);
            }
        });
    }

    receive(raw) {
        let messages;
        try { messages = JSON.parse(raw); } catch { return; }
        for (const message of Array.isArray(messages) ? messages : [messages]) {
            if (!message || message.jsonrpc !== '2.0') continue;
            if (message.id === undefined && typeof message.method === 'string') {
                if (!Array.isArray(message.params)) continue;
                if (message.method === 'cursor-delta') {
                    this.compact = true;
                    try { this.dispatch('cursor-changed', [this.acceptSnapshot(message.params[0])]); }
                    catch (error) {
                        if (error.code === 'WIRE_BASELINE') this.rememberDelta(message.params[0]);
                        this.recoverSnapshot();
                    }
                } else if (message.method !== 'cursor-changed' || !this.download) this.dispatch(message.method, message.params);
                continue;
            }
            const pending = this.pending.get(message.id);
            if (!pending) continue;
            const hasResult = Object.hasOwn(message, 'result'), hasError = Object.hasOwn(message, 'error');
            if (hasResult === hasError || (hasError && (!message.error || !Number.isInteger(message.error.code) || typeof message.error.message !== 'string'))) continue;
            this.pending.delete(message.id);
            clearTimeout(pending.timer);
            if (hasError) pending.reject(Object.assign(new Error(message.error.message), { code: message.error.code }));
            else pending.resolve(message.result);
        }
    }

    disconnect(error) {
        const socket = this.socket;
        this.compact = false;
        this.uploadCursor = this.download = null;
        this.waitingDeltas = [];
        this.waitingBytes = 0;
        this.requiredRevision = null;
        this.socket = null;
        clearTimeout(this.connectTimer);
        this.rejectOpen?.(error);
        this.opening = this.resolveOpen = this.rejectOpen = null;
        for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(error); }
        this.pending.clear();
        if (socket) {
            socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
            socket.close();
        }
        if (!this.closed) {
            this.recovering = true;
            try { this.onDisconnect?.(); }
            catch (error) { console.error('RPC disconnect handler failed:', error); }
            if (!this.retryTimer) {
                this.retryTimer = setTimeout(() => { this.retryTimer = null; this.connect().catch(() => {}); }, this.retryDelay);
                this.retryDelay = Math.min(this.retryDelay * 2, 5000);
            }
        }
    }

    close() {
        this.closed = true;
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
        this.disconnect(new Error('RPC transport closed'));
        this.handlers.clear();
    }
}

function validateCursorState(state) {
    if (!state || !Number.isInteger(state.tick) || state.tick < 1 || state.tick > 30 || !Array.isArray(state.cursors) || state.cursors.some((client) =>
        !client || typeof client.name !== "string" || !client.name || [...client.name].length > 24 || !Number.isInteger(client.hue) || client.hue < 0 || client.hue >= 360 || !validCursor(client.cursor))) throw new Error("Invalid cursor response");
    const selections = state.selections || [];
    if (!Array.isArray(selections) || selections.some((client) => !client || typeof client.name !== "string" || !client.name || [...client.name].length > 24 ||
        !Number.isInteger(client.hue) || client.hue < 0 || client.hue >= 360 || !validSelection(client.selection))) throw new Error("Invalid selection response");
    const editing = state.editing || [];
    if (!Array.isArray(editing) || editing.some((client) => !client || typeof client.name !== "string" || !client.name || [...client.name].length > 24 ||
        !Number.isInteger(client.hue) || client.hue < 0 || client.hue >= 360 || !validEditing(client.editing))) throw new Error("Invalid editing response");
    return {selections, editing};
}
