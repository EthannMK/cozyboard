import Dexie, { Table } from 'dexie';
import {
  AppSettings,
  BackupPayload,
  BoardMetadata,
  CanvasObject,
} from './types';
import { createStarterObjects } from './constants';

export const CURRENT_SCHEMA_VERSION = 2;
export const DEFAULT_BOARD_ID = 'main-cozy-board';

export class CozyBoardDatabase extends Dexie {
  boards!: Table<BoardMetadata, string>;
  objects!: Table<CanvasObject, string>;
  settings!: Table<AppSettings, string>;

  constructor(dbName = 'CozyBoardDB') {
    super(dbName);

    // Version 1 initial schema
    this.version(1).stores({
      boards: 'id, name, updatedAt',
      objects: 'id, boardId, type, status, priority, dueDate, updatedAt',
      settings: 'id',
    });

    // Version 2 schema with multi-entry tags index & safe non-destructive migration
    this.version(2)
      .stores({
        boards: 'id, name, updatedAt',
        objects:
          'id, boardId, type, status, priority, dueDate, *tags, groupId, updatedAt',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        // Safely upgrade existing objects without losing any user data
        await tx
          .table('objects')
          .toCollection()
          .modify((obj: Partial<CanvasObject>) => {
            if (!Array.isArray(obj.tags)) {
              obj.tags = [];
            }
            if (obj.type === 'task') {
              if (!obj.status) {
                obj.status = obj.completed ? 'done' : 'todo';
              }
              if (typeof obj.completed !== 'boolean') {
                obj.completed = obj.status === 'done';
              }
              if (!obj.priority) {
                obj.priority = 'medium';
              }
            }
            if (!obj.color) {
              obj.color = 'cream';
            }
          });

        await tx
          .table('settings')
          .toCollection()
          .modify((s: Partial<AppSettings>) => {
            s.schemaVersion = CURRENT_SCHEMA_VERSION;
          });
      });
  }
}

export const db = new CozyBoardDatabase();

// Allow simulating storage failures in tests and diagnostics
let simulatedStorageFailure = false;

export function setSimulatedStorageFailure(fail: boolean): void {
  simulatedStorageFailure = fail;
}

export function isSimulatedStorageFailure(): boolean {
  return simulatedStorageFailure;
}

