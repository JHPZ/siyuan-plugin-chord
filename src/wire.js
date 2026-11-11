// Version 1 field indices are append-only; reordering requires a new wire version.
const CHORD_WIRE_KEYS = 'x y kind id documentId blockId surface region page title state dragging screen space offset gap side ratio text ui version scope key route count index nameKey frame frames target edges step textHash imagePoint pdf file part mark graph node layout row column group pane tick cursors selections editing name hue cursor selection anchor focus blockIds wire'.split(' ');
const CHORD_WIRE_INDEX = new Map(CHORD_WIRE_KEYS.map((key, index) => [key, index]));

function wireKey(key) { return CHORD_WIRE_INDEX.has(key) ? CHORD_WIRE_INDEX.get(key) : key; }
function wireReadKey(key) {
    if (Number.isInteger(key) && key >= 0 && key < CHORD_WIRE_KEYS.length) return CHORD_WIRE_KEYS[key];
    if (typeof key === 'string' && key.length <= 160 && !['__proto__', 'constructor', 'prototype'].includes(key)) return key;
    throw Error('Invalid compact field');
}

function wirePack(value) {
    if (Array.isArray(value)) return [4, ...value.map(item => wirePack(item ?? null))];
    if (value && typeof value === 'object') return [3, ...Object.entries(value).filter(([, value]) => value !== undefined).flatMap(([key, value]) => [wireKey(key), wirePack(value)])];
    if (value === null || ['string', 'boolean'].includes(typeof value) || typeof value === 'number' && Number.isFinite(value)) return value;
    throw Error('Invalid compact value');
}

function wireBudget() { return { nodes: 0 }; }
function wireCheck(budget, depth) {
    if (++budget.nodes > 4194304 || depth > 64) throw Error('Compact message too complex');
}

function wireUnpack(value, budget = wireBudget(), depth = 0) {
    wireCheck(budget, depth);
    if (!Array.isArray(value)) {
        if (value === null || typeof value === 'boolean' || typeof value === 'string' && value.length <= 2097152 || typeof value === 'number' && Number.isFinite(value)) return value;
        throw Error('Invalid compact value');
    }
    if (value[0] === 4) return value.slice(1).map(item => wireUnpack(item, budget, depth + 1));
    if (value[0] !== 3 || value.length % 2 !== 1) throw Error('Invalid compact object');
    const result = {};
    for (let index = 1; index < value.length; index += 2) {
        const key = wireReadKey(value[index]);
        if (Object.hasOwn(result, key)) throw Error('Duplicate compact field');
        result[key] = wireUnpack(value[index + 1], budget, depth + 1);
    }
    return result;
}

// Patches replace exact values; coordinates are never rounded or arithmetically accumulated.
function wireDiff(before, after) {
    if (before === after) return null;
    if (!before || !after || typeof before !== 'object' || typeof after !== 'object' || Array.isArray(before) !== Array.isArray(after) || Array.isArray(after) && before.length !== after.length) return [0, wirePack(after)];
    const patch = [1];
    for (const key of Object.keys(before)) if (!Object.hasOwn(after, key)) patch.push(wireKey(key), [2]);
    for (const [key, value] of Object.entries(after)) {
        const child = Object.hasOwn(before, key) ? wireDiff(before[key], value) : [0, wirePack(value)];
        if (child) patch.push(Array.isArray(after) ? Number(key) : wireKey(key), child);
    }
    return patch.length === 1 ? null : patch;
}

function wireApply(before, patch, budget = wireBudget(), depth = 0) {
    wireCheck(budget, depth);
    if (!Array.isArray(patch)) throw Error('Invalid compact patch');
    if (patch.length === 2 && patch[0] === 0) return wireUnpack(patch[1], budget, depth + 1);
    if (patch[0] !== 1 || patch.length % 2 !== 1 || !before || typeof before !== 'object') throw Error('Missing compact baseline');
    const array = Array.isArray(before), result = array ? before.slice() : { ...before }, seen = new Set();
    for (let index = 1; index < patch.length; index += 2) {
        const token = patch[index], child = patch[index + 1];
        const key = array ? token : wireReadKey(token);
        if (array && (!Number.isInteger(key) || key < 0 || key >= before.length) || seen.has(key)) throw Error('Invalid compact index');
        seen.add(key);
        if (Array.isArray(child) && child.length === 1 && child[0] === 2) {
            if (array || !Object.hasOwn(before, key)) throw Error('Invalid compact deletion');
            delete result[key];
        } else result[key] = wireApply(before[key], child, budget, depth + 1);
    }
    return result;
}

function wirePacket(epoch, revision, baseRevision, before, after) {
    return [1, epoch, revision, baseRevision, before === null ? [0, wirePack(after)] : wireDiff(before, after) || [1]];
}

function wireReceive(baseline, packet) {
    if (!Array.isArray(packet) || packet.length !== 5 || packet[0] !== 1 || typeof packet[1] !== 'string' || !/^[a-z0-9-]{1,64}$/.test(packet[1]) || !Number.isSafeInteger(packet[2]) || packet[2] < 1 ||
        packet[3] !== null && (!Number.isSafeInteger(packet[3]) || packet[3] < 1 || packet[3] >= packet[2])) throw Error('Invalid compact revision');
    const [, epoch, revision, baseRevision, patch] = packet;
    if (baseline?.epoch === epoch && revision <= baseline.revision) return baseline;
    if (baseRevision === null) {
        if (!Array.isArray(patch) || patch[0] !== 0) throw Error('Invalid compact snapshot');
    } else if (!baseline || baseline.epoch !== epoch || baseline.revision !== baseRevision) throw Object.assign(Error('Missing compact revision'), {code:'WIRE_BASELINE'});
    return { epoch, revision, value: wireApply(baseRevision === null ? null : baseline.value, patch) };
}
