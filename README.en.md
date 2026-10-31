<p align="center"><img src="icon.png" width="80" height="80" alt="Chord icon"></p>

# Chord · 和弦

**Write together. Leave room for one another.**

[中文](README.md) · [User guide · 中文](docs/guide.md) · [Development · 中文](docs/development.md) · [Changelog](CHANGELOG.md)

When several people open the same note, a few small questions tend to follow: Where are you reading? Who is editing this paragraph?

I'd like the note to answer those questions quietly.

Chord is a collaboration plugin for SiYuan. It shows who is reading a document, gives remote pointers and text selections their own colors, and reserves a block while someone is editing it. You can read, select and copy first. Double-click when you are ready to write.

![An illustration of Chord's participants, pointers and edit state. This is a concept illustration, not a SiYuan screenshot.](preview.png)

## A little awareness, in the right place

The document tree shows its current readers. Each new window receives a four-letter name; you can change it from the Chord menu. Colors stay with the current session.

Remote pointers and selections follow content anchors, adapting to local line wrapping and scrolling. Chord does not scroll your page to follow someone else.

## Room to write

Single-click and select to read or copy without requesting an edit lock. Double-click a text block to request one from the kernel. A halo and a name show who is editing. Other participants can still read and copy the block. Separate blocks can be edited by different participants.

Press `Esc` or click another block to leave editing. Pending input is saved before Chord actively releases the lease.

## Undo your own step

`Ctrl+Z` undoes your edits in the current window and document. `Ctrl+Y` or `Ctrl+Shift+Z` redoes them. Continuous typing is grouped, and undo also works while browsing.

Before replaying an edit, Chord checks the current content and acquires the required block leases. If another operation changed that content, it stops with an explanation and keeps your record. It does not overwrite the later edit or fall back to SiYuan's shared undo.

## Get started

**0.7.0 is being prepared for release.** The compatibility baseline is **SiYuan 3.8.9**. A marketplace listing has not been announced.

Every participating window must connect to **the same SiYuan kernel** and run the same Chord version. Desktop clients, detached desktop windows and desktop browsers are supported. Mobile frontends and published pages are outside this release's scope.

1. Place the plugin under `<workspace>/data/plugins/siyuan-plugin-chord/`. `plugin.json` and `kernel.js` must be directly inside that directory. Extract the contents of a release's `package.zip` there.
2. Enable Chord in SiYuan's plugin management. Each window must load the new version; after updating, disable and enable the plugin or reopen the frontend.
3. Open the Chord menu from the smile icon in the top bar, change your name, and open a document with another participant.
4. Double-click a block to edit. Press `Esc` to leave.

Pointer and selection updates default to at most **10 per second**. Cursor settings accept 1–30 ticks per second. This setting is shared by all clients connected to that kernel and persists across restarts.

When moving from the earlier `siyuan-plugin-starter` prototype, finish editing and confirm the document is saved before disabling it. **Do not enable the prototype and Chord together.** They have distinct plugin identities. Names, window state, sync settings and personal history are not migrated automatically. See the [migration steps · 中文](docs/guide.md).

## What to expect

Chord shares collaboration state through SiYuan's kernel RPC. SiYuan remains responsible for saving and synchronizing document content. Chord does not run a separate document service or merge simultaneous edits to the same block.

- **Locks are a cooperation rule for participating frontends.** Disabled plugins, direct API/MCP writes and some native commands can bypass them. Kernel-managed leases are not kernel-enforced write authorization.
- **Presence counts window sessions, not authenticated people.** Refreshing attempts to reuse identity. Two windows belonging to one person still count separately. Display names do not establish identity.
- **Personal history lives in window memory.** Reloading, closing or disabling clears it. Ordinary text, formatting and insert/delete/split transactions are supported. Complex operations such as block moves and database edits stop with an explanation; they are not skipped.
- **Selection sharing displays text ranges.** It does not perform another client's clicks, copying or dragging. Block, image and database-cell selections are not included. CSS Custom Highlight support is required.
- **Anchors have limits.** Unloaded, folded, off-screen or occluded targets are hidden. Images and complex tables use relative block coordinates and cannot promise character-level accuracy.

Try Chord in a test document before using it for important notes, and keep your usual backups. The [user guide · 中文](docs/guide.md) describes disconnections and recovery in detail.

## Working on Chord

Chord uses native JavaScript, with no third-party runtime dependencies or frontend compilation. `kernel.js` owns shared state; `index.js` owns frontend interaction and rendering. Personal history stays in each window.

```sh
npm test
npm run check
```

On Windows, `npm run build` creates `dist/package.zip`. See [development · 中文](docs/development.md), [release preparation · 中文](docs/releasing.md), and [contributing](CONTRIBUTING.md) for the working conventions.

## License and origins

Chord is available under the [MIT License](LICENSE). It began with the official SiYuan plugin sample and retains its copyright notice. [NOTICE](NOTICE.md) records that origin and the assets authored for Chord.
