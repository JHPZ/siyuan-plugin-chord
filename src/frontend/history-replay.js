// Check a compound transaction on detached block trees before permitting either direction.
class HistoryReplay {
    constructor(history, p) { this.history = history; this.p = p; }

    reject(reason, action) {
        throw Object.assign(new Error('historyUnsupported'), { reason, action });
    }

    compile(forward, backward) {
        const operations = [...forward, ...backward], touched = new Set(), parents = new Map();
        const rootID = this.p.block.rootID;
        for (const op of operations) {
            if (op?.action === 'setAttrs') this.reject('historyUnsupportedAttributes');
            if (!['update', 'insert', 'delete', 'move'].includes(op?.action)) this.reject('historyUnsupportedAction', op?.action);
            if (!EDIT_BLOCK_ID.test(op.id || '') || op.id === rootID ||
                [op.parentID, op.previousID, op.nextID].some(id => id && !EDIT_BLOCK_ID.test(id))) this.reject('historyUnsupportedData');
            touched.add(op.id);
        }
        const source = this.p.wysiwyg.element;
        if (!source?.cloneNode) this.reject('historyUnsupportedLoaded');
        if (source.innerHTML.length > 10000000) this.reject('historyUnsupportedSize');
        const after = source.cloneNode(true);
        const find = (tree, id) => id === rootID ? tree : tree.querySelector(`[data-node-id="${id}"]`);
        const blocks = node => [...(node.hasAttribute?.('data-node-id') ? [node] : []), ...node.querySelectorAll('[data-node-id]')];
        const location = (tree, node) => {
            const parent = node.parentElement.closest('[data-node-id]');
            let previous = node.previousElementSibling;
            while (previous && !previous.hasAttribute('data-node-id')) previous = previous.previousElementSibling;
            return { parent: parent?.getAttribute('data-node-id') || rootID, previous: previous?.getAttribute('data-node-id') || '' };
        };
        const remember = (tree, node) => {
            for (const block of blocks(node)) {
                const id = block.getAttribute('data-node-id');
                if (!EDIT_BLOCK_ID.test(id || '')) this.reject('historyUnsupportedData');
                if (block.matches('[data-type="NodeAttributeView"], [data-type="NodeBlockQueryEmbed"]')) this.reject('historyUnsupportedExternal');
                touched.add(id);
                if (tree.contains(block)) parents.set(id, location(tree, block).parent);
            }
            if (touched.size > 200) this.reject('historyUnsupportedSize');
        };
        for (const op of operations) {
            const node = find(after, op.id);
            if (node) remember(after, node);
        }
        const apply = (tree, ops) => {
            for (const op of ops) {
                let node = find(tree, op.id);
                if (node) remember(tree, node);
                if (op.action === 'delete') { node?.remove(); continue; }
                if (op.action === 'insert' || op.action === 'update') {
                    if (typeof op.data !== 'string') this.reject('historyUnsupportedData');
                    const template = document.createElement('template'); template.innerHTML = op.data;
                    const replacement = template.content.firstElementChild;
                    if (template.content.children.length !== 1 || replacement.getAttribute('data-node-id') !== op.id) this.reject('historyUnsupportedData');
                    remember(tree, replacement);
                    if (op.action === 'update') {
                        if (!node) this.reject('historyUnsupportedLoaded');
                        node.replaceWith(replacement); node = replacement;
                    } else {
                        if (node) this.reject('historyUnsupportedRoundTrip');
                        node = replacement;
                    }
                    for (const block of blocks(node)) {
                        const same = [...tree.querySelectorAll(`[data-node-id="${block.getAttribute('data-node-id')}"]`)];
                        if (same.some(other => other !== block)) this.reject('historyUnsupportedRoundTrip');
                    }
                    if (op.action === 'update') continue;
                }
                if (!node) this.reject('historyUnsupportedLoaded');
                if (op.action === 'move' && (node.matches('[data-type="NodeHeading"][fold="1"]') || op.context?.removeFold === 'true')) {
                    this.reject('historyUnsupportedFoldMove');
                }
                const anchor = find(tree, op.nextID || op.previousID || op.parentID);
                if (!anchor) this.reject('historyUnsupportedLoaded');
                if (node === anchor || node.contains(anchor)) this.reject('historyUnsupportedRoundTrip');
                const oldParent = node.parentElement;
                if (op.nextID) anchor.before(node);
                else if (op.previousID) anchor.after(node);
                else {
                    if (anchor !== tree && !anchor.matches('[data-type="NodeBlockquote"], [data-type="NodeSuperBlock"], [data-type="NodeList"], [data-type="NodeListItem"]')) this.reject('historyUnsupportedData');
                    const first = [...anchor.children].find(child => child.hasAttribute('data-node-id'));
                    anchor.insertBefore(node, first || anchor.querySelector(':scope > .protyle-attr'));
                }
                if (op.action === 'move' && oldParent?.matches('[data-type="NodeList"]') &&
                    ![...oldParent.children].some(child => child.hasAttribute('data-node-id'))) oldParent.remove();
                remember(tree, node);
            }
        };
        const before = after.cloneNode(true);
        apply(before, backward);
        const replayed = before.cloneNode(true);
        apply(replayed, forward);
        const snapshot = tree => {
            const expected = new Map(), locations = new Map();
            for (const id of touched) {
                if (tree.querySelectorAll(`[data-node-id="${id}"]`).length > 1) this.reject('historyUnsupportedRoundTrip');
                const node = find(tree, id);
                expected.set(id, node ? this.history.canonical(this.p, node.outerHTML) : null);
                if (node) locations.set(id, location(tree, node));
            }
            return { expected, locations };
        };
        const initial = snapshot(after), restored = snapshot(before), repeated = snapshot(replayed);
        for (const id of touched) {
            if (initial.expected.get(id) !== repeated.expected.get(id) ||
                JSON.stringify(initial.locations.get(id)) !== JSON.stringify(repeated.locations.get(id))) this.reject('historyUnsupportedRoundTrip');
        }
        for (const [id, loc] of [...restored.locations, ...initial.locations]) parents.set(id, loc.parent);
        return { before: restored, after: initial, parents };
    }
}
