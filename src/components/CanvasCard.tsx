import React, { useState } from 'react';
import {
  Check,
  Sparkles,
  Trash2,
  Copy,
  Calendar,
  AlertCircle,
  Tag,
  Plus,
  Link2,
  ArrowRightCircle,
  Clock,
} from 'lucide-react';
import {
  CanvasObject,
  PastelColor,
  TaskPriority,
  TaskStatus,
} from '../types';
import {
  PASTEL_PALETTE,
  isTaskDueToday,
  isTaskOverdue,
} from '../constants';

interface CanvasCardProps {
  obj: CanvasObject;
  isSelected: boolean;
  isConnectSource: boolean;
  darkMode: boolean;
  reducedMotion: boolean;
  onSelect: (e: React.MouseEvent | React.PointerEvent, id: string) => void;
  onStartDrag: (e: React.PointerEvent, id: string) => void;
  onStartResize: (e: React.PointerEvent, id: string) => void;
  onUpdate: (id: string, patch: Partial<CanvasObject>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onConvertToTask: (id: string) => void;
  onToggleTaskComplete: (
    id: string,
    clientX?: number,
    clientY?: number
  ) => void;
  onStartConnectFrom: (id: string) => void;
}

const COLOR_KEYS: PastelColor[] = [
  'cream',
  'lavender',
  'blue',
  'pink',
  'mint',
  'peach',
  'butter',
];

export const CanvasCard: React.FC<CanvasCardProps> = ({
  obj,
  isSelected,
  isConnectSource,
  darkMode,
  reducedMotion,
  onSelect,
  onStartDrag,
  onStartResize,
  onUpdate,
  onDelete,
  onDuplicate,
  onConvertToTask,
  onToggleTaskComplete,
  onStartConnectFrom,
}) => {
  const [newTag, setNewTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [newCheckItem, setNewCheckItem] = useState('');

  const palette = PASTEL_PALETTE[obj.color] || PASTEL_PALETTE.cream;
  const bg = darkMode ? palette.bgDark : palette.bgLight;
  const border = darkMode ? palette.borderDark : palette.borderLight;
  const accent = darkMode ? palette.accentDark : palette.accentLight;

  const overdue = isTaskOverdue(obj);
  const dueToday = isTaskDueToday(obj);

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newTag.trim().toLowerCase();
    if (!cleaned) return;
    if (!obj.tags.includes(cleaned)) {
      onUpdate(obj.id, { tags: [...obj.tags, cleaned] });
    }
    setNewTag('');
    setShowTagInput(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdate(obj.id, {
      tags: obj.tags.filter((t) => t !== tagToRemove),
    });
  };

  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    const text = newCheckItem.trim();
    if (!text) return;
    const list = obj.checklist || [];
    onUpdate(obj.id, {
      checklist: [
        ...list,
        { id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text, done: false },
      ],
    });
    setNewCheckItem('');
  };

  // Sticker rendering
  if (obj.type === 'sticker') {
    return (
      <div
        className={`canvas-object sticker-object ${isSelected ? 'selected' : ''} ${
          !reducedMotion ? 'gentle-hover' : ''
        }`}
        style={{
          transform: `translate(${obj.x}px, ${obj.y}px)`,
          width: obj.width,
          height: obj.height,
          zIndex: obj.zIndex,
        }}
        data-testid={`canvas-object-${obj.id}`}
        data-object-type="sticker"
        onPointerDown={(e) => {
          onSelect(e, obj.id);
          onStartDrag(e, obj.id);
        }}
      >
        <div className="sticker-emoji" style={{ fontSize: Math.min(obj.width, obj.height) * 0.68 }}>
          {obj.content || '✨'}
        </div>
        {isSelected && (
          <div
            className="object-Floating-actions"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="mini-icon-btn danger"
              onClick={() => onDelete(obj.id)}
              title="Delete sticker"
              aria-label="Delete object"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
        {isSelected && (
          <div
            className="resize-handle"
            data-testid={`resize-handle-${obj.id}`}
            onPointerDown={(e) => {
              e.stopPropagation();
              onStartResize(e, obj.id);
            }}
          />
        )}
      </div>
    );
  }

  // Section / Goal Frame rendering
  if (obj.type === 'section') {
    return (
      <div
        className={`canvas-object section-object ${isSelected ? 'selected' : ''}`}
        style={{
          transform: `translate(${obj.x}px, ${obj.y}px)`,
          width: obj.width,
          height: obj.height,
          zIndex: obj.zIndex,
          borderColor: border,
          backgroundColor: darkMode
            ? `${palette.bgDark}99`
            : `${palette.bgLight}B8`,
        }}
        data-testid={`canvas-object-${obj.id}`}
        data-object-type="section"
        onPointerDown={(e) => {
          onSelect(e, obj.id);
        }}
      >
        <div
          className="section-header-bar"
          style={{ borderBottomColor: border }}
          onPointerDown={(e) => {
            onSelect(e, obj.id);
            onStartDrag(e, obj.id);
          }}
        >
          <input
            type="text"
            className="section-title-input"
            value={obj.title}
            onChange={(e) => onUpdate(obj.id, { title: e.target.value })}
            placeholder="Section / Goal Title..."
            onPointerDown={(e) => e.stopPropagation()}
          />
          <div
            className="card-quick-tools"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="color-dots-row">
              {COLOR_KEYS.slice(0, 5).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-dot ${obj.color === c ? 'active' : ''}`}
                  style={{ backgroundColor: PASTEL_PALETTE[c].hex }}
                  onClick={() => onUpdate(obj.id, { color: c })}
                  title={`Color: ${c}`}
                />
              ))}
            </div>
            <button
              type="button"
              className="mini-icon-btn danger"
              onClick={() => onDelete(obj.id)}
              title="Delete section"
              aria-label="Delete object"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
        <div className="section-subtitle-area">
          <input
            type="text"
            className="section-subtitle-input"
            value={obj.content}
            onChange={(e) => onUpdate(obj.id, { content: e.target.value })}
            placeholder="Optional goal note or area description..."
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
        <div
          className="resize-handle"
          data-testid={`resize-handle-${obj.id}`}
          onPointerDown={(e) => {
            e.stopPropagation();
            onStartResize(e, obj.id);
          }}
        />
      </div>
    );
  }

  // Text / Heading object
  if (obj.type === 'text') {
    return (
      <div
        className={`canvas-object text-object ${isSelected ? 'selected' : ''}`}
        style={{
          transform: `translate(${obj.x}px, ${obj.y}px)`,
          width: obj.width,
          minHeight: obj.height,
          zIndex: obj.zIndex,
        }}
        data-testid={`canvas-object-${obj.id}`}
        data-object-type="text"
        onPointerDown={(e) => {
          onSelect(e, obj.id);
          onStartDrag(e, obj.id);
        }}
      >
        <div className="text-drag-grip">⋮⋮ Text</div>
        <textarea
          className={`canvas-text-input ${obj.isHeading ? 'is-heading' : ''}`}
          value={obj.title}
          onChange={(e) => onUpdate(obj.id, { title: e.target.value })}
          placeholder="Type heading or note..."
          onPointerDown={(e) => e.stopPropagation()}
        />
        {isSelected && (
          <div
            className="object-Floating-actions"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="mini-pill-btn"
              onClick={() => onUpdate(obj.id, { isHeading: !obj.isHeading })}
            >
              {obj.isHeading ? 'H1 Heading' : 'Body Text'}
            </button>
            <button
              type="button"
              className="mini-icon-btn danger"
              onClick={() => onDelete(obj.id)}
              aria-label="Delete object"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
        <div
          className="resize-handle"
          data-testid={`resize-handle-${obj.id}`}
          onPointerDown={(e) => {
            e.stopPropagation();
            onStartResize(e, obj.id);
          }}
        />
      </div>
    );
  }

  // Shape object (Rectangle, Circle, Diamond, Pill)
  if (obj.type === 'shape') {
    const kind = obj.shapeKind || 'rectangle';
    return (
      <div
        className={`canvas-object shape-object shape-${kind} ${
          isSelected ? 'selected' : ''
        }`}
        style={{
          transform: `translate(${obj.x}px, ${obj.y}px)`,
          width: obj.width,
          height: obj.height,
          zIndex: obj.zIndex,
          backgroundColor: bg,
          borderColor: accent,
        }}
        data-testid={`canvas-object-${obj.id}`}
        data-object-type="shape"
        onPointerDown={(e) => {
          onSelect(e, obj.id);
          onStartDrag(e, obj.id);
        }}
      >
        <textarea
          className="shape-text-input"
          value={obj.title}
          onChange={(e) => onUpdate(obj.id, { title: e.target.value })}
          placeholder="Label..."
          onPointerDown={(e) => e.stopPropagation()}
        />
        {isSelected && (
          <div
            className="object-Floating-actions"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {(['rectangle', 'circle', 'pill', 'diamond'] as const).map((sk) => (
              <button
                key={sk}
                type="button"
                className={`mini-pill-btn ${kind === sk ? 'active' : ''}`}
                onClick={() => onUpdate(obj.id, { shapeKind: sk })}
              >
                {sk}
              </button>
            ))}
            <button
              type="button"
              className="mini-icon-btn"
              onClick={() => onStartConnectFrom(obj.id)}
              title="Connect with arrow"
            >
              <Link2 size={13} />
            </button>
            <button
              type="button"
              className="mini-icon-btn danger"
              onClick={() => onDelete(obj.id)}
              aria-label="Delete object"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
        <div
          className="resize-handle"
          data-testid={`resize-handle-${obj.id}`}
          onPointerDown={(e) => {
            e.stopPropagation();
            onStartResize(e, obj.id);
          }}
        />
      </div>
    );
  }

  // Standard Card Objects: Sticky Note, Task Card, Checklist, Daily Note
  const checklist = obj.checklist || [];
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div
      className={`canvas-object cozy-card type-${obj.type} ${
        isSelected ? 'selected' : ''
      } ${isConnectSource ? 'connect-source' : ''} ${
        obj.completed ? 'is-completed' : ''
      } ${overdue ? 'is-overdue' : ''} ${!reducedMotion ? 'card-pop-in' : ''}`}
      style={{
        transform: `translate(${obj.x}px, ${obj.y}px)`,
        width: obj.width,
        minHeight: obj.height,
        zIndex: obj.zIndex,
        backgroundColor: bg,
        borderColor: overdue ? '#F43F5E' : border,
      }}
      data-testid={`canvas-object-${obj.id}`}
      data-object-type={obj.type}
      onPointerDown={(e) => {
        onSelect(e, obj.id);
      }}
    >
      {/* Top Drag Header & Quick Controls */}
      <div
        className="cozy-card-header"
        onPointerDown={(e) => {
          onSelect(e, obj.id);
          onStartDrag(e, obj.id);
        }}
      >
        <div className="card-type-badge" style={{ color: accent }}>
          {obj.type === 'task' && '✅ Task'}
          {obj.type === 'sticky' && '💡 Idea Note'}
          {obj.type === 'checklist' && `📋 List (${doneCount}/${checklist.length})`}
          {obj.type === 'daily' && '🌸 Daily Note'}
          {obj.groupId && <span className="group-pill">🔗 Grouped</span>}
        </div>

        <div
          className="card-quick-tools"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="color-dots-row">
            {COLOR_KEYS.map((c) => (
              <button
                key={c}
                type="button"
                className={`color-dot ${obj.color === c ? 'active' : ''}`}
                style={{ backgroundColor: PASTEL_PALETTE[c].hex }}
                onClick={() => onUpdate(obj.id, { color: c })}
                title={PASTEL_PALETTE[c].label}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>

          <button
            type="button"
            className="mini-icon-btn"
            onClick={() => onStartConnectFrom(obj.id)}
            title="Connect to another card"
            aria-label="Connect card"
          >
            <Link2 size={13} />
          </button>
          <button
            type="button"
            className="mini-icon-btn"
            onClick={() => onDuplicate(obj.id)}
            title="Duplicate card (Ctrl+D)"
            aria-label="Duplicate object"
          >
            <Copy size={13} />
          </button>
          <button
            type="button"
            className="mini-icon-btn danger"
            onClick={() => onDelete(obj.id)}
            title="Delete card (Del)"
            aria-label="Delete object"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Card Title Row (with Checkbox if Task) */}
      <div
        className="cozy-card-title-row"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {obj.type === 'task' && (
          <button
            type="button"
            className={`task-check-btn ${obj.completed ? 'checked' : ''}`}
            data-testid={`task-checkbox-${obj.id}`}
            onClick={(e) =>
              onToggleTaskComplete(obj.id, e.clientX, e.clientY)
            }
            title={obj.completed ? 'Mark as unfinished' : 'Complete task!'}
            aria-label="Toggle task completion"
          >
            {obj.completed && <Check size={14} strokeWidth={3} />}
          </button>
        )}

        <input
          type="text"
          className={`cozy-title-input ${obj.completed ? 'line-through' : ''}`}
          data-testid={`object-title-${obj.id}`}
          value={obj.title}
          onChange={(e) => onUpdate(obj.id, { title: e.target.value })}
          placeholder={
            obj.type === 'task'
              ? 'Task title...'
              : obj.type === 'sticky'
              ? 'Quick idea title...'
              : 'Note title...'
          }
        />
      </div>

      {/* Task Metadata Bar: Status, Priority, Due Date, Overdue Indicator */}
      {obj.type === 'task' && (
        <div
          className="task-meta-bar"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <select
            className={`cozy-select status-${obj.status || 'todo'}`}
            data-testid={`task-status-${obj.id}`}
            value={obj.status || 'todo'}
            onChange={(e) => {
              const nextStatus = e.target.value as TaskStatus;
              if (nextStatus === 'done' && !obj.completed) {
                onToggleTaskComplete(obj.id);
              } else {
                onUpdate(obj.id, {
                  status: nextStatus,
                  completed: nextStatus === 'done',
                  completedAt:
                    nextStatus === 'done' ? Date.now() : undefined,
                });
              }
            }}
            aria-label="Task status"
          >
            <option value="todo">📌 To Do</option>
            <option value="in-progress">✨ In Progress</option>
            <option value="waiting">⏳ Waiting</option>
            <option value="done">🌸 Done</option>
          </select>

          <select
            className={`cozy-select priority-${obj.priority || 'medium'}`}
            data-testid={`task-priority-${obj.id}`}
            value={obj.priority || 'medium'}
            onChange={(e) =>
              onUpdate(obj.id, { priority: e.target.value as TaskPriority })
            }
            aria-label="Task priority"
          >
            <option value="low">🌿 Low</option>
            <option value="medium">🌼 Med</option>
            <option value="high">🔥 High</option>
          </select>

          <label className="due-date-pill" title="Set optional due date">
            <Calendar size={12} />
            <input
              type="date"
              className="cozy-date-input"
              data-testid={`task-duedate-${obj.id}`}
              value={obj.dueDate || ''}
              onChange={(e) => onUpdate(obj.id, { dueDate: e.target.value })}
              aria-label="Due date"
            />
          </label>

          {overdue && (
            <span
              className="overdue-badge"
              data-testid={`overdue-badge-${obj.id}`}
              title="This task is past its due date!"
            >
              <AlertCircle size={12} /> Overdue
            </span>
          )}
          {!overdue && dueToday && !obj.completed && (
            <span className="today-badge" title="Due today!">
              🌟 Today
            </span>
          )}
        </div>
      )}

      {/* Daily Note Mood & Reminder Bar */}
      {obj.type === 'daily' && (
        <div
          className="task-meta-bar"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <select
            className="cozy-select"
            value={obj.mood || '🌸 Cozy & Focused'}
            onChange={(e) => onUpdate(obj.id, { mood: e.target.value })}
          >
            <option value="🌸 Cozy & Focused">🌸 Cozy & Focused</option>
            <option value="🍵 Gentle & Calm">🍵 Gentle & Calm</option>
            <option value="✨ Inspired & Creative">✨ Inspired & Creative</option>
            <option value="🌧️ Low Battery Day">🌧️ Low Battery Day</option>
          </select>

          <label className="due-date-pill" title="Reminder time">
            <Clock size={12} />
            <input
              type="time"
              className="cozy-date-input"
              value={obj.reminderTime || ''}
              onChange={(e) =>
                onUpdate(obj.id, { reminderTime: e.target.value })
              }
            />
          </label>
        </div>
      )}

      {/* Body Content or Checklist Items */}
      <div
        className="cozy-card-body"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {obj.type === 'checklist' ? (
          <div className="checklist-container">
            {checklist.length > 0 && (
              <div className="checklist-progress-track">
                <div
                  className="checklist-progress-fill"
                  style={{
                    width: `${Math.round(
                      (doneCount / Math.max(checklist.length, 1)) * 100
                    )}%`,
                    backgroundColor: accent,
                  }}
                />
              </div>
            )}
            <ul className="checklist-items">
              {checklist.map((item) => (
                <li key={item.id} className="checklist-row">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => {
                      const updated = checklist.map((c) =>
                        c.id === item.id ? { ...c, done: !c.done } : c
                      );
                      onUpdate(obj.id, { checklist: updated });
                    }}
                  />
                  <input
                    type="text"
                    className={`checklist-text-input ${
                      item.done ? 'line-through' : ''
                    }`}
                    value={item.text}
                    onChange={(e) => {
                      const updated = checklist.map((c) =>
                        c.id === item.id ? { ...c, text: e.target.value } : c
                      );
                      onUpdate(obj.id, { checklist: updated });
                    }}
                  />
                  <button
                    type="button"
                    className="checklist-remove-btn"
                    onClick={() =>
                      onUpdate(obj.id, {
                        checklist: checklist.filter((c) => c.id !== item.id),
                      })
                    }
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <form onSubmit={handleAddChecklistItem} className="checklist-add-form">
              <input
                type="text"
                placeholder="+ Add checklist item..."
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
              />
              <button type="submit" className="mini-icon-btn">
                <Plus size={13} />
              </button>
            </form>
          </div>
        ) : (
          <textarea
            className="cozy-body-textarea"
            data-testid={`object-content-${obj.id}`}
            value={obj.content}
            onChange={(e) => onUpdate(obj.id, { content: e.target.value })}
            placeholder={
              obj.type === 'task'
                ? 'Optional task details, steps, or links...'
                : 'Jot down your thoughts freely...'
            }
          />
        )}
      </div>

      {/* Footer: Tags + Convert Sticky to Task Button */}
      <div
        className="cozy-card-footer"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="tags-wrap">
          {obj.tags.map((t) => (
            <span key={t} className="cozy-tag-pill">
              #{t}
              <button
                type="button"
                className="tag-remove-x"
                onClick={() => handleRemoveTag(t)}
                title={`Remove #${t}`}
              >
                ×
              </button>
            </span>
          ))}
          {showTagInput ? (
            <form onSubmit={handleAddTag} className="inline-tag-form">
              <input
                type="text"
                className="inline-tag-input"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="tag..."
                autoFocus
                onBlur={() => setShowTagInput(false)}
              />
            </form>
          ) : (
            <button
              type="button"
              className="add-tag-btn"
              onClick={() => setShowTagInput(true)}
              title="Add tag"
            >
              <Tag size={11} /> +tag
            </button>
          )}
        </div>

        {obj.type === 'sticky' && (
          <button
            type="button"
            className="convert-task-btn"
            data-testid={`convert-to-task-${obj.id}`}
            onClick={() => onConvertToTask(obj.id)}
            title="Turn this sticky note into an actionable Task Card"
          >
            <ArrowRightCircle size={13} /> To Task
          </button>
        )}
      </div>

      {/* Resize Handle */}
      <div
        className="resize-handle"
        data-testid={`resize-handle-${obj.id}`}
        title="Drag to resize"
        onPointerDown={(e) => {
          e.stopPropagation();
          onStartResize(e, obj.id);
        }}
      />
    </div>
  );
};
