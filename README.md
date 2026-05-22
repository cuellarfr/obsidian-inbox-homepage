# Inbox Homepage

A custom Obsidian plugin that renders a dashboard-style homepage with a notes wall, recent clippings, and task views.

## Sections

| Section | Source | Notes |
|---|---|---|
| Notes wall | `_notes/` | Social-feed style. 10 most recent notes, 500-char preview. Compose form creates `Note - {timestamp}.md`. |
| Recent Clippings | `Clippings/` | Task-list style, 8 most recent. Checking marks `read: "true"` in frontmatter. |
| Personal — Focus | `Personal/Personal Tasks.md` | Pulls the 🎯 Focus column from a Kanban board. |
| Work — Focus & Review | `Trimble/Work Tasks.md` | Pulls 🎯 Focus + 🔍 In Review columns. |

Source paths are currently hard-coded for the author's vault structure. To use in your own vault, edit the section files in `src/sections/`.

## Quick Note format

Notes created from the compose form are saved to `_notes/Note - YYYY-MM-DD HH-mm-ss.md` with:

```yaml
---
tags: ["tag1", "tag2"]
created: 2026-05-22T14:30:00.000Z
---
```

## Install

1. Clone into your vault's plugin folder:
   ```bash
   cd <vault>/.obsidian/plugins
   git clone https://github.com/<you>/obsidian-inbox-homepage.git
   cd obsidian-inbox-homepage
   npm install
   npm run build
   ```
2. Enable **Inbox Homepage** under **Settings → Community Plugins**.

## Develop

```bash
npm install
npm run dev    # watch mode
npm run build  # production build
```

After building, reload the plugin in Obsidian: **Settings → Community Plugins → disable/enable Inbox Homepage**.

## License

MIT
