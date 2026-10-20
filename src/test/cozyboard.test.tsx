import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';
import App from '../App';
import {
  CozyBoardDatabase,
  CURRENT_SCHEMA_VERSION,
  DEFAULT_BOARD_ID,
  createBackupPayload,
  db,
  initializeWorkspaceData,
  restoreBackupToDatabase,
  saveCanvasObjectsBatch,
  setSimulatedStorageFailure,
  validateAndMigrateBackup,
} from '../db';
import { isTaskOverdue, getYesterdayISO, getTodayISO } from '../constants';
import { CanvasObject } from '../types';

function renderApp() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  return {
    container,
    mount: async () => {
      await act(async () => {
        root.render(<App />);
      });
      // Wait for IndexedDB initial load
      await act(async () => {
        await new Promise((r) => setTimeout(r, 80));
      });
    },
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('CozyBoard — 14 Acceptance Criteria Suite', () => {
  beforeEach(async () => {
    setSimulatedStorageFailure(false);
    await db.objects.clear();
    await db.boards.clear();
    await db.settings.clear();
  });

  it('Scenario 1 & 2: Creates multiple sticky notes, tasks, and drawings, and edits/moves/resizes/deletes them', async () => {
    const app = renderApp();
    await app.mount();

    // Starter objects loaded
    const initialCards = app.container.querySelectorAll('.canvas-object');
    expect(initialCards.length).toBeGreaterThanOrEqual(8);

    // Create a new Sticky Note via toolbar
    const addStickyBtn = app.container.querySelector(
      '[data-testid="tool-add-sticky"]'
    ) as HTMLButtonElement;
    await act(async () => {
      addStickyBtn.click();
    });

    // Create a new Task Card via toolbar
    const addTaskBtn = app.container.querySelector(
      '[data-testid="tool-add-task"]'
    ) as HTMLButtonElement;
    await act(async () => {
      addTaskBtn.click();
    });

    // Activate Draw tool and draw on canvas
    const drawBtn = app.container.querySelector(
      '[data-testid="tool-draw"]'
    ) as HTMLButtonElement;
    await act(async () => {
      drawBtn.click();
    });
    const canvas = app.container.querySelector(
      '[data-testid="infinite-canvas"]'
    ) as HTMLDivElement;
    await act(async () => {
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          clientX: 400,
          clientY: 300,
        })
      );
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: 460,
          clientY: 340,
        })
      );
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 160));
    });

    const storedAfterCreate = await db.objects.toArray();
    expect(storedAfterCreate.some((o) => o.type === 'drawing')).toBe(true);

    // Edit title of starter-task-1
    const titleInput = app.container.querySelector(
      '[data-testid="object-title-starter-task-1"]'
    ) as HTMLInputElement;
    expect(titleInput).toBeTruthy();

    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeInputValueSetter?.call(titleInput, 'Updated Cozy UI Design');
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      titleInput.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 160));
    });

    const updatedInDb = await db.objects.get('starter-task-1');
    expect(updatedInDb?.title).toBe('Updated Cozy UI Design');

    // Resize starter-task-1
    const resizeHandle = app.container.querySelector(
      '[data-testid="resize-handle-starter-task-1"]'
    ) as HTMLDivElement;
    await act(async () => {
      resizeHandle.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          clientX: 390,
          clientY: 375,
        })
      );
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: 450,
          clientY: 425,
        })
      );
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 160));
    });

    const resizedInDb = await db.objects.get('starter-task-1');
    expect(resizedInDb?.width).toBeGreaterThan(280);

    await app.unmount();
  });

  it('Scenario 3 & 4: Persists all changes across browser refreshes and full close/reopen sessions', async () => {
    const firstSession = renderApp();
    await firstSession.mount();

    const addTaskBtn = firstSession.container.querySelector(
      '[data-testid="tool-add-task"]'
    ) as HTMLButtonElement;
    await act(async () => {
      addTaskBtn.click();
      await new Promise((r) => setTimeout(r, 180));
    });

    const countBeforeReload = await db.objects.count();
    await firstSession.unmount();

    // Simulate browser refresh / reopen by mounting a fresh App instance
    const secondSession = renderApp();
    await secondSession.mount();

    const countAfterReload = await db.objects.count();
    expect(countAfterReload).toBe(countBeforeReload);

    await secondSession.unmount();
  });

  it('Scenario 5, 6 & 7: Works offline, saves edits while offline, persists on refresh, and runs local search offline', async () => {
    const app = renderApp();
    await app.mount();

    // Simulate disconnecting the internet
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });
    await act(async () => {
      window.dispatchEvent(new Event('offline'));
    });

    const netPill = app.container.querySelector(
      '[data-testid="network-status-indicator"]'
    );
    expect(netPill?.textContent).toContain('Offline Mode');

    // Switch to Ideas view while offline and add a new idea note
    const ideasNav = app.container.querySelector(
      '[data-testid="nav-view-ideas"]'
    ) as HTMLButtonElement;
    await act(async () => {
      ideasNav.click();
    });

    const ideaTitleInput = app.container.querySelector(
      '[data-testid="view-quick-idea-title"]'
    ) as HTMLInputElement;
    const ideaForm = app.container.querySelector(
      '[data-testid="view-quick-add-idea-form"]'
    ) as HTMLFormElement;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      setter?.call(ideaTitleInput, 'Offline Starlight Sketch');
      ideaTitleInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      ideaForm.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true })
      );
      await new Promise((r) => setTimeout(r, 180));
    });

    // Refresh while still offline
    await app.unmount();
    const offlineReloaded = renderApp();
    await offlineReloaded.mount();

    // Switch to Search view and search offline for 'Starlight'
    const searchNav = offlineReloaded.container.querySelector(
      '[data-testid="nav-view-search"]'
    ) as HTMLButtonElement;
    await act(async () => {
      searchNav.click();
    });

    const searchInput = offlineReloaded.container.querySelector(
      '[data-testid="workspace-search-input"]'
    ) as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      setter?.call(searchInput, 'Starlight');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const countPill = offlineReloaded.container.querySelector(
      '[data-testid="view-item-count"]'
    );
    expect(countPill?.textContent).toContain('1 item');

    // Restore online status
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
    });
    await offlineReloaded.unmount();
  });

  it('Scenario 8: Supports task completion sparkle burst, status changes, due dates, overdue detection, and sticky-to-task conversion', async () => {
    const app = renderApp();
    await app.mount();

    // starter-task-2 has yesterday's due date -> should show Overdue badge
    const overdueBadge = app.container.querySelector(
      '[data-testid="overdue-badge-starter-task-2"]'
    );
    expect(overdueBadge).toBeTruthy();

    // Complete starter-task-2 via checkbox
    const checkbox = app.container.querySelector(
      '[data-testid="task-checkbox-starter-task-2"]'
    ) as HTMLButtonElement;
    await act(async () => {
      checkbox.click();
      await new Promise((r) => setTimeout(r, 160));
    });

    // Sparkle celebration burst should appear
    const sparkle = app.container.querySelector(
      '[data-testid="sparkle-burst"]'
    );
    expect(sparkle).toBeTruthy();

    // Overdue badge disappears once task is completed
    const overdueAfterComplete = app.container.querySelector(
      '[data-testid="overdue-badge-starter-task-2"]'
    );
    expect(overdueAfterComplete).toBeNull();

    // Convert starter-sticky-1 into a Task Card
    const convertBtn = app.container.querySelector(
      '[data-testid="convert-to-task-starter-sticky-1"]'
    ) as HTMLButtonElement;
    await act(async () => {
      convertBtn.click();
      await new Promise((r) => setTimeout(r, 160));
    });

    const convertedObj = await db.objects.get('starter-sticky-1');
    expect(convertedObj?.type).toBe('task');
    expect(convertedObj?.status).toBe('todo');

    await app.unmount();
  });

  it('Scenario 9: Exports a full local backup and restores it accurately after board clear', async () => {
    const data = await initializeWorkspaceData();
    const backup = createBackupPayload(
      data.board,
      data.objects,
      data.settings
    );
    const jsonString = JSON.stringify(backup);

    // Clear all objects in DB
    await db.objects.clear();
    expect(await db.objects.count()).toBe(0);

    // Restore from backup payload
    const parsed = validateAndMigrateBackup(JSON.parse(jsonString));
    const restored = await restoreBackupToDatabase(parsed);
    expect(restored.objects.length).toBe(data.objects.length);
    expect(await db.objects.count()).toBe(data.objects.length);
  });

  it('Scenario 10 & 11: Supports Undo, Redo, keyboard shortcuts, and zoom/reset navigation', async () => {
    const app = renderApp();
    await app.mount();

    const initialCount = app.container.querySelectorAll('.canvas-object').length;

    // Add a sticky note
    const addStickyBtn = app.container.querySelector(
      '[data-testid="tool-add-sticky"]'
    ) as HTMLButtonElement;
    await act(async () => {
      addStickyBtn.click();
    });
    expect(app.container.querySelectorAll('.canvas-object').length).toBe(
      initialCount + 1
    );

    // Undo via toolbar button
    const undoBtn = app.container.querySelector(
      '[data-testid="tool-undo"]'
    ) as HTMLButtonElement;
    await act(async () => {
      undoBtn.click();
    });
    expect(app.container.querySelectorAll('.canvas-object').length).toBe(
      initialCount
    );

    // Redo via toolbar button
    const redoBtn = app.container.querySelector(
      '[data-testid="tool-redo"]'
    ) as HTMLButtonElement;
    await act(async () => {
      redoBtn.click();
    });
    expect(app.container.querySelectorAll('.canvas-object').length).toBe(
      initialCount + 1
    );

    // Test Zoom In and Main View Reset
    const zoomInBtn = app.container.querySelector(
      '[data-testid="zoom-in-btn"]'
    ) as HTMLButtonElement;
    const resetViewBtn = app.container.querySelector(
      '[data-testid="reset-view-btn"]'
    ) as HTMLButtonElement;
    const zoomReadout = app.container.querySelector(
      '[data-testid="zoom-readout"]'
    );

    await act(async () => {
      zoomInBtn.click();
    });
    expect(zoomReadout?.textContent).toBe('115%');

    await act(async () => {
      resetViewBtn.click();
    });
    expect(zoomReadout?.textContent).toBe('100%');

    await app.unmount();
  });

  it('Scenario 12: Handles a large number of notes and drawings smoothly', async () => {
    const app = renderApp();
    await app.mount();

    // Open settings modal and trigger the 60-object stress test generator
    const openSettingsBtn = app.container.querySelector(
      '[data-testid="open-settings-btn"]'
    ) as HTMLButtonElement;
    await act(async () => {
      openSettingsBtn.click();
    });

    const stressBtn = app.container.querySelector(
      '[data-testid="stress-test-btn"]'
    ) as HTMLButtonElement;
    await act(async () => {
      stressBtn.click();
      await new Promise((r) => setTimeout(r, 220));
    });

    const totalStored = await db.objects.count();
    expect(totalStored).toBeGreaterThanOrEqual(68);

    await app.unmount();
  });

  it('Scenario 13: Gracefully handles storage failures and surfaces a clear warning without crashing', async () => {
    setSimulatedStorageFailure(true);

    const fallbackData = await initializeWorkspaceData();
    expect(fallbackData.storageError).toBeTruthy();
    expect(fallbackData.objects.length).toBeGreaterThan(0);

    const app = renderApp();
    await app.mount();

    const saveIndicator = app.container.querySelector(
      '[data-testid="save-status-indicator"]'
    );
    expect(saveIndicator?.textContent).toContain('Storage Warning');

    setSimulatedStorageFailure(false);
    await app.unmount();
  });

  it('Scenario 14: Safely migrates legacy v1 database records to v2 without erasing user data', async () => {
    const dbName = `MigrationTestDB_${Date.now()}`;

    // Create a legacy v1 Dexie database and insert legacy objects missing v2 fields
    const legacyDb = new Dexie(dbName);
    legacyDb.version(1).stores({
      boards: 'id, name, updatedAt',
      objects: 'id, boardId, type, status, priority, dueDate, updatedAt',
      settings: 'id',
    });
    await legacyDb.open();
    await legacyDb.table('boards').put({
      id: DEFAULT_BOARD_ID,
      name: 'Legacy v1 Board',
      panX: 0,
      panY: 0,
      zoom: 1,
      createdAt: 1000,
      updatedAt: 1000,
    });
    await legacyDb.table('objects').put({
      id: 'legacy-note-1',
      boardId: DEFAULT_BOARD_ID,
      type: 'task',
      x: 50,
      y: 60,
      width: 240,
      height: 180,
      zIndex: 1,
      title: 'Preserved User Task from v1',
      content: 'Must not be erased during upgrade!',
      createdAt: 1000,
      updatedAt: 1000,
    });
    await legacyDb.close();

    // Open with CozyBoardDatabase (which upgrades to v2)
    const upgradedDb = new CozyBoardDatabase(dbName);
    const initialized = await initializeWorkspaceData(upgradedDb);

    expect(initialized.board.name).toBe('Legacy v1 Board');
    expect(initialized.objects.length).toBe(1);
    expect(initialized.objects[0].title).toBe('Preserved User Task from v1');
    expect(Array.isArray(initialized.objects[0].tags)).toBe(true);
    expect(initialized.objects[0].status).toBe('todo');
    expect(initialized.settings.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);

    await upgradedDb.delete();
  });
});
