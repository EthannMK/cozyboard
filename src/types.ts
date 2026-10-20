export type PastelColor =
  | 'cream'
  | 'lavender'
  | 'blue'
  | 'pink'
  | 'mint'
  | 'peach'
  | 'butter';

export type TaskStatus = 'todo' | 'in-progress' | 'waiting' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export type CanvasObjectType =
  | 'sticky'
  | 'task'
  | 'checklist'
  | 'daily'
  | 'section'
  | 'text'
  | 'shape'
  | 'connector'
  | 'drawing'
  | 'sticker';

export type ShapeKind = 'rectangle' | 'circle' | 'diamond' | 'pill';

export type ToolType =
  | 'select'
  | 'hand'
  | 'sticky'
  | 'task'
  | 'checklist'
  | 'daily'
  | 'section'
  | 'text'
  | 'draw'
  | 'eraser'
  | 'shape'
  | 'connector'
  | 'sticker';

export type WorkspaceView =
  | 'board'
  | 'pending'
  | 'today'
  | 'ideas'
  | 'completed'
  | 'search';

export type BackgroundPattern = 'dots' | 'grid' | 'notebook' | 'plain';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export interface CanvasObject {
  id: string;
  boardId: string;
  type: CanvasObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  color: PastelColor;
  title: string;
  content: string;
  tags: string[];
  groupId?: string;
  createdAt: number;
  updatedAt: number;

  // Task-specific fields
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string; // YYYY-MM-DD
  completed?: boolean;
  completedAt?: number;

  // Checklist-specific fields
  checklist?: ChecklistItem[];

  // Daily note / Reminder specific fields
  mood?: string;
  reminderTime?: string;

  // Text-specific fields
  fontSize?: number;
  isHeading?: boolean;

  // Shape-specific fields
  shapeKind?: ShapeKind;

  // Connector-specific fields
  fromId?: string;
  toId?: string;
  targetX?: number;
  targetY?: number;
  connectorStyle?: 'solid' | 'dashed';

  // Freehand Drawing-specific fields
  points?: Point[];
  strokeColor?: string;
  strokeWidth?: number;

  // Sticker-specific fields
  stickerId?: string;
}

export interface BoardMetadata {
  id: string;
  name: string;
  panX: number;
  panY: number;
  zoom: number;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  id: string; // 'default'
  darkMode: boolean;
  reducedMotion: boolean;
  showDecorations: boolean;
  backgroundPattern: BackgroundPattern;
  activeBoardId: string;
  quoteIndex: number;
  storageWarningDismissed?: boolean;
  schemaVersion: number;
}

export type SaveStatus =
  | 'saved'
  | 'saving'
  | 'offline-saved'
  | 'error';

export interface BackupPayload {
  app: 'CozyBoard';
  schemaVersion: number;
  exportedAt: string;
  boards: BoardMetadata[];
  objects: CanvasObject[];
  settings: AppSettings;
}
