# CozyBoard ✨ — Cute, Animated, Offline-First Personal Productivity Board

A playful, cozy infinite canvas workspace and personal task manager built with **React 18**, **TypeScript**, **Dexie (IndexedDB)**, and **Service Worker PWA** offline caching.

## Quick Start

```bash
npm install
npm run dev
```

To build for production or run the automated test suite:

```bash
npm run build
npm test
```

## Key Features
- **Infinite Interactive Canvas**: Pan, zoom (`25%`–`250%`), marquee multi-select, group/ungroup, duplicate, copy/paste, undo/redo, minimap, and 4 customizable background styles (Pastel Dots, Cozy Grid, Notebook Paper, Plain Warm Cream).
- **Rich Cozy Objects**:
  - **Task Cards** with completion checkbox + sparkle/confetti celebration burst, status (`To Do`, `In Progress`, `Waiting`, `Done`), priority (`Low`, `Medium`, `High`), due dates, automatic **Overdue** and **Today** badges, and tags.
  - **Idea Sticky Notes** in 7 pastel colors with 1-click **To Task** conversion.
  - **Checklists** with live progress bars, **Daily Notes & Reminders**, **Goal/Project Sections**, **Headings/Text**, **Shapes**, **Curved Arrow Connectors**, **Freehand Drawings + Eraser**, and **10 Cute Stickers**.
- **Synchronized Workspace Views**: Instant switching between **My Board**, **Pending Tasks**, **Today**, **Ideas**, **Completed**, and **Search** with status, priority, due date, and tag filtering.
- **True Offline-First & Data Safety**:
  - Automatic persistence in **IndexedDB** (`CozyBoardDB` v2 with safe schema migration from v1).
  - Offline app shell caching via **Service Worker** (`/sw.js`).
  - Full `.json` **Backup Export & Restore Import** and transparent storage safety notices.
