<img src="icon.png" width="80" height="80" alt="Chord icon">

# Chord · 和弦

Chord displays live presence, pointers and text selections in SiYuan. SiYuan handles document synchronization, editing, dragging, undo and redo.

[中文](README.md)

![Chord · 和弦](docs/assets/chord-cover.webp)

## Features

- See who's online and which document they're reading.
- See other people's pointers and selected text.
- See a border and names on focused editing blocks, including multiple people in the same block.
- Edit directly in SiYuan without requesting block permissions.

More collaboration features may come later. Ideas are welcome.

Oh, and if Chord helps you, feel free to buy me a beer 🍻!

Licensed under [MIT](LICENSE).

The top bar displays the online count; click it to open the native participant dialog and see current pages. **Follow** opens the selected page once. Pointers also appear in settings, dialogs and sidebars. Choose 3, 10 or 30 updates per second; unchanged activity sends no position packets, while a 20-second online heartbeat remains. Remote shortcut notices show combinations only and never execute them or share clipboard content.

Action-specific dialogs without a safe public opener fall back to their page. Same-origin embeds support up to eight nested documents, including independent scrolling, borders and positive axis-aligned scaling; each layer must remain visible and unobscured. Rotated, skewed and perspective-transformed frames are not supported. Cross-origin interiors stay hidden; operating-system windows are outside the plugin surface.
