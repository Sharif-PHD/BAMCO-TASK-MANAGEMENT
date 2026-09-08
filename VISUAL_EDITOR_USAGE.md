# BAMCO In-App Visual Editor

Open the deployed app with `?design=1` appended to the URL to reveal the visual editor button. Example: `https://nazanin-ghaemizadeh.github.io/BAMCO-TASK-MANAGEMENT/?design=1`.

The editor changes only visual layout/styles in the current browser. It does not modify tasks, authentication, Supabase data, or business logic.

Capabilities:
- Drag visual blocks with the mouse.
- Resize from corner handles.
- Change width, height, padding, margin, gap, border radius, font size, background color, text color, border color, and text alignment.
- Reset one block, the current view, or all local layout changes.
- Export/import `bamco-layout.json`.
- Keyboard shortcut: Ctrl + Shift + E.

To publish a chosen layout globally, export `bamco-layout.json` and apply those values to the production stylesheet in a normal code change.