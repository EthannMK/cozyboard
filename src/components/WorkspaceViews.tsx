import React, { useMemo, useState } from 'react';
import {
  Search,
  Check,
  Plus,
  Sparkles,
  Calendar,
  AlertCircle,
  ArrowRightCircle,
  Compass,
  Trash2,
  Filter,
  Tag,
} from 'lucide-react';
import {
  CanvasObject,
  PastelColor,
  TaskPriority,
  TaskStatus,
  WorkspaceView,
} from '../types';
import {
  PASTEL_PALETTE,
  getTodayISO,
  isTaskDueToday,
  isTaskOverdue,
} from '../constants';

interface WorkspaceViewsProps {
  view: WorkspaceView;
  objects: CanvasObject[];
  darkMode: boolean;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onUpdate: (id: string, patch: Partial<CanvasObject>) => void;
  onDelete: (id: string) => void;
  onToggleTaskComplete: (
    id: string,
    clientX?: number,
    clientY?: number
  ) => void;
  onConvertToTask: (id: string) => void;
  onFocusOnBoard: (obj: CanvasObject) => void;
  onQuickCreateTask: (
    title: string,
    priority: TaskPriority,
    dueDate: string,
    color: PastelColor
  ) => void;
  onQuickCreateSticky: (title: string, content: string, color: PastelColor) => void;
}

