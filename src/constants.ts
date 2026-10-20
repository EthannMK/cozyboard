import { CanvasObject, PastelColor } from './types';

export const PASTEL_PALETTE: Record<
  PastelColor,
  {
    label: string;
    bgLight: string;
    borderLight: string;
    accentLight: string;
    bgDark: string;
    borderDark: string;
    accentDark: string;
    hex: string;
  }
> = {
  cream: {
    label: 'Warm Cream',
    bgLight: '#FFFDF7',
    borderLight: '#F3E8D2',
    accentLight: '#D97706',
    bgDark: '#2D2A24',
    borderDark: '#4A4336',
    accentDark: '#FBBF24',
    hex: '#FFFDF7',
  },
  lavender: {
    label: 'Soft Lavender',
    bgLight: '#F3EFFE',
    borderLight: '#DDD6FE',
    accentLight: '#7C3AED',
    bgDark: '#282238',
    borderDark: '#4C3D6E',
    accentDark: '#C4B5FD',
    hex: '#EDE9FE',
  },
  blue: {
    label: 'Baby Blue',
    bgLight: '#EFF8FF',
    borderLight: '#BAE6FD',
    accentLight: '#0284C7',
    bgDark: '#1E2C3A',
    borderDark: '#334E68',
    accentDark: '#7DD3FC',
    hex: '#E0F2FE',
  },
  pink: {
    label: 'Blossom Pink',
    bgLight: '#FDF2F8',
    borderLight: '#FBCFE8',
    accentLight: '#DB2777',
    bgDark: '#36212E',
    borderDark: '#5E354E',
    accentDark: '#F9A8D4',
    hex: '#FCE7F3',
  },
  mint: {
    label: 'Mint Leaf',
    bgLight: '#ECFDF5',
    borderLight: '#A7F3D0',
    accentLight: '#059669',
    bgDark: '#1C312B',
    borderDark: '#2E5649',
    accentDark: '#6EE7B7',
    hex: '#DCFCE7',
  },
  peach: {
    label: 'Cozy Peach',
    bgLight: '#FFF7ED',
    borderLight: '#FED7AA',
    accentLight: '#EA580C',
    bgDark: '#36271E',
    borderDark: '#5C4030',
    accentDark: '#FDBA74',
    hex: '#FFEDD5',
  },
  butter: {
    label: 'Honey Butter',
    bgLight: '#FEFCE8',
    borderLight: '#FEF08A',
    accentLight: '#CA8A04',
    bgDark: '#332E1C',
    borderDark: '#574E2B',
    accentDark: '#FDE047',
    hex: '#FEF9C3',
  },
};

export const DRAW_COLORS = [
  { name: 'Plum Ink', value: '#4C1D95' },
  { name: 'Rose Berry', value: '#DB2777' },
  { name: 'Sky Ink', value: '#0284C7' },
  { name: 'Mint Emerald', value: '#059669' },
  { name: 'Warm Amber', value: '#D97706' },
  { name: 'Soft Charcoal', value: '#374151' },
];

export const STICKERS: Array<{ id: string; label: string; emoji: string; desc: string }> = [
  { id: 'cat', label: 'Mochi Cat', emoji: '🐱', desc: 'Cozy mascot buddy' },
  { id: 'sparkles', label: 'Sparkles', emoji: '✨', desc: 'Little magic stars' },
  { id: 'cloud', label: 'Fluffy Cloud', emoji: '☁️', desc: 'Dreamy sky cloud' },
  { id: 'plant', label: 'Sprout', emoji: '🌱', desc: 'Growing idea' },
  { id: 'coffee', label: 'Warm Tea', emoji: '🍵', desc: 'Cozy break reminder' },
  { id: 'heart', label: 'Pastel Heart', emoji: '💖', desc: 'Favorite note' },
  { id: 'star', label: 'Shooting Star', emoji: '🌟', desc: 'North star goal' },
  { id: 'lightbulb', label: 'Bright Idea', emoji: '💡', desc: 'Aha moment' },
  { id: 'rainbow', label: 'Rainbow', emoji: '🌈', desc: 'Good vibes' },
  { id: 'trophy', label: 'Little Win', emoji: '🏆', desc: 'Proud milestone' },
];

export const MOTIVATIONAL_QUOTES = [
  'One tiny step today is still wonderful progress. 🌱',
  'Your ideas deserve a cozy place to grow. ✨',
  'Breathe in, sip some tea, and pick just one joyful task. 🍵',
  'Done is sweeter than perfect—celebrate every little checkmark! 🌸',
  'This board is your safe corner for messy thoughts and bright plans. ☁️',
  'Rest is part of the creative process too. You are doing great! 💜',
];

export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isTaskOverdue(obj: CanvasObject): boolean {
  if (obj.type !== 'task') return false;
  if (obj.completed || obj.status === 'done') return false;
  if (!obj.dueDate) return false;
  return obj.dueDate < getTodayISO();
}

export function isTaskDueToday(obj: CanvasObject): boolean {
  if (obj.type !== 'task') return false;
  if (!obj.dueDate) return false;
  return obj.dueDate === getTodayISO();
}

