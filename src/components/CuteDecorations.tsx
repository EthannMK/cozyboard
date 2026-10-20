import React from 'react';
import { MOTIVATIONAL_QUOTES } from '../constants';

export const MochiMascotSVG: React.FC<{
  size?: number;
  waving?: boolean;
  reducedMotion?: boolean;
}> = ({ size = 68, waving = false, reducedMotion = false }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={!reducedMotion ? 'mochi-bob' : ''}
      aria-label="Mochi the Cloud Cat mascot"
    >
      {/* Soft shadow */}
      <ellipse cx="60" cy="108" rx="34" ry="7" fill="rgba(139, 92, 246, 0.16)" />
      {/* Fluffy cloud-cat ears */}
      <path
        d="M32 52 L38 24 L56 40 Z"
        fill="#FCE7F3"
        stroke="#8B5CF6"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path
        d="M88 52 L82 24 L64 40 Z"
        fill="#FCE7F3"
        stroke="#8B5CF6"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Cloud body */}
      <path
        d="M30 82 C20 82 16 70 23 62 C20 50 31 40 44 42 C50 35 70 35 76 42 C89 40 100 50 97 62 C104 70 100 82 90 82 Z"
        fill="#FFFDF9"
        stroke="#8B5CF6"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Eyes */}
      <circle cx="46" cy="60" r="4.2" fill="#4C1D95" />
      <circle cx="74" cy="60" r="4.2" fill="#4C1D95" />
      <circle cx="44.5" cy="58.5" r="1.4" fill="#FFFFFF" />
      <circle cx="72.5" cy="58.5" r="1.4" fill="#FFFFFF" />
      {/* Rosy cheeks */}
      <ellipse cx="37" cy="66" rx="5.5" ry="3.2" fill="#F9A8D4" />
      <ellipse cx="83" cy="66" rx="5.5" ry="3.2" fill="#F9A8D4" />
      {/* Cute cat smile :3 */}
      <path
        d="M54 65 Q57 69 60 65 Q63 69 66 65"
        stroke="#4C1D95"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Little paws */}
      <ellipse
        cx="43"
        cy="82"
        rx="6"
        ry="4.5"
        fill="#FFFDF9"
        stroke="#8B5CF6"
        strokeWidth="3"
      />
      <ellipse
        cx="77"
        cy={waving ? '74' : '82'}
        rx="6"
        ry="4.5"
        fill="#FFFDF9"
        stroke="#8B5CF6"
        strokeWidth="3"
      />
      {/* Floating star */}
      <path
        d="M98 22 L101 29 L108 32 L101 35 L98 42 L95 35 L88 32 L95 29 Z"
        fill="#FBBF24"
      />
    </svg>
  );
};

export const FloatingBackdropDecorations: React.FC<{
  show: boolean;
  reducedMotion: boolean;
}> = ({ show, reducedMotion }) => {
  if (!show) return null;

  return (
    <div
      className="floating-decorations-layer"
      aria-hidden="true"
      data-testid="floating-decorations"
    >
      <div className={`deco-item deco-cloud-1 ${reducedMotion ? 'no-anim' : ''}`}>
        ☁️
      </div>
      <div className={`deco-item deco-cloud-2 ${reducedMotion ? 'no-anim' : ''}`}>
        ☁️
      </div>
      <div className={`deco-item deco-star-1 ${reducedMotion ? 'no-anim' : ''}`}>
        ✨
      </div>
      <div className={`deco-item deco-star-2 ${reducedMotion ? 'no-anim' : ''}`}>
        ⭐
      </div>
      <div className={`deco-item deco-flower-1 ${reducedMotion ? 'no-anim' : ''}`}>
        🌸
      </div>
    </div>
  );
};

export const ConfettiSparkleBurst: React.FC<{
  bursts: Array<{ id: string; x: number; y: number }>;
  reducedMotion: boolean;
}> = ({ bursts, reducedMotion }) => {
  if (bursts.length === 0) return null;

  const particles = [
    { dx: -45, dy: -55, emoji: '✨', color: '#FBBF24' },
    { dx: 48, dy: -50, emoji: '🌸', color: '#F472B6' },
    { dx: -52, dy: 12, emoji: '⭐', color: '#A78BFA' },
    { dx: 55, dy: 18, emoji: '💖', color: '#FB7185' },
    { dx: 0, dy: -68, emoji: '🎉', color: '#34D399' },
    { dx: -28, dy: 42, emoji: '✨', color: '#60A5FA' },
    { dx: 32, dy: 44, emoji: '🌟', color: '#FBBF24' },
  ];

  return (
    <div className="sparkle-overlay" aria-live="polite" data-testid="sparkle-burst">
      {bursts.map((b) => (
        <div
          key={b.id}
          className="sparkle-origin"
          style={{ left: b.x, top: b.y }}
        >
          <div className="sparkle-badge">✨ Sweet job! ✨</div>
          {!reducedMotion &&
            particles.map((p, i) => (
              <span
                key={i}
                className="sparkle-particle"
                style={
                  {
                    '--dx': `${p.dx}px`,
                    '--dy': `${p.dy}px`,
                    color: p.color,
                  } as React.CSSProperties
                }
              >
                {p.emoji}
              </span>
            ))}
        </div>
      ))}
    </div>
  );
};

export const CompanionCornerWidget: React.FC<{
  quoteIndex: number;
  onNextQuote: () => void;
  reducedMotion: boolean;
  onQuickAddTask: () => void;
  onQuickAddSticky: () => void;
}> = ({
  quoteIndex,
  onNextQuote,
  reducedMotion,
  onQuickAddTask,
  onQuickAddSticky,
}) => {
  const quote =
    MOTIVATIONAL_QUOTES[quoteIndex % MOTIVATIONAL_QUOTES.length] ||
    MOTIVATIONAL_QUOTES[0];

  return (
    <div className="companion-widget" data-testid="companion-widget">
      <div className="companion-bubble" onClick={onNextQuote} title="Click for another cozy note">
        <span className="companion-quote">{quote}</span>
        <span className="companion-hint">Tap for next thought 💬</span>
      </div>
      <div className="companion-avatar-wrap" onClick={onNextQuote}>
        <MochiMascotSVG size={56} waving reducedMotion={reducedMotion} />
      </div>
    </div>
  );
};

export const EmptyBoardState: React.FC<{
  reducedMotion: boolean;
  onAddSticky: () => void;
  onAddTask: () => void;
  onLoadStarter: () => void;
}> = ({ reducedMotion, onAddSticky, onAddTask, onLoadStarter }) => {
  return (
    <div className="empty-board-card" data-testid="empty-board-state">
      <MochiMascotSVG size={92} waving reducedMotion={reducedMotion} />
      <h3>Your cozy canvas is fresh & ready!</h3>
      <p>
        Drop a pastel sticky note, create a task card, or doodle freely anywhere
        on the board. Everything saves automatically on your device—even offline.
      </p>
      <div className="empty-board-actions">
        <button
          type="button"
          className="cozy-btn primary"
          onClick={onAddSticky}
          data-testid="empty-add-sticky"
        >
          📝 Add First Idea Note
        </button>
        <button
          type="button"
          className="cozy-btn secondary"
          onClick={onAddTask}
          data-testid="empty-add-task"
        >
          ✅ Create a Task
        </button>
        <button
          type="button"
          className="cozy-btn ghost"
          onClick={onLoadStarter}
          data-testid="empty-load-starter"
        >
          🌸 Load Cozy Starter Template
        </button>
      </div>
    </div>
  );
};
