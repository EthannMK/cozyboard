import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  MousePointer,
  Hand,
  StickyNote,
  CheckSquare,
  ListTodo,
  BookHeart,
  LayoutTemplate,
  Type,
  PenTool,
  Eraser,
  Shapes,
  GitCommit,
  Smile,
  Undo2,
  Redo2,
  Wifi,
  WifiOff,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Moon,
  Sun,
  Shield,
  Search,
  Trash2,
  Link,
  Unlink,
} from 'lucide-react';
import {
  AppSettings,
  BoardMetadata,
  CanvasObject,
  PastelColor,
  Point,
  SaveStatus,
  ShapeKind,
  ToolType,
  WorkspaceView,
} from './types';
import {
  DRAW_COLORS,
  STICKERS,
  createStarterObjects,
  getTodayISO,
  isTaskDueToday,
  isTaskOverdue,
} from './constants';
import {
  createBackupPayload,
  createDefaultBoard,
  createDefaultSettings,
  initializeWorkspaceData,
  requestPersistentStorage,
  restoreBackupToDatabase,
  saveAppSettings,
  saveBoardViewport,
  saveCanvasObjectsBatch,
} from './db';
import { CanvasCard } from './components/CanvasCard';
import {
  CompanionCornerWidget,
  ConfettiSparkleBurst,
  EmptyBoardState,
  FloatingBackdropDecorations,
} from './components/CuteDecorations';
import { WorkspaceViews } from './components/WorkspaceViews';
import { DataSafetyModal } from './components/DataSafetyModal';
import { Minimap } from './components/Minimap';
import { FocusTimerWidget } from './components/FocusTimerWidget';

const MAX_HISTORY = 45;

export const App: React.FC = () => {
  // Core persistent state
  const [board, setBoard] = useState<BoardMetadata>(createDefaultBoard);
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [settings, setSettings] = useState<AppSettings>(createDefaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Offline & Save status
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [storageError, setStorageError] = useState<string | null>(null);
  const [storageInfo, setStorageInfo] = useState<{
    persisted: boolean;
    usageBytes?: number;
    quotaBytes?: number;
  }>({ persisted: false });

  // Active workspace view & tool
  const [activeView, setActiveView] = useState<WorkspaceView>('board');
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [activeColor] = useState<PastelColor>('pink');
  const [activeShapeKind] = useState<ShapeKind>('rectangle');
  const [drawColor, setDrawColor] = useState<string>(DRAW_COLORS[0].value);
  const [drawWidth, setDrawWidth] = useState<number>(4);
  const [activeSticker] = useState(STICKERS[0]);
  const [showStickerTray, setShowStickerTray] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Selection, Undo/Redo, Copy/Paste
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<CanvasObject[]>([]);
  const [undoStack, setUndoStack] = useState<CanvasObject[][]>([]);
  const [redoStack, setRedoStack] = useState<CanvasObject[][]>([]);

  // Connector creation state
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);

  // Sparkle/Confetti bursts
  const [bursts, setBursts] = useState<
    Array<{ id: string; x: number; y: number }>
  >([]);

  // Viewport & interaction refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight - 64 : 720,
  });

  // Pointer interaction state
  const interactionRef = useRef<{
    mode:
      | 'none'
      | 'pan'
      | 'drag-object'
      | 'resize-object'
      | 'draw'
      | 'erase'
      | 'marquee';
    startX: number;
    startY: number;
    initialPanX: number;
    initialPanY: number;
    targetId?: string;
    initialPositions?: Record<
      string,
      { x: number; y: number; width: number; height: number }
    >;
    drawingId?: string;
    snapshotBeforeAction?: CanvasObject[];
  }>({
    mode: 'none',
    startX: 0,
    startY: 0,
    initialPanX: 0,
    initialPanY: 0,
  });

  const [marqueeBox, setMarqueeBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Spacebar pan key state
  const [spacePressed, setSpacePressed] = useState(false);

  // Load workspace from IndexedDB on mount
  useEffect(() => {
    let mounted = true;
    async function load() {
      const data = await initializeWorkspaceData();
      if (!mounted) return;
      setBoard(data.board);
      setObjects(data.objects);
      setSettings(data.settings);
      if (data.storageError) {
        setStorageError(data.storageError);
        setSaveStatus('error');
      } else {
        setSaveStatus(navigator.onLine ? 'saved' : 'offline-saved');
      }
      setIsLoaded(true);

      const persistInfo = await requestPersistentStorage();
      if (mounted) {
        setStorageInfo(persistInfo);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Listen to online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSaveStatus((prev) => (prev === 'error' ? 'error' : 'saved'));
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSaveStatus((prev) => (prev === 'error' ? 'error' : 'offline-saved'));
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Track viewport resize
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight - 64,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Persist objects automatically and immediately whenever `objects` changes
  const persistObjectsNow = useCallback(
    async (nextObjects: CanvasObject[], currentBoardId: string) => {
      setSaveStatus('saving');
      try {
        await saveCanvasObjectsBatch(currentBoardId, nextObjects);
        setStorageError(null);
        setSaveStatus(navigator.onLine ? 'saved' : 'offline-saved');
      } catch (err: any) {
        setStorageError(
          err?.message || 'Unable to save to IndexedDB local storage.'
        );
        setSaveStatus('error');
      }
    },
    []
  );

  useEffect(() => {
    if (!isLoaded) return;
    persistObjectsNow(objects, board.id);
  }, [objects, board.id, isLoaded, persistObjectsNow]);

  // Persist board viewport (pan/zoom/name) immediately
  useEffect(() => {
    if (!isLoaded) return;
    saveBoardViewport(board).catch((err) => {
      setStorageError(err?.message || 'Storage error saving viewport.');
      setSaveStatus('error');
    });
  }, [board, isLoaded]);

  // Push snapshot to Undo stack
  const pushUndoSnapshot = useCallback((snapshot: CanvasObject[]) => {
    setUndoStack((prev) => {
      const next = [...prev, snapshot];
      return next.length > MAX_HISTORY
        ? next.slice(next.length - MAX_HISTORY)
        : next;
    });
    setRedoStack([]);
  }, []);

  // Undo & Redo handlers
  const handleUndo = useCallback(() => {
    setUndoStack((prevUndo) => {
      if (prevUndo.length === 0) return prevUndo;
      const previousState = prevUndo[prevUndo.length - 1];
      setRedoStack((prevRedo) => [...prevRedo, objects]);
      setObjects(previousState);
      return prevUndo.slice(0, -1);
    });
  }, [objects]);

  const handleRedo = useCallback(() => {
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) return prevRedo;
      const nextState = prevRedo[prevRedo.length - 1];
      setUndoStack((prevUndo) => [...prevUndo, objects]);
      setObjects(nextState);
      return prevRedo.slice(0, -1);
    });
  }, [objects]);

  // Trigger celebration burst
  const triggerCelebration = useCallback((clientX?: number, clientY?: number) => {
    const x = clientX ?? window.innerWidth / 2;
    const y = clientY ?? window.innerHeight / 2;
    const id = `burst-${Date.now()}-${Math.random()}`;
    setBursts((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== id));
    }, 1300);
  }, []);

  // Convert screen coordinates to world coordinates on canvas
  const screenToWorld = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = canvasRef.current?.getBoundingClientRect();
      const offsetX = rect ? clientX - rect.left : clientX;
      const offsetY = rect ? clientY - rect.top : clientY - 64;
      return {
        x: Math.round((offsetX - board.panX) / board.zoom),
        y: Math.round((offsetY - board.panY) / board.zoom),
      };
    },
    [board.panX, board.panY, board.zoom]
  );

  // Max zIndex helper
  const getNextZIndex = useCallback(
    (isSection = false) => {
      if (isSection) return 1;
      const maxZ = objects.reduce((max, o) => Math.max(max, o.zIndex || 2), 2);
      return maxZ + 1;
    },
    [objects]
  );

  // Create new object at world position
  const createObjectAt = useCallback(
    (
      type: CanvasObject['type'],
      worldX: number,
      worldY: number,
      overrides: Partial<CanvasObject> = {}
    ): CanvasObject => {
      const now = Date.now();
      const id = `obj-${now}-${Math.random().toString(36).slice(2, 7)}`;
      const base: CanvasObject = {
        id,
        boardId: board.id,
        type,
        x: worldX,
        y: worldY,
        width:
          type === 'section'
            ? 520
            : type === 'sticker'
            ? 84
            : type === 'shape'
            ? 180
            : 270,
        height:
          type === 'section'
            ? 360
            : type === 'sticker'
            ? 84
            : type === 'shape'
            ? 130
            : type === 'text'
            ? 80
            : 205,
        zIndex: getNextZIndex(type === 'section'),
        color: activeColor,
        title:
          type === 'task'
            ? 'New Task'
            : type === 'sticky'
            ? 'New Idea'
            : type === 'checklist'
            ? '📋 Cozy Checklist'
            : type === 'daily'
            ? `🌸 Daily Note (${getTodayISO()})`
            : type === 'section'
            ? '✨ Brainstorm Zone'
            : type === 'text'
            ? 'Heading or Note'
            : type === 'shape'
            ? 'Concept'
            : type === 'sticker'
            ? activeSticker.label
            : '',
        content:
          type === 'sticker'
            ? activeSticker.emoji
            : type === 'section'
            ? 'Drop related cards here'
            : '',
        tags: [],
        createdAt: now,
        updatedAt: now,
        ...(type === 'task'
          ? {
              status: 'todo',
              priority: 'medium',
              dueDate: '',
              completed: false,
            }
          : {}),
        ...(type === 'checklist'
          ? {
              checklist: [
                { id: `chk-${now}-1`, text: 'First step', done: false },
              ],
            }
          : {}),
        ...(type === 'daily'
          ? {
              mood: '🌸 Cozy & Focused',
              reminderTime: '10:00',
            }
          : {}),
        ...(type === 'text' ? { isHeading: true } : {}),
        ...(type === 'shape' ? { shapeKind: activeShapeKind } : {}),
        ...(type === 'sticker' ? { stickerId: activeSticker.id } : {}),
        ...overrides,
      };

      pushUndoSnapshot(objects);
      setObjects((prev) => [...prev, base]);
      setSelectedIds([id]);
      return base;
    },
    [
      board.id,
      getNextZIndex,
      activeColor,
      activeSticker,
      activeShapeKind,
      pushUndoSnapshot,
      objects,
    ]
  );

  // Update object fields
  const handleUpdateObject = useCallback(
    (id: string, patch: Partial<CanvasObject>) => {
      setObjects((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, ...patch, updatedAt: Date.now() } : o
        )
      );
    },
    []
  );

  // Delete single or multiple objects (and any attached connectors)
  const handleDeleteObject = useCallback(
    (id: string) => {
      pushUndoSnapshot(objects);
      setObjects((prev) =>
        prev.filter((o) => o.id !== id && o.fromId !== id && o.toId !== id)
      );
      setSelectedIds((prev) => prev.filter((sid) => sid !== id));
    },
    [objects, pushUndoSnapshot]
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const set = new Set(selectedIds);
    pushUndoSnapshot(objects);
    setObjects((prev) =>
      prev.filter(
        (o) =>
          !set.has(o.id) &&
          (!o.fromId || !set.has(o.fromId)) &&
          (!o.toId || !set.has(o.toId))
      )
    );
    setSelectedIds([]);
  }, [selectedIds, objects, pushUndoSnapshot]);

  // Duplicate object
  const handleDuplicateObject = useCallback(
    (id: string) => {
      const target = objects.find((o) => o.id === id);
      if (!target) return;
      const now = Date.now();
      const copy: CanvasObject = {
        ...target,
        id: `obj-${now}-${Math.random().toString(36).slice(2, 6)}`,
        x: target.x + 28,
        y: target.y + 28,
        zIndex: getNextZIndex(target.type === 'section'),
        createdAt: now,
        updatedAt: now,
      };
      pushUndoSnapshot(objects);
      setObjects((prev) => [...prev, copy]);
      setSelectedIds([copy.id]);
    },
    [objects, getNextZIndex, pushUndoSnapshot]
  );

  // Convert Sticky Note -> Task Card
  const handleConvertStickyToTask = useCallback(
    (id: string) => {
      pushUndoSnapshot(objects);
      setObjects((prev) =>
        prev.map((o) =>
          o.id === id
            ? {
                ...o,
                type: 'task',
                status: 'todo',
                priority: 'medium',
                completed: false,
                dueDate: o.dueDate || getTodayISO(),
                height: Math.max(o.height, 210),
                updatedAt: Date.now(),
              }
            : o
        )
      );
    },
    [objects, pushUndoSnapshot]
  );

  // Toggle Task Completion with Sparkle/Confetti Burst!
  const handleToggleTaskComplete = useCallback(
    (id: string, clientX?: number, clientY?: number) => {
      pushUndoSnapshot(objects);
      setObjects((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o;
          const nextCompleted = !o.completed;
          if (nextCompleted) {
            triggerCelebration(clientX, clientY);
          }
          return {
            ...o,
            completed: nextCompleted,
            status: nextCompleted ? 'done' : 'todo',
            completedAt: nextCompleted ? Date.now() : undefined,
            updatedAt: Date.now(),
          };
        })
      );
    },
    [objects, pushUndoSnapshot, triggerCelebration]
  );

  // Connect two cards with an arrow
  const handleStartConnectFrom = useCallback(
    (id: string) => {
      if (!connectSourceId) {
        setConnectSourceId(id);
        setActiveTool('connector');
      } else if (connectSourceId !== id) {
        const now = Date.now();
        const conn: CanvasObject = {
          id: `conn-${now}-${Math.random().toString(36).slice(2, 6)}`,
          boardId: board.id,
          type: 'connector',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          zIndex: 2,
          color: activeColor,
          title: 'related',
          content: '',
          tags: [],
          fromId: connectSourceId,
          toId: id,
          connectorStyle: 'solid',
          createdAt: now,
          updatedAt: now,
        };
        pushUndoSnapshot(objects);
        setObjects((prev) => [...prev, conn]);
        setConnectSourceId(null);
        setActiveTool('select');
      } else {
        setConnectSourceId(null);
      }
    },
    [connectSourceId, board.id, activeColor, objects, pushUndoSnapshot]
  );

  // Group / Ungroup multi-selected objects
  const handleGroupSelected = useCallback(() => {
    if (selectedIds.length < 2) return;
    const gid = `grp-${Date.now().toString(36)}`;
    const set = new Set(selectedIds);
    pushUndoSnapshot(objects);
    setObjects((prev) =>
      prev.map((o) => (set.has(o.id) ? { ...o, groupId: gid } : o))
    );
  }, [selectedIds, objects, pushUndoSnapshot]);

  const handleUngroupSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const set = new Set(selectedIds);
    pushUndoSnapshot(objects);
    setObjects((prev) =>
      prev.map((o) => (set.has(o.id) ? { ...o, groupId: undefined } : o))
    );
  }, [selectedIds, objects, pushUndoSnapshot]);

  // Select object (supports Shift multi-select and group selection)
  const handleSelectObject = useCallback(
    (e: React.MouseEvent | React.PointerEvent, id: string) => {
      e.stopPropagation();

      if (activeTool === 'eraser') {
        handleDeleteObject(id);
        return;
      }

      if (activeTool === 'connector' || connectSourceId) {
        handleStartConnectFrom(id);
        return;
      }

      const clicked = objects.find((o) => o.id === id);
      const groupMembers =
        clicked?.groupId
          ? objects.filter((o) => o.groupId === clicked.groupId).map((o) => o.id)
          : [id];

      if (e.shiftKey) {
        setSelectedIds((prev) => {
          const exists = prev.includes(id);
          if (exists) {
            return prev.filter((item) => !groupMembers.includes(item));
          }
          return Array.from(new Set([...prev, ...groupMembers]));
        });
      } else {
        setSelectedIds((prev) =>
          prev.includes(id) && prev.length > 1 ? prev : groupMembers
        );
      }
    },
    [
      activeTool,
      connectSourceId,
      objects,
      handleDeleteObject,
      handleStartConnectFrom,
    ]
  );

  // Start dragging selected object(s)
  const handleStartDragObject = useCallback(
    (e: React.PointerEvent, id: string) => {
      if (activeTool === 'hand' || spacePressed || activeTool === 'eraser') {
        return;
      }
      e.stopPropagation();
      const clicked = objects.find((o) => o.id === id);
      if (!clicked) return;

      let movingIds = selectedIds.includes(id) ? [...selectedIds] : [id];
      if (clicked.groupId) {
        const groupIds = objects
          .filter((o) => o.groupId === clicked.groupId)
          .map((o) => o.id);
        movingIds = Array.from(new Set([...movingIds, ...groupIds]));
      }

      const initialPositions: Record<
        string,
        { x: number; y: number; width: number; height: number }
      > = {};
      objects.forEach((o) => {
        if (movingIds.includes(o.id)) {
          initialPositions[o.id] = {
            x: o.x,
            y: o.y,
            width: o.width,
            height: o.height,
          };
        }
      });

      interactionRef.current = {
        mode: 'drag-object',
        startX: e.clientX,
        startY: e.clientY,
        initialPanX: board.panX,
        initialPanY: board.panY,
        targetId: id,
        initialPositions,
        snapshotBeforeAction: objects,
      };
    },
    [activeTool, spacePressed, objects, selectedIds, board.panX, board.panY]
  );

  // Start resizing object
  const handleStartResizeObject = useCallback(
    (e: React.PointerEvent, id: string) => {
      e.stopPropagation();
      const target = objects.find((o) => o.id === id);
      if (!target) return;
      interactionRef.current = {
        mode: 'resize-object',
        startX: e.clientX,
        startY: e.clientY,
        initialPanX: board.panX,
        initialPanY: board.panY,
        targetId: id,
        initialPositions: {
          [id]: {
            x: target.x,
            y: target.y,
            width: target.width,
            height: target.height,
          },
        },
        snapshotBeforeAction: objects,
      };
    },
    [objects, board.panX, board.panY]
  );

  // Canvas background pointer down
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button === 1 || activeTool === 'hand' || spacePressed) {
      interactionRef.current = {
        mode: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        initialPanX: board.panX,
        initialPanY: board.panY,
      };
      return;
    }

    const worldPt = screenToWorld(e.clientX, e.clientY);

    // Freehand drawing tool
    if (activeTool === 'draw') {
      const now = Date.now();
      const drawId = `draw-${now}-${Math.random().toString(36).slice(2, 6)}`;
      const newDrawing: CanvasObject = {
        id: drawId,
        boardId: board.id,
        type: 'drawing',
        x: worldPt.x,
        y: worldPt.y,
        width: 10,
        height: 10,
        zIndex: getNextZIndex(),
        color: activeColor,
        title: 'Freehand Doodle',
        content: '',
        tags: [],
        points: [worldPt],
        strokeColor: drawColor,
        strokeWidth: drawWidth,
        createdAt: now,
        updatedAt: now,
      };
      pushUndoSnapshot(objects);
      setObjects((prev) => [...prev, newDrawing]);
      interactionRef.current = {
        mode: 'draw',
        startX: e.clientX,
        startY: e.clientY,
        initialPanX: board.panX,
        initialPanY: board.panY,
        drawingId: drawId,
      };
      return;
    }

    // Eraser tool
    if (activeTool === 'eraser') {
      interactionRef.current = {
        mode: 'erase',
        startX: e.clientX,
        startY: e.clientY,
        initialPanX: board.panX,
        initialPanY: board.panY,
      };
      return;
    }

    // Object creation tools (click on canvas to place!)
    if (
      activeTool === 'sticky' ||
      activeTool === 'task' ||
      activeTool === 'checklist' ||
      activeTool === 'daily' ||
      activeTool === 'section' ||
      activeTool === 'text' ||
      activeTool === 'shape' ||
      activeTool === 'sticker'
    ) {
      createObjectAt(activeTool, worldPt.x - 110, worldPt.y - 60);
      setActiveTool('select');
      return;
    }

    // Select tool on empty canvas -> start Marquee multi-select box
    setSelectedIds([]);
    setConnectSourceId(null);
    interactionRef.current = {
      mode: 'marquee',
      startX: worldPt.x,
      startY: worldPt.y,
      initialPanX: board.panX,
      initialPanY: board.panY,
    };
    setMarqueeBox({ x: worldPt.x, y: worldPt.y, width: 0, height: 0 });
  };

  // Global Pointer Move & Pointer Up for smooth dragging/resizing/drawing/panning
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const state = interactionRef.current;
      if (state.mode === 'none') return;

      if (state.mode === 'pan') {
        const dx = e.clientX - state.startX;
        const dy = e.clientY - state.startY;
        setBoard((prev) => ({
          ...prev,
          panX: state.initialPanX + dx,
          panY: state.initialPanY + dy,
        }));
        return;
      }

      if (state.mode === 'drag-object' && state.initialPositions) {
        const dx = (e.clientX - state.startX) / board.zoom;
        const dy = (e.clientY - state.startY) / board.zoom;
        const initPos = state.initialPositions;
        setObjects((prev) =>
          prev.map((o) => {
            const start = initPos[o.id];
            if (!start) return o;
            return {
              ...o,
              x: Math.round(start.x + dx),
              y: Math.round(start.y + dy),
              updatedAt: Date.now(),
            };
          })
        );
        return;
      }

      if (
        state.mode === 'resize-object' &&
        state.targetId &&
        state.initialPositions
      ) {
        const start = state.initialPositions[state.targetId];
        if (!start) return;
        const dx = (e.clientX - state.startX) / board.zoom;
        const dy = (e.clientY - state.startY) / board.zoom;
        setObjects((prev) =>
          prev.map((o) =>
            o.id === state.targetId
              ? {
                  ...o,
                  width: Math.max(72, Math.round(start.width + dx)),
                  height: Math.max(60, Math.round(start.height + dy)),
                  updatedAt: Date.now(),
                }
              : o
          )
        );
        return;
      }

      if (state.mode === 'draw' && state.drawingId) {
        const pt = screenToWorld(e.clientX, e.clientY);
        setObjects((prev) =>
          prev.map((o) => {
            if (o.id !== state.drawingId) return o;
            const pts = o.points || [];
            return {
              ...o,
              points: [...pts, pt],
              updatedAt: Date.now(),
            };
          })
        );
        return;
      }

      if (state.mode === 'erase') {
        const pt = screenToWorld(e.clientX, e.clientY);
        setObjects((prev) =>
          prev.filter((o) => {
            if (o.type === 'drawing' && o.points) {
              const hit = o.points.some(
                (p) => Math.hypot(p.x - pt.x, p.y - pt.y) < 26
              );
              return !hit;
            }
            return true;
          })
        );
        return;
      }

      if (state.mode === 'marquee') {
        const pt = screenToWorld(e.clientX, e.clientY);
        const x = Math.min(state.startX, pt.x);
        const y = Math.min(state.startY, pt.y);
        const width = Math.abs(pt.x - state.startX);
        const height = Math.abs(pt.y - state.startY);
        setMarqueeBox({ x, y, width, height });

        const hits = objects
          .filter((o) => {
            if (o.type === 'connector' || o.type === 'drawing') return false;
            return (
              o.x + o.width >= x &&
              o.x <= x + width &&
              o.y + o.height >= y &&
              o.y <= y + height
            );
          })
          .map((o) => o.id);
        setSelectedIds(hits);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const state = interactionRef.current;
      if (state.mode === 'none') return;

      if (
        (state.mode === 'drag-object' || state.mode === 'resize-object') &&
        state.snapshotBeforeAction
      ) {
        const moved =
          Math.abs(e.clientX - state.startX) > 3 ||
          Math.abs(e.clientY - state.startY) > 3;
        if (moved) {
          pushUndoSnapshot(state.snapshotBeforeAction);
        }
      }

      if (state.mode === 'marquee') {
        setMarqueeBox(null);
      }

      interactionRef.current = {
        mode: 'none',
        startX: 0,
        startY: 0,
        initialPanX: 0,
        initialPanY: 0,
      };
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [board.zoom, objects, pushUndoSnapshot, screenToWorld]);

  // Wheel pan & zoom on canvas
  const handleCanvasWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      setBoard((prev) => {
        const nextZoom = Math.min(
          2.5,
          Math.max(0.25, +(prev.zoom + delta).toFixed(2))
        );
        return { ...prev, zoom: nextZoom };
      });
    } else {
      setBoard((prev) => ({
        ...prev,
        panX: prev.panX - e.deltaX,
        panY: prev.panY - e.deltaY,
      }));
    }
  };

  // Keyboard shortcuts (Undo, Redo, Copy, Paste, Duplicate, Delete, Spacebar Pan)
  useEffect(() => {
    const isInputFocused = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        (el as HTMLElement).isContentEditable
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isInputFocused()) {
        setSpacePressed(true);
      }

      if (isInputFocused()) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedIds.length > 0) {
          const copied = objects.filter((o) => selectedIds.includes(o.id));
          setClipboard(copied);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (clipboard.length > 0) {
          e.preventDefault();
          const now = Date.now();
          const pasted = clipboard.map((item, idx) => ({
            ...item,
            id: `obj-${now}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
            x: item.x + 32,
            y: item.y + 32,
            zIndex: getNextZIndex(item.type === 'section') + idx,
            createdAt: now,
            updatedAt: now,
          }));
          pushUndoSnapshot(objects);
          setObjects((prev) => [...prev, ...pasted]);
          setSelectedIds(pasted.map((p) => p.id));
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          handleDuplicateObject(selectedIds[0]);
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
        return;
      }

      if (e.key === 'Escape') {
        setActiveTool('select');
        setConnectSourceId(null);
        setSelectedIds([]);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    handleUndo,
    handleRedo,
    selectedIds,
    objects,
    clipboard,
    getNextZIndex,
    pushUndoSnapshot,
    handleDuplicateObject,
    handleDeleteSelected,
  ]);

  // Settings updater
  const handleUpdateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveAppSettings(next).catch(() => {
        setSaveStatus('error');
      });
      return next;
    });
  }, []);

  // Backup Export & Restore handlers
  const handleExportBackup = useCallback(() => {
    const payload = createBackupPayload(board, objects, settings);
    const jsonString = JSON.stringify(payload, null, 2);
    try {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cozyboard-backup-${getTodayISO()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback for headless test environments
    }
    return jsonString;
  }, [board, objects, settings]);

  const handleImportBackupJson = useCallback(
    async (jsonText: string) => {
      const parsed = JSON.parse(jsonText);
      const restored = await restoreBackupToDatabase(parsed);
      pushUndoSnapshot(objects);
      setBoard(restored.board);
      setObjects(restored.objects);
      setSettings(restored.settings);
    },
    [objects, pushUndoSnapshot]
  );

  // Stress test generator (Scenario 12: large number of notes and drawings)
  const handleGenerateManyObjects = useCallback(
    (count: number) => {
      const now = Date.now();
      const colors: PastelColor[] = [
        'cream',
        'lavender',
        'blue',
        'pink',
        'mint',
        'peach',
        'butter',
      ];
      const generated: CanvasObject[] = [];
      for (let i = 0; i < count; i++) {
        const col = i % 8;
        const row = Math.floor(i / 8);
        const isDrawing = i % 6 === 0;
        const isTask = i % 3 === 0 && !isDrawing;
        const baseX = 120 + col * 295;
        const baseY = 620 + row * 235;

        if (isDrawing) {
          generated.push({
            id: `stress-draw-${now}-${i}`,
            boardId: board.id,
            type: 'drawing',
            x: baseX,
            y: baseY,
            width: 120,
            height: 80,
            zIndex: 10 + i,
            color: colors[i % colors.length],
            title: `Doodle #${i + 1}`,
            content: '',
            tags: ['stress-test'],
            points: [
              { x: baseX, y: baseY },
              { x: baseX + 40, y: baseY - 25 },
              { x: baseX + 85, y: baseY + 20 },
              { x: baseX + 130, y: baseY - 10 },
            ],
            strokeColor: DRAW_COLORS[i % DRAW_COLORS.length].value,
            strokeWidth: 4,
            createdAt: now,
            updatedAt: now,
          });
        } else {
          generated.push({
            id: `stress-card-${now}-${i}`,
            boardId: board.id,
            type: isTask ? 'task' : 'sticky',
            x: baseX,
            y: baseY,
            width: 260,
            height: 195,
            zIndex: 10 + i,
            color: colors[i % colors.length],
            title: isTask
              ? `Batch Task #${i + 1}`
              : `Brainstorm Idea #${i + 1}`,
            content: `Generated item ${i + 1} for smooth large-board rendering verification.`,
            tags: ['batch', isTask ? 'task' : 'idea'],
            status: isTask ? 'todo' : undefined,
            priority: isTask ? 'medium' : undefined,
            completed: false,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
      pushUndoSnapshot(objects);
      setObjects((prev) => [...prev, ...generated]);
    },
    [board.id, objects, pushUndoSnapshot]
  );

  // Counters for top navigation badges
  const navCounts = useMemo(() => {
    let pending = 0;
    let today = 0;
    let ideas = 0;
    let completed = 0;
    objects.forEach((o) => {
      if (o.type === 'task') {
        if (o.completed || o.status === 'done') {
          completed++;
        } else {
          pending++;
          if (
            isTaskDueToday(o) ||
            isTaskOverdue(o) ||
            o.priority === 'high'
          ) {
            today++;
          }
        }
      } else if (o.type === 'sticky') {
        ideas++;
      } else if (o.type === 'daily') {
        today++;
      }
    });
    return { pending, today, ideas, completed };
  }, [objects]);

  // Separate SVG drawings & connectors from card objects
  const drawings = useMemo(
    () => objects.filter((o) => o.type === 'drawing'),
    [objects]
  );
  const connectors = useMemo(
    () => objects.filter((o) => o.type === 'connector'),
    [objects]
  );
  const cardObjects = useMemo(
    () =>
      objects.filter((o) => o.type !== 'drawing' && o.type !== 'connector'),
    [objects]
  );

  return (
    <div
      className={`cozy-app-shell ${
        settings.darkMode ? 'dark-theme' : 'light-theme'
      } ${settings.reducedMotion ? 'reduced-motion' : ''}`}
      data-testid="cozy-app-shell"
    >
      {/* Confetti / Sparkle Burst Layer */}
      <ConfettiSparkleBurst
        bursts={bursts}
        reducedMotion={settings.reducedMotion}
      />

      {/* Top Navigation & Workspace Bar */}
      <header className="cozy-topbar">
        <div className="brand-and-board">
          <div className="logo-badge" title="CozyBoard">
            🐱
          </div>
          <input
            type="text"
            className="board-name-input"
            value={board.name}
            onChange={(e) =>
              setBoard((prev) => ({ ...prev, name: e.target.value }))
            }
            aria-label="Board name"
            data-testid="board-name-input"
          />
        </div>

        {/* Workspace Views Switcher */}
        <nav className="workspace-views-nav" aria-label="Workspace views">
          <button
            type="button"
            className={`view-tab-btn ${activeView === 'board' ? 'active' : ''}`}
            onClick={() => setActiveView('board')}
            data-testid="nav-view-board"
          >
            🎨 My Board
          </button>
          <button
            type="button"
            className={`view-tab-btn ${
              activeView === 'pending' ? 'active' : ''
            }`}
            onClick={() => setActiveView('pending')}
            data-testid="nav-view-pending"
          >
            📌 Pending{' '}
            <span className="tab-badge" data-testid="badge-pending">
              {navCounts.pending}
            </span>
          </button>
          <button
            type="button"
            className={`view-tab-btn ${activeView === 'today' ? 'active' : ''}`}
            onClick={() => setActiveView('today')}
            data-testid="nav-view-today"
          >
            🌟 Today{' '}
            <span className="tab-badge" data-testid="badge-today">
              {navCounts.today}
            </span>
          </button>
          <button
            type="button"
            className={`view-tab-btn ${activeView === 'ideas' ? 'active' : ''}`}
            onClick={() => setActiveView('ideas')}
            data-testid="nav-view-ideas"
          >
            💡 Ideas{' '}
            <span className="tab-badge" data-testid="badge-ideas">
              {navCounts.ideas}
            </span>
          </button>
          <button
            type="button"
            className={`view-tab-btn ${
              activeView === 'completed' ? 'active' : ''
            }`}
            onClick={() => setActiveView('completed')}
            data-testid="nav-view-completed"
          >
            🎉 Completed{' '}
            <span className="tab-badge" data-testid="badge-completed">
              {navCounts.completed}
            </span>
          </button>
          <button
            type="button"
            className={`view-tab-btn ${
              activeView === 'search' ? 'active' : ''
            }`}
            onClick={() => setActiveView('search')}
            data-testid="nav-view-search"
          >
            <Search size={14} /> Search
          </button>
        </nav>

        {/* Right Status Indicators & Settings */}
        <div className="topbar-status-actions">
          {/* Online / Offline Indicator */}
          <div
            className={`network-pill ${isOnline ? 'online' : 'offline'}`}
            data-testid="network-status-indicator"
            title={
              isOnline
                ? 'Connected — Everything is stored locally first'
                : 'Offline Mode — CozyBoard works 100% offline'
            }
          >
            {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
            <span>{isOnline ? 'Online' : 'Offline Mode'}</span>
          </div>

          {/* Saved Status Indicator */}
          <div
            className={`save-status-pill status-${saveStatus}`}
            data-testid="save-status-indicator"
            onClick={() => setIsSettingsOpen(true)}
            title="Click to open Local Storage & Backup details"
          >
            {saveStatus === 'saving' && (
              <>
                <Loader2 size={13} className="spin-icon" />
                <span>Saving...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <CheckCircle2 size={13} />
                <span>Saved locally</span>
              </>
            )}
            {saveStatus === 'offline-saved' && (
              <>
                <CheckCircle2 size={13} />
                <span>Saved offline</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertTriangle size={13} />
                <span>Storage Warning</span>
              </>
            )}
          </div>

          <button
            type="button"
            className="topbar-icon-btn"
            onClick={() =>
              handleUpdateSettings({ darkMode: !settings.darkMode })
            }
            title={
              settings.darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'
            }
            data-testid="header-theme-toggle"
            aria-label="Toggle color theme"
          >
            {settings.darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <button
            type="button"
            className="cozy-btn secondary compact"
            onClick={() => setIsSettingsOpen(true)}
            data-testid="open-settings-btn"
          >
            <Shield size={14} /> Backup & Style
          </button>
        </div>
      </header>

      {/* Main Content Area: Either Infinite Canvas or Synchronized Workspace View */}
      {activeView !== 'board' ? (
        <WorkspaceViews
          view={activeView}
          objects={objects}
          darkMode={settings.darkMode}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onUpdate={handleUpdateObject}
          onDelete={handleDeleteObject}
          onToggleTaskComplete={handleToggleTaskComplete}
          onConvertToTask={handleConvertStickyToTask}
          onFocusOnBoard={(obj) => {
            setActiveView('board');
            setBoard((prev) => ({
              ...prev,
              zoom: 1,
              panX: Math.round(viewportSize.width / 2 - obj.x - obj.width / 2),
              panY: Math.round(
                viewportSize.height / 2 - obj.y - obj.height / 2
              ),
            }));
            setSelectedIds([obj.id]);
          }}
          onQuickCreateTask={(title, priority, dueDate, color) => {
            createObjectAt('task', 220, 220, {
              title,
              priority,
              dueDate,
              color,
              status: 'todo',
              completed: false,
            });
          }}
          onQuickCreateSticky={(title, content, color) => {
            createObjectAt('sticky', 360, 240, {
              title,
              content,
              color,
            });
          }}
        />
      ) : (
        <main className="canvas-stage-wrapper">
          {/* Floating Left/Top Toolbar */}
          <aside
            className="floating-toolbar"
            aria-label="Board tools"
            data-testid="floating-toolbar"
          >
            <button
              type="button"
              className={`tool-btn ${activeTool === 'select' ? 'active' : ''}`}
              onClick={() => setActiveTool('select')}
              title="Select & Move (V)"
              data-testid="tool-select"
            >
              <MousePointer size={17} />
              <span>Select</span>
            </button>

            <button
              type="button"
              className={`tool-btn ${activeTool === 'hand' ? 'active' : ''}`}
              onClick={() => setActiveTool('hand')}
              title="Hand Pan Tool (Spacebar)"
              data-testid="tool-hand"
            >
              <Hand size={17} />
              <span>Pan</span>
            </button>

            <div className="toolbar-divider" />

            <button
              type="button"
              className={`tool-btn ${activeTool === 'sticky' ? 'active' : ''}`}
              onClick={() => {
                createObjectAt(
                  'sticky',
                  Math.round((-board.panX + 260) / board.zoom),
                  Math.round((-board.panY + 180) / board.zoom)
                );
              }}
              title="Add Sticky Idea Note"
              data-testid="tool-add-sticky"
            >
              <StickyNote size={17} />
              <span>Idea Note</span>
            </button>

            <button
              type="button"
              className={`tool-btn ${activeTool === 'task' ? 'active' : ''}`}
              onClick={() => {
                createObjectAt(
                  'task',
                  Math.round((-board.panX + 320) / board.zoom),
                  Math.round((-board.panY + 210) / board.zoom)
                );
              }}
              title="Add Task Card"
              data-testid="tool-add-task"
            >
              <CheckSquare size={17} />
              <span>Task Card</span>
            </button>

            <button
              type="button"
              className={`tool-btn ${
                activeTool === 'checklist' ? 'active' : ''
              }`}
              onClick={() => {
                createObjectAt(
                  'checklist',
                  Math.round((-board.panX + 360) / board.zoom),
                  Math.round((-board.panY + 250) / board.zoom)
                );
              }}
              title="Add Checklist"
              data-testid="tool-add-checklist"
            >
              <ListTodo size={17} />
              <span>Checklist</span>
            </button>

            <button
              type="button"
              className={`tool-btn ${activeTool === 'daily' ? 'active' : ''}`}
              onClick={() => {
                createObjectAt(
                  'daily',
                  Math.round((-board.panX + 410) / board.zoom),
                  Math.round((-board.panY + 260) / board.zoom)
                );
              }}
              title="Add Daily Reflection / Reminder"
              data-testid="tool-add-daily"
            >
              <BookHeart size={17} />
              <span>Daily</span>
            </button>

            <button
              type="button"
              className={`tool-btn ${activeTool === 'section' ? 'active' : ''}`}
              onClick={() => {
                createObjectAt(
                  'section',
                  Math.round((-board.panX + 180) / board.zoom),
                  Math.round((-board.panY + 140) / board.zoom)
                );
              }}
              title="Add Goal / Project Section Frame"
              data-testid="tool-add-section"
            >
              <LayoutTemplate size={17} />
              <span>Section</span>
            </button>

            <button
              type="button"
              className={`tool-btn ${activeTool === 'text' ? 'active' : ''}`}
              onClick={() => {
                createObjectAt(
                  'text',
                  Math.round((-board.panX + 340) / board.zoom),
                  Math.round((-board.panY + 160) / board.zoom)
                );
              }}
              title="Add Heading / Text Box"
              data-testid="tool-add-text"
            >
              <Type size={17} />
              <span>Text</span>
            </button>

            <button
              type="button"
              className={`tool-btn ${activeTool === 'shape' ? 'active' : ''}`}
              onClick={() => {
                createObjectAt(
                  'shape',
                  Math.round((-board.panX + 380) / board.zoom),
                  Math.round((-board.panY + 220) / board.zoom)
                );
              }}
              title="Add Shape"
              data-testid="tool-add-shape"
            >
              <Shapes size={17} />
              <span>Shape</span>
            </button>

            <button
              type="button"
              className={`tool-btn ${
                activeTool === 'connector' ? 'active' : ''
              }`}
              onClick={() => {
                setActiveTool(
                  activeTool === 'connector' ? 'select' : 'connector'
                );
                setConnectSourceId(null);
              }}
              title="Connect Two Cards (Click 1st card, then 2nd card)"
              data-testid="tool-connector"
            >
              <GitCommit size={17} />
              <span>Connect</span>
            </button>

            <div className="toolbar-divider" />

            <button
              type="button"
              className={`tool-btn ${activeTool === 'draw' ? 'active' : ''}`}
              onClick={() =>
                setActiveTool(activeTool === 'draw' ? 'select' : 'draw')
              }
              title="Freehand Draw Tool"
              data-testid="tool-draw"
            >
              <PenTool size={17} />
              <span>Draw</span>
            </button>

            <button
              type="button"
              className={`tool-btn ${activeTool === 'eraser' ? 'active' : ''}`}
              onClick={() =>
                setActiveTool(activeTool === 'eraser' ? 'select' : 'eraser')
              }
              title="Eraser Tool (Click or drag over drawings/cards)"
              data-testid="tool-eraser"
            >
              <Eraser size={17} />
              <span>Eraser</span>
            </button>

            <button
              type="button"
              className={`tool-btn ${showStickerTray ? 'active' : ''}`}
              onClick={() => setShowStickerTray(!showStickerTray)}
              title="Cute Stickers Drawer"
              data-testid="tool-stickers"
            >
              <Smile size={17} />
              <span>Stickers</span>
            </button>

            <div className="toolbar-divider" />

            <button
              type="button"
              className="tool-btn"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              title="Undo (Ctrl+Z)"
              data-testid="tool-undo"
            >
              <Undo2 size={17} />
              <span>Undo</span>
            </button>

            <button
              type="button"
              className="tool-btn"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title="Redo (Ctrl+Y)"
              data-testid="tool-redo"
            >
              <Redo2 size={17} />
              <span>Redo</span>
            </button>
          </aside>

          {/* Sub-Popover for Drawing Options */}
          {activeTool === 'draw' && (
            <div className="tool-subpopover" data-testid="draw-options-popover">
              <span>Ink:</span>
              {DRAW_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`color-dot ${
                    drawColor === c.value ? 'active' : ''
                  }`}
                  style={{ backgroundColor: c.value }}
                  onClick={() => setDrawColor(c.value)}
                  title={c.name}
                />
              ))}
              <input
                type="range"
                min={2}
                max={12}
                value={drawWidth}
                onChange={(e) => setDrawWidth(Number(e.target.value))}
                title="Brush thickness"
              />
            </div>
          )}

          {/* Sub-Popover for Cute Stickers */}
          {showStickerTray && (
            <div className="sticker-tray-popover" data-testid="sticker-tray">
              {STICKERS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="sticker-pick-btn"
                  onClick={() => {
                    createObjectAt(
                      'sticker',
                      Math.round((-board.panX + 420) / board.zoom),
                      Math.round((-board.panY + 220) / board.zoom),
                      {
                        title: s.label,
                        content: s.emoji,
                        stickerId: s.id,
                      }
                    );
                    setShowStickerTray(false);
                  }}
                  title={`${s.label} — ${s.desc}`}
                  data-testid={`pick-sticker-${s.id}`}
                >
                  <span>{s.emoji}</span>
                </button>
              ))}
            </div>
          )}

          {/* Multi-Selection Action Pill */}
          {selectedIds.length > 1 && (
            <div className="multi-select-bar" data-testid="multi-select-bar">
              <span>{selectedIds.length} selected</span>
              <button
                type="button"
                className="mini-pill-btn"
                onClick={handleGroupSelected}
                data-testid="group-selected-btn"
              >
                <Link size={12} /> Group
              </button>
              <button
                type="button"
                className="mini-pill-btn"
                onClick={handleUngroupSelected}
                data-testid="ungroup-selected-btn"
              >
                <Unlink size={12} /> Ungroup
              </button>
              <button
                type="button"
                className="mini-pill-btn danger"
                onClick={handleDeleteSelected}
                data-testid="delete-selected-btn"
              >
                <Trash2 size={12} /> Delete All
              </button>
            </div>
          )}

          {/* Connector Guidance Banner */}
          {(activeTool === 'connector' || connectSourceId) && (
            <div className="connector-hint-banner">
              🔗{' '}
              {connectSourceId
                ? 'Now click the second card to connect them with an arrow!'
                : 'Click the first card you want to connect...'}
              <button
                type="button"
                className="mini-pill-btn"
                onClick={() => {
                  setConnectSourceId(null);
                  setActiveTool('select');
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Cozy Focus Timer Widget */}
          <FocusTimerWidget onCompleteSession={() => triggerCelebration()} />

          {/* Infinite Interactive Canvas Surface */}
          <div
            ref={canvasRef}
            className={`infinite-canvas-viewport bg-${settings.backgroundPattern} tool-cursor-${activeTool}`}
            onPointerDown={handleCanvasPointerDown}
            onWheel={handleCanvasWheel}
            data-testid="infinite-canvas"
            style={{
              backgroundPosition: `${board.panX}px ${board.panY}px`,
            }}
          >
            <FloatingBackdropDecorations
              show={settings.showDecorations}
              reducedMotion={settings.reducedMotion}
            />

            {/* Empty Board State with Mascot Mochi */}
            {objects.length === 0 && (
              <EmptyBoardState
                reducedMotion={settings.reducedMotion}
                onAddSticky={() => createObjectAt('sticky', 280, 180)}
                onAddTask={() => createObjectAt('task', 320, 200)}
                onLoadStarter={() => {
                  const starter = createStarterObjects(board.id);
                  pushUndoSnapshot(objects);
                  setObjects(starter);
                }}
              />
            )}

            {/* Transformed World Plane */}
            <div
              className="canvas-world-plane"
              data-testid="canvas-world-plane"
              style={{
                transform: `translate(${board.panX}px, ${board.panY}px) scale(${board.zoom})`,
              }}
            >
              {/* SVG Layer for Connectors and Freehand Drawings */}
              <svg
                className="canvas-svg-layer"
                width="6000"
                height="4500"
                viewBox="-1500 -1000 6000 4500"
                style={{
                  left: -1500,
                  top: -1000,
                }}
              >
                <defs>
                  <marker
                    id="cozy-arrowhead"
                    markerWidth="10"
                    markerHeight="8"
                    refX="8"
                    refY="4"
                    orient="auto"
                  >
                    <path d="M0,0 L10,4 L0,8 Z" fill="#8B5CF6" />
                  </marker>
                </defs>

                {/* Render Connectors between objects */}
                {connectors.map((conn) => {
                  const fromObj = objects.find((o) => o.id === conn.fromId);
                  const toObj = objects.find((o) => o.id === conn.toId);
                  if (!fromObj || !toObj) return null;

                  const x1 = fromObj.x + fromObj.width / 2;
                  const y1 = fromObj.y + fromObj.height / 2;
                  const x2 = toObj.x + toObj.width / 2;
                  const y2 = toObj.y + toObj.height / 2;
                  const midX = (x1 + x2) / 2;
                  const midY = (y1 + y2) / 2 - 22;

                  return (
                    <g
                      key={conn.id}
                      className="connector-group"
                      data-testid={`connector-${conn.id}`}
                      style={{
                        pointerEvents: 'stroke',
                        cursor: 'pointer',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeTool === 'eraser') {
                          handleDeleteObject(conn.id);
                        }
                      }}
                    >
                      <path
                        d={`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`}
                        fill="none"
                        stroke="#8B5CF6"
                        strokeWidth={2.8}
                        strokeDasharray={
                          conn.connectorStyle === 'dashed' ? '7 5' : undefined
                        }
                        markerEnd="url(#cozy-arrowhead)"
                      />
                      {conn.title && (
                        <text
                          x={midX}
                          y={midY - 4}
                          textAnchor="middle"
                          fill="#7C3AED"
                          fontSize="11"
                          fontWeight="600"
                        >
                          {conn.title}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Render Freehand Drawings */}
                {drawings.map((d) => {
                  const pts = d.points || [];
                  if (pts.length === 0) return null;
                  const pathData =
                    pts.length === 1
                      ? `M ${pts[0].x} ${pts[0].y} l 0.5 0.5`
                      : pts
                          .map((p, idx) =>
                            idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
                          )
                          .join(' ');
                  return (
                    <path
                      key={d.id}
                      d={pathData}
                      fill="none"
                      stroke={d.strokeColor || '#4C1D95'}
                      strokeWidth={d.strokeWidth || 4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      data-testid={`drawing-${d.id}`}
                      style={{
                        pointerEvents:
                          activeTool === 'eraser' ? 'stroke' : 'none',
                        cursor:
                          activeTool === 'eraser' ? 'pointer' : 'default',
                      }}
                      onClick={(e) => {
                        if (activeTool === 'eraser') {
                          e.stopPropagation();
                          handleDeleteObject(d.id);
                        }
                      }}
                    />
                  );
                })}
              </svg>

              {/* Render All Card Objects */}
              {cardObjects.map((obj) => (
                <CanvasCard
                  key={obj.id}
                  obj={obj}
                  isSelected={selectedIds.includes(obj.id)}
                  isConnectSource={connectSourceId === obj.id}
                  darkMode={settings.darkMode}
                  reducedMotion={settings.reducedMotion}
                  onSelect={handleSelectObject}
                  onStartDrag={handleStartDragObject}
                  onStartResize={handleStartResizeObject}
                  onUpdate={handleUpdateObject}
                  onDelete={handleDeleteObject}
                  onDuplicate={handleDuplicateObject}
                  onConvertToTask={handleConvertStickyToTask}
                  onToggleTaskComplete={handleToggleTaskComplete}
                  onStartConnectFrom={handleStartConnectFrom}
                />
              ))}

              {/* Marquee Multi-Select Box */}
              {marqueeBox && (
                <div
                  className="marquee-selection-box"
                  style={{
                    transform: `translate(${marqueeBox.x}px, ${marqueeBox.y}px)`,
                    width: marqueeBox.width,
                    height: marqueeBox.height,
                  }}
                />
              )}
            </div>

            {/* CompanionMascot Corner Widget */}
            {settings.showDecorations && (
              <CompanionCornerWidget
                quoteIndex={settings.quoteIndex}
                onNextQuote={() =>
                  handleUpdateSettings({
                    quoteIndex: settings.quoteIndex + 1,
                  })
                }
                reducedMotion={settings.reducedMotion}
                onQuickAddTask={() => createObjectAt('task', 300, 220)}
                onQuickAddSticky={() => createObjectAt('sticky', 340, 240)}
              />
            )}

            {/* Minimap & Zoom Navigation Dock */}
            <Minimap
              objects={objects}
              panX={board.panX}
              panY={board.panY}
              zoom={board.zoom}
              viewportWidth={viewportSize.width}
              viewportHeight={viewportSize.height}
              onZoomIn={() =>
                setBoard((prev) => ({
                  ...prev,
                  zoom: Math.min(2.5, +(prev.zoom + 0.15).toFixed(2)),
                }))
              }
              onZoomOut={() =>
                setBoard((prev) => ({
                  ...prev,
                  zoom: Math.max(0.25, +(prev.zoom - 0.15).toFixed(2)),
                }))
              }
              onResetView={() =>
                setBoard((prev) => ({
                  ...prev,
                  panX: 40,
                  panY: 20,
                  zoom: 1,
                }))
              }
              onJumpToWorld={(worldX, worldY) =>
                setBoard((prev) => ({
                  ...prev,
                  panX: Math.round(viewportSize.width / 2 - worldX * prev.zoom),
                  panY: Math.round(
                    viewportSize.height / 2 - worldY * prev.zoom
                  ),
                }))
              }
            />
          </div>
        </main>
      )}

      {/* Offline Storage, Backup & Cozy Settings Modal */}
      <DataSafetyModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        storageInfo={storageInfo}
        storageError={storageError}
        onExportBackup={handleExportBackup}
        onImportBackupJson={handleImportBackupJson}
        onClearBoard={() => {
          pushUndoSnapshot(objects);
          setObjects([]);
          setSelectedIds([]);
        }}
        onLoadStarterTemplate={() => {
          pushUndoSnapshot(objects);
          setObjects(createStarterObjects(board.id));
        }}
        onGenerateManyObjects={handleGenerateManyObjects}
      />
    </div>
  );
};

export default App;