export function createStarterObjects(boardId: string): CanvasObject[] {
  const now = Date.now();
  const today = getTodayISO();
  const yesterday = getYesterdayISO();

  return [
    {
      id: 'starter-section-1',
      boardId,
      type: 'section',
      x: 80,
      y: 90,
      width: 640,
      height: 450,
      zIndex: 1,
      color: 'lavender',
      title: '🌸 Today & Focus Corner',
      content: 'Drag tasks and sticky notes in or out freely!',
      tags: ['focus', 'workspace'],
      createdAt: now - 3600000,
      updatedAt: now - 3600000,
    },
    {
      id: 'starter-section-2',
      boardId,
      type: 'section',
      x: 760,
      y: 90,
      width: 560,
      height: 450,
      zIndex: 1,
      color: 'mint',
      title: '🌱 Brainstorming & Random Ideas',
      content: 'Turn any sticky note into a task with 1 click',
      tags: ['ideas'],
      createdAt: now - 3500000,
      updatedAt: now - 3500000,
    },
    {
      id: 'starter-task-1',
      boardId,
      type: 'task',
      x: 110,
      y: 165,
      width: 280,
      height: 210,
      zIndex: 3,
      color: 'pink',
      title: 'Sketch weekend passion project UI',
      content: 'Try pastel cards, soft shadows, and a friendly mascot.',
      tags: ['design', 'creative'],
      status: 'in-progress',
      priority: 'high',
      dueDate: today,
      completed: false,
      createdAt: now - 3000000,
      updatedAt: now - 3000000,
    },
    {
      id: 'starter-task-2',
      boardId,
      type: 'task',
      x: 415,
      y: 165,
      width: 275,
      height: 210,
      zIndex: 4,
      color: 'peach',
      title: 'Water desk plants & tidy cables',
      content: 'Check the monstera and pothos by the window.',
      tags: ['home', 'self-care'],
      status: 'todo',
      priority: 'medium',
      dueDate: yesterday,
      completed: false,
      createdAt: now - 2500000,
      updatedAt: now - 2500000,
    },
    {
      id: 'starter-sticky-1',
      boardId,
      type: 'sticky',
      x: 795,
      y: 170,
      width: 235,
      height: 195,
      zIndex: 5,
      color: 'butter',
      title: ' Cozy Podcast Concept',
      content: 'Short 10-minute episodes about mindful coding, indie tools, and digital gardening.',
      tags: ['idea', 'someday'],
      createdAt: now - 2000000,
      updatedAt: now - 2000000,
    },
    {
      id: 'starter-sticky-2',
      boardId,
      type: 'sticky',
      x: 1055,
      y: 170,
      width: 235,
      height: 195,
      zIndex: 6,
      color: 'blue',
      title: '📚 Autumn Reading List',
      content: '• The Creative Act\n• Cozy Sci-Fi novellas\n• Design Systems Handbook',
      tags: ['books', 'inspiration'],
      createdAt: now - 1800000,
      updatedAt: now - 1800000,
    },
    {
      id: 'starter-checklist-1',
      boardId,
      type: 'checklist',
      x: 110,
      y: 395,
      width: 280,
      height: 195,
      zIndex: 7,
      color: 'cream',
      title: '🍵 Morning Ritual Checklist',
      content: '',
      tags: ['daily', 'routine'],
      checklist: [
        { id: 'c1', text: 'Brew warm matcha or coffee', done: true },
        { id: 'c2', text: 'Review Today view & top priority', done: true },
        { id: 'c3', text: '25-min deep focus sprint', done: false },
      ],
      createdAt: now - 1500000,
      updatedAt: now - 1500000,
    },
    {
      id: 'starter-daily-1',
      boardId,
      type: 'daily',
      x: 415,
      y: 395,
      width: 275,
      height: 195,
      zIndex: 8,
      color: 'lavender',
      title: `✨ Daily Note (${today})`,
      content: 'Feeling energized! Remember to take a 10-minute walk before sunset.',
      mood: '🌸 Cozy & Focused',
      reminderTime: '17:30',
      tags: ['journal', 'reminder'],
      createdAt: now - 1200000,
      updatedAt: now - 1200000,
    },
    {
      id: 'starter-connector-1',
      boardId,
      type: 'connector',
      x: 250,
      y: 260,
      width: 100,
      height: 100,
      zIndex: 2,
      color: 'lavender',
      title: 'inspires',
      content: '',
      tags: [],
      fromId: 'starter-task-1',
      toId: 'starter-sticky-1',
      connectorStyle: 'dashed',
      createdAt: now - 1000000,
      updatedAt: now - 1000000,
    },
    {
      id: 'starter-sticker-1',
      boardId,
      type: 'sticker',
      x: 710,
      y: 115,
      width: 72,
      height: 72,
      zIndex: 10,
      color: 'pink',
      title: 'Mochi Cat',
      content: '🐱',
      stickerId: 'cat',
      tags: [],
      createdAt: now - 900000,
      updatedAt: now - 900000,
    },
  ];
}
