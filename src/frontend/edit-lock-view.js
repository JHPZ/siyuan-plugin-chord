class EditLockView {
    constructor(plugin) { this.plugin = plugin; this.markers = new Map(); }
    schedule(locks) {
        this.locks = locks;
        if (this.stopped || this.frame || !this.plugin.cursorLayer) return;
        this.frame = requestAnimationFrame(() => { this.frame = 0; this.render(this.locks); });
    }

    render(locks) {
        const visible = new Set();
        if (!document.hidden) for (const lock of locks) {
            for (const block of document.querySelectorAll(`.protyle-wysiwyg [data-node-id="${lock.blockId}"]`)) {
                const editor = block.closest(".protyle");
                if (block.closest(".fn__none") || editor?.querySelector(".protyle-background[data-node-id]")?.getAttribute("data-node-id") !== lock.documentId) continue;
                const rect = block.getBoundingClientRect();
                const clip = (block.closest(".protyle-content") || editor).getBoundingClientRect();
                const left = Math.max(rect.left, clip.left, 0), top = Math.max(rect.top, clip.top, 0);
                const right = Math.min(rect.right, clip.right, window.innerWidth), bottom = Math.min(rect.bottom, clip.bottom, window.innerHeight);
                if (right <= left || bottom <= top) continue;
                visible.add(block);
                let marker = this.markers.get(block);
                if (!marker) {
                    marker = document.createElement("div");
                    marker.className = "collab-edit-lock";
                    const label = document.createElement("span");
                    marker.append(label);
                    this.plugin.cursorLayer.append(marker);
                    this.markers.set(block, marker);
                }
                marker.firstElementChild.textContent = this.plugin.i18n.editOwner.replace("${name}", lock.name);
                marker.classList.toggle("collab-edit-lock--inset", top - 22 < Math.max(clip.top, 0));
                marker.style.setProperty("--collab-lock-hue", String(lock.hue));
                marker.style.transform = `translate3d(${left}px, ${top}px, 0)`;
                marker.style.width = `${right - left}px`;
                marker.style.height = `${bottom - top}px`;
            }
        }
        for (const [block, marker] of this.markers) if (!visible.has(block)) { marker.remove(); this.markers.delete(block); }
    }


    stop() {
        this.stopped = true;
        cancelAnimationFrame(this.frame);
        for (const marker of this.markers.values()) marker.remove();
        this.markers.clear();
    }
}