export function createDefaultSettings(): AppSettings {
  return {
    id: 'default',
    darkMode: false,
    reducedMotion: false,
    showDecorations: true,
    backgroundPattern: 'dots',
    activeBoardId: DEFAULT_BOARD_ID,
    quoteIndex: 0,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

export function createDefaultBoard(): BoardMetadata {
  const now = Date.now();
  return {
    id: DEFAULT_BOARD_ID,
    name: 'My Cozy Workspace ✨',
    panX: 40,
    panY: 20,
    zoom: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export async function requestPersistentStorage(): Promise<{
  persisted: boolean;
  usageBytes?: number;
  quotaBytes?: number;
}> {
  try {
    let persisted = false;
    if (
      typeof navigator !== 'undefined' &&
      navigator.storage &&
      typeof navigator.storage.persist === 'function'
    ) {
      persisted = await navigator.storage.persist();
    }
    if (
      typeof navigator !== 'undefined' &&
      navigator.storage &&
      typeof navigator.storage.estimate === 'function'
    ) {
      const estimate = await navigator.storage.estimate();
      return {
        persisted,
        usageBytes: estimate.usage,
        quotaBytes: estimate.quota,
      };
    }
    return { persisted };
  } catch {
    return { persisted: false };
  }
}

export async function initializeWorkspaceData(
  database: CozyBoardDatabase = db
): Promise<{
  board: BoardMetadata;
  objects: CanvasObject[];
  settings: AppSettings;
  storageError?: string;
}> {
  try {
    if (simulatedStorageFailure) {
      throw new Error('Simulated IndexedDB storage failure');
    }
    await database.open();

    let settings = await database.settings.get('default');
    if (!settings) {
      settings = createDefaultSettings();
      await database.settings.put(settings);
    } else if (settings.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      settings = { ...settings, schemaVersion: CURRENT_SCHEMA_VERSION };
      await database.settings.put(settings);
    }

    const activeBoardId = settings.activeBoardId || DEFAULT_BOARD_ID;
    let board = await database.boards.get(activeBoardId);

    if (!board) {
      board = createDefaultBoard();
      await database.boards.put(board);
      const existingObjects = await database.objects
        .where('boardId')
        .equals(board.id)
        .toArray();
      if (existingObjects.length === 0) {
        const starter = createStarterObjects(board.id);
        await database.objects.bulkPut(starter);
      }
    }

    const objects = await database.objects
      .where('boardId')
      .equals(board.id)
      .toArray();
    objects.sort((a, b) => a.zIndex - b.zIndex);

    return { board, objects, settings };
  } catch (err: any) {
    const defaultBoard = createDefaultBoard();
    const defaultSettings = createDefaultSettings();
    const starter = createStarterObjects(defaultBoard.id);
    return {
      board: defaultBoard,
      objects: starter,
      settings: defaultSettings,
      storageError:
        err?.message ||
        'Local IndexedDB storage is unavailable or restricted in this browser mode.',
    };
  }
}

export async function saveCanvasObjectsBatch(
  boardId: string,
  objects: CanvasObject[],
  database: CozyBoardDatabase = db
): Promise<void> {
  if (simulatedStorageFailure) {
    throw new Error('Simulated IndexedDB write error: Quota or permission denied.');
  }

  await database.transaction('rw', database.objects, database.boards, async () => {
    const existingIds = await database.objects
      .where('boardId')
      .equals(boardId)
      .primaryKeys();
    const nextIds = new Set(objects.map((o) => o.id));
    const toDelete = existingIds.filter((id) => !nextIds.has(id));
    if (toDelete.length > 0) {
      await database.objects.bulkDelete(toDelete);
    }
    if (objects.length > 0) {
      await database.objects.bulkPut(objects);
    }
    await database.boards.update(boardId, { updatedAt: Date.now() });
  });
}

export async function saveBoardViewport(
  board: BoardMetadata,
  database: CozyBoardDatabase = db
): Promise<void> {
  if (simulatedStorageFailure) {
    throw new Error('Simulated IndexedDB write error: Quota or permission denied.');
  }
  await database.boards.put({ ...board, updatedAt: Date.now() });
}

export async function saveAppSettings(
  settings: AppSettings,
  database: CozyBoardDatabase = db
): Promise<void> {
  if (simulatedStorageFailure) {
    throw new Error('Simulated IndexedDB write error: Quota or permission denied.');
  }
  await database.settings.put({
    ...settings,
    id: 'default',
    schemaVersion: CURRENT_SCHEMA_VERSION,
  });
}

export function createBackupPayload(
  board: BoardMetadata,
  objects: CanvasObject[],
  settings: AppSettings
): BackupPayload {
  return {
    app: 'CozyBoard',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    boards: [board],
    objects,
    settings: {
      ...settings,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    },
  };
}

export function validateAndMigrateBackup(raw: unknown): BackupPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid backup file: expected a JSON object.');
  }
  const data = raw as Partial<BackupPayload>;
  if (data.app !== 'CozyBoard' || !Array.isArray(data.objects)) {
    throw new Error(
      'Invalid backup file: missing CozyBoard signature or objects array.'
    );
  }

  const boards: BoardMetadata[] =
    Array.isArray(data.boards) && data.boards.length > 0
      ? data.boards
      : [createDefaultBoard()];

  const activeBoardId = boards[0].id;

  // Migrate/normalize objects from older schema versions if needed
  const objects: CanvasObject[] = data.objects.map((obj, idx) => ({
    ...obj,
    id: obj.id || `imported-${Date.now()}-${idx}`,
    boardId: obj.boardId || activeBoardId,
    type: obj.type || 'sticky',
    x: typeof obj.x === 'number' ? obj.x : 100 + idx * 20,
    y: typeof obj.y === 'number' ? obj.y : 100 + idx * 20,
    width: typeof obj.width === 'number' ? obj.width : 240,
    height: typeof obj.height === 'number' ? obj.height : 180,
    zIndex: typeof obj.zIndex === 'number' ? obj.zIndex : idx + 1,
    color: obj.color || 'cream',
    title: typeof obj.title === 'string' ? obj.title : '',
    content: typeof obj.content === 'string' ? obj.content : '',
    tags: Array.isArray(obj.tags) ? obj.tags : [],
    status:
      obj.type === 'task'
        ? obj.status || (obj.completed ? 'done' : 'todo')
        : obj.status,
    priority: obj.type === 'task' ? obj.priority || 'medium' : obj.priority,
    completed:
      obj.type === 'task'
        ? Boolean(obj.completed || obj.status === 'done')
        : obj.completed,
    createdAt: obj.createdAt || Date.now(),
    updatedAt: obj.updatedAt || Date.now(),
  }));

  const settings: AppSettings = {
    ...createDefaultSettings(),
    ...(data.settings || {}),
    id: 'default',
    activeBoardId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };

  return {
    app: 'CozyBoard',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: data.exportedAt || new Date().toISOString(),
    boards,
    objects,
    settings,
  };
}

export async function restoreBackupToDatabase(
  payload: BackupPayload,
  database: CozyBoardDatabase = db
): Promise<{
  board: BoardMetadata;
  objects: CanvasObject[];
  settings: AppSettings;
}> {
  const validated = validateAndMigrateBackup(payload);
  if (simulatedStorageFailure) {
    throw new Error('Simulated IndexedDB write error during restore.');
  }

  await database.transaction(
    'rw',
    database.boards,
    database.objects,
    database.settings,
    async () => {
      await database.objects.clear();
      await database.boards.clear();
      await database.boards.bulkPut(validated.boards);
      await database.objects.bulkPut(validated.objects);
      await database.settings.put(validated.settings);
    }
  );

  return {
    board: validated.boards[0],
    objects: validated.objects,
    settings: validated.settings,
  };
}
