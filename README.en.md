<img src="icon.png" width="80" height="80" alt="Chord icon">

# Chord · 和弦

Chord displays live presence, pointers and text selections in SiYuan. SiYuan handles document synchronization, editing, dragging, undo and redo.

[中文](README.md)

![Chord · 和弦](docs/assets/chord-cover.webp)

## Features

- See the online count in the top bar, each participant's current page, and document viewer counts in the document tree. **Follow** opens a participant's current page once.
- See remote pointers in documents, settings, dialogs and sidebars. Each window resolves positions against its own visible content and layout.
- Share text selections and show a combined editing halo around locally visible selected blocks, including text selections across multiple blocks.
- Text areas use an I-beam; native SiYuan block dragging uses a hand. Click effects appear in other windows only.
- Customize your name and color with a live preview. Profile and synchronization frequency use separate compact dialogs.
- Choose 3, 10 or 30 position updates per second. Unchanged activity sends no position packets; online heartbeats continue while idle.
- See remote shortcut combinations briefly thrown from their owner's pointer. These notices do not execute commands.
- Edit directly in SiYuan without requesting block permissions.

## Install and use

Requires **SiYuan 3.8.9 or later**. Supports desktop, desktop tab windows and desktop browsers. All participating windows must connect to the same SiYuan kernel and enable the same Chord version. Separate kernels do not share presence.

For manual installation, extract the package into `<workspace>/data/plugins/siyuan-plugin-chord/`, with `plugin.json` directly inside that directory. Enable Chord in SiYuan's downloaded plugins. Click the top-bar count to view participants, change your name and color, or adjust the synchronization frequency.

See the [user guide (Chinese)](docs/guide.md) and [1.0.0 release notes](docs/release-notes-1.0.0.md).

## Scope and privacy

Online counts represent windows, and display names are not verified accounts. **Follow** opens a page once rather than continuously following later navigation. Pointers appear only when the receiving window can match a visible target. Cross-origin interiors, operating-system windows and unknown custom canvases are outside the supported surface. Not every native component, theme or database layout has been tested.

Chord uses SiYuan's kernel communication. It does not send passwords or clipboard contents, execute remote clicks or shortcuts, or provide editing permissions, personal undo guarantees or backups. Document synchronization conflicts, editing and undo remain SiYuan's responsibility.

More collaboration features may come later. Ideas are welcome.

Oh, and if Chord helps you, feel free to buy me a beer 🍻!

Licensed under [MIT](LICENSE).