export const WorkspaceViews: React.FC<WorkspaceViewsProps> = ({
  view,
  objects,
  darkMode,
  searchQuery,
  onSearchQueryChange,
  onUpdate,
  onDelete,
  onToggleTaskComplete,
  onConvertToTask,
  onFocusOnBoard,
  onQuickCreateTask,
  onQuickCreateSticky,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [dueFilter, setDueFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');

  // Quick-add form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [newTaskDue, setNewTaskDue] = useState(
    view === 'today' ? getTodayISO() : ''
  );
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [newIdeaContent, setNewIdeaContent] = useState('');

  // Collect all unique tags across the board
  const allTags = useMemo(() => {
    const set = new Set<string>();
    objects.forEach((o) => (o.tags || []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [objects]);

  // Filter objects based on active view + search query + filters
  const filteredObjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return objects.filter((obj) => {
      if (obj.type === 'drawing' || obj.type === 'connector') return false;

      // View-specific base filter
      if (view === 'pending') {
        if (obj.type !== 'task') return false;
        if (obj.completed || obj.status === 'done') return false;
      } else if (view === 'today') {
        const isTodayOrOverdueTask =
          obj.type === 'task' &&
          !obj.completed &&
          (isTaskDueToday(obj) ||
            isTaskOverdue(obj) ||
            obj.priority === 'high');
        const isDailyNote = obj.type === 'daily';
        if (!isTodayOrOverdueTask && !isDailyNote) return false;
      } else if (view === 'ideas') {
        if (obj.type !== 'sticky') return false;
      } else if (view === 'completed') {
        if (obj.type !== 'task') return false;
        if (!obj.completed && obj.status !== 'done') return false;
      }

      // Status filter
      if (statusFilter !== 'all' && obj.type === 'task') {
        if ((obj.status || 'todo') !== statusFilter) return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && obj.type === 'task') {
        if ((obj.priority || 'medium') !== priorityFilter) return false;
      }

      // Due date filter
      if (dueFilter !== 'all' && obj.type === 'task') {
        if (dueFilter === 'overdue' && !isTaskOverdue(obj)) return false;
        if (dueFilter === 'today' && !isTaskDueToday(obj)) return false;
        if (dueFilter === 'has-date' && !obj.dueDate) return false;
      }

      // Tag filter
      if (tagFilter !== 'all') {
        if (!obj.tags || !obj.tags.includes(tagFilter)) return false;
      }

      // Text search across title, content, tags, and checklist items
      if (q) {
        const inTitle = (obj.title || '').toLowerCase().includes(q);
        const inContent = (obj.content || '').toLowerCase().includes(q);
        const inTags = (obj.tags || []).some((t) =>
          t.toLowerCase().includes(q)
        );
        const inChecklist = (obj.checklist || []).some((c) =>
          c.text.toLowerCase().includes(q)
        );
        if (!inTitle && !inContent && !inTags && !inChecklist) return false;
      }

      return true;
    });
  }, [
    objects,
    view,
    searchQuery,
    statusFilter,
    priorityFilter,
    dueFilter,
    tagFilter,
  ]);

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onQuickCreateTask(
      newTaskTitle.trim(),
      newTaskPriority,
      newTaskDue || (view === 'today' ? getTodayISO() : ''),
      'pink'
    );
    setNewTaskTitle('');
  };

  const handleAddIdeaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIdeaTitle.trim() && !newIdeaContent.trim()) return;
    onQuickCreateSticky(
      newIdeaTitle.trim() || '✨ New Idea',
      newIdeaContent.trim(),
      'butter'
    );
    setNewIdeaTitle('');
    setNewIdeaContent('');
  };

  const viewHeaderInfo: Record<
    Exclude<WorkspaceView, 'board'>,
    { title: string; subtitle: string; icon: string }
  > = {
    pending: {
      title: 'Pending Tasks',
      subtitle:
        'All your unfinished tasks across the canvas, organized without rigid stress.',
      icon: '📌',
    },
    today: {
      title: 'Today & Focus',
      subtitle:
        'Tasks due today, overdue items, high-priority goals, and your daily reflection notes.',
      icon: '🌟',
    },
    ideas: {
      title: 'Idea Garden',
      subtitle:
        'A searchable collection of your sticky notes and random sparks. Turn any idea into a task!',
      icon: '💡',
    },
    completed: {
      title: 'Completed Wins',
      subtitle:
        'Every finished task deserves a little celebration. Look at all you have accomplished!',
      icon: '🎉',
    },
    search: {
      title: 'Search & Filter Everything',
      subtitle:
        'Instantly find tasks, sticky notes, checklists, sections, and tags—100% offline.',
      icon: '🔍',
    },
  };

  const info =
    viewHeaderInfo[view as Exclude<WorkspaceView, 'board'>] ||
    viewHeaderInfo.search;

  return (
    <div className="workspace-view-panel" data-testid={`view-${view}`}>
      <div className="view-hero-header">
        <div>
          <h2>
            <span className="view-emoji">{info.icon}</span> {info.title}
          </h2>
          <p>{info.subtitle}</p>
        </div>
        <div className="view-count-pill" data-testid="view-item-count">
          {filteredObjects.length}{' '}
          {filteredObjects.length === 1 ? 'item' : 'items'}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="view-filters-bar">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search titles, notes, checklists, or #tags..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            data-testid="workspace-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => onSearchQueryChange('')}
            >
              ×
            </button>
          )}
        </div>

        <div className="filter-selects-group">
          <span className="filter-label">
            <Filter size={13} /> Filters:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            data-testid="filter-status"
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="waiting">Waiting</option>
            <option value="done">Done</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            data-testid="filter-priority"
            aria-label="Filter by priority"
          >
            <option value="all">All Priorities</option>
            <option value="high">🔥 High Priority</option>
            <option value="medium">🌼 Medium Priority</option>
            <option value="low">🌿 Low Priority</option>
          </select>

          <select
            value={dueFilter}
            onChange={(e) => setDueFilter(e.target.value)}
            data-testid="filter-due"
            aria-label="Filter by due date"
          >
            <option value="all">Any Due Date</option>
            <option value="overdue">⚠️ Overdue</option>
            <option value="today">🌟 Due Today</option>
            <option value="has-date">📅 Has Due Date</option>
          </select>

          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            data-testid="filter-tag"
            aria-label="Filter by tag"
          >
            <option value="all">All Tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                #{t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Create Bar inside Views */}
      {(view === 'pending' || view === 'today') && (
        <form
          className="view-quick-create-form"
          onSubmit={handleAddTaskSubmit}
          data-testid="view-quick-add-task-form"
        >
          <input
            type="text"
            placeholder="✨ Add a new task directly to your board..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            data-testid="view-quick-task-input"
          />
          <select
            value={newTaskPriority}
            onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
          >
            <option value="low">🌿 Low</option>
            <option value="medium">🌼 Medium</option>
            <option value="high">🔥 High</option>
          </select>
          <input
            type="date"
            value={newTaskDue}
            onChange={(e) => setNewTaskDue(e.target.value)}
          />
          <button type="submit" className="cozy-btn primary">
            <Plus size={15} /> Add Task
          </button>
        </form>
      )}

      {view === 'ideas' && (
        <form
          className="view-quick-create-form"
          onSubmit={handleAddIdeaSubmit}
          data-testid="view-quick-add-idea-form"
        >
          <input
            type="text"
            placeholder="💡 Idea title..."
            value={newIdeaTitle}
            onChange={(e) => setNewIdeaTitle(e.target.value)}
            data-testid="view-quick-idea-title"
          />
          <input
            type="text"
            placeholder="Quick thought or note..."
            value={newIdeaContent}
            onChange={(e) => setNewIdeaContent(e.target.value)}
            data-testid="view-quick-idea-content"
          />
          <button type="submit" className="cozy-btn primary">
            <Plus size={15} /> Add Idea Note
          </button>
        </form>
      )}

      {/* Results Grid */}
      {filteredObjects.length === 0 ? (
        <div className="view-empty-box" data-testid="view-empty-results">
          <div className="view-empty-emoji">☁️</div>
          <h3>Nothing matching right now</h3>
          <p>
            Try clearing a filter, or add a fresh note to your cozy board!
          </p>
        </div>
      ) : (
        <div className="view-cards-grid">
          {filteredObjects.map((obj) => {
            const palette = PASTEL_PALETTE[obj.color] || PASTEL_PALETTE.cream;
            const bg = darkMode ? palette.bgDark : palette.bgLight;
            const border = darkMode ? palette.borderDark : palette.borderLight;
            const overdue = isTaskOverdue(obj);
            const dueToday = isTaskDueToday(obj);

            return (
              <div
                key={obj.id}
                className={`view-item-card ${obj.completed ? 'completed' : ''}`}
                style={{ backgroundColor: bg, borderColor: border }}
                data-testid={`view-card-${obj.id}`}
              >
                <div className="view-card-top">
                  <span className="view-card-type">
                    {obj.type === 'task' && '✅ Task'}
                    {obj.type === 'sticky' && '💡 Idea'}
                    {obj.type === 'checklist' && '📋 Checklist'}
                    {obj.type === 'daily' && '🌸 Daily Note'}
                    {obj.type === 'section' && '🗂️ Section'}
                    {obj.type === 'text' && '🔤 Text'}
                    {obj.type === 'shape' && '🔷 Shape'}
                  </span>

                  <div className="view-card-actions">
                    <button
                      type="button"
                      className="mini-pill-btn"
                      onClick={() => onFocusOnBoard(obj)}
                      title="Jump to this item on the infinite canvas"
                    >
                      <Compass size={12} /> Locate
                    </button>
                    {obj.type === 'sticky' && (
                      <button
                        type="button"
                        className="convert-task-btn"
                        onClick={() => onConvertToTask(obj.id)}
                      >
                        <ArrowRightCircle size={12} /> To Task
                      </button>
                    )}
                    <button
                      type="button"
                      className="mini-icon-btn danger"
                      onClick={() => onDelete(obj.id)}
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="view-card-title-row">
                  {obj.type === 'task' && (
                    <button
                      type="button"
                      className={`task-check-btn ${
                        obj.completed ? 'checked' : ''
                      }`}
                      data-testid={`view-checkbox-${obj.id}`}
                      onClick={(e) =>
                        onToggleTaskComplete(obj.id, e.clientX, e.clientY)
                      }
                    >
                      {obj.completed && <Check size={14} strokeWidth={3} />}
                    </button>
                  )}
                  <input
                    type="text"
                    className={`cozy-title-input ${
                      obj.completed ? 'line-through' : ''
                    }`}
                    value={obj.title}
                    onChange={(e) =>
                      onUpdate(obj.id, { title: e.target.value })
                    }
                  />
                </div>

                {obj.type === 'task' && (
                  <div className="task-meta-bar">
                    <select
                      className="cozy-select"
                      value={obj.status || 'todo'}
                      onChange={(e) => {
                        const nextStatus = e.target.value as TaskStatus;
                        onUpdate(obj.id, {
                          status: nextStatus,
                          completed: nextStatus === 'done',
                        });
                      }}
                    >
                      <option value="todo">📌 To Do</option>
                      <option value="in-progress">✨ In Progress</option>
                      <option value="waiting">⏳ Waiting</option>
                      <option value="done">🌸 Done</option>
                    </select>

                    <select
                      className="cozy-select"
                      value={obj.priority || 'medium'}
                      onChange={(e) =>
                        onUpdate(obj.id, {
                          priority: e.target.value as TaskPriority,
                        })
                      }
                    >
                      <option value="low">🌿 Low</option>
                      <option value="medium">🌼 Med</option>
                      <option value="high">🔥 High</option>
                    </select>

                    <input
                      type="date"
                      className="cozy-date-input"
                      value={obj.dueDate || ''}
                      onChange={(e) =>
                        onUpdate(obj.id, { dueDate: e.target.value })
                      }
                    />

                    {overdue && (
                      <span className="overdue-badge">
                        <AlertCircle size={12} /> Overdue
                      </span>
                    )}
                    {!overdue && dueToday && !obj.completed && (
                      <span className="today-badge">🌟 Today</span>
                    )}
                  </div>
                )}

                <textarea
                  className="view-card-textarea"
                  value={obj.content}
                  onChange={(e) =>
                    onUpdate(obj.id, { content: e.target.value })
                  }
                  placeholder="Add notes..."
                />

                {obj.tags && obj.tags.length > 0 && (
                  <div className="tags-wrap">
                    {obj.tags.map((t) => (
                      <span key={t} className="cozy-tag-pill">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
