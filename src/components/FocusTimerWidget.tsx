import React, { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Coffee, Sparkles, Timer } from 'lucide-react';

export const FocusTimerWidget: React.FC<{
  onCompleteSession?: () => void;
}> = ({ onCompleteSession }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          if (onCompleteSession) onCompleteSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, onCompleteSession]);

  const switchMode = (nextMode: 'focus' | 'break') => {
    setIsRunning(false);
    setMode(nextMode);
    setSecondsLeft(nextMode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  if (!isOpen) {
    return (
      <button
        type="button"
        className="focus-timer-pill"
        onClick={() => setIsOpen(true)}
        data-testid="open-focus-timer-btn"
        title="Open Cozy Focus Timer"
      >
        <Timer size={14} />
        <span>{isRunning ? `${mins}:${secs}` : 'Focus Timer'}</span>
      </button>
    );
  }

  return (
    <div className="focus-timer-card" data-testid="focus-timer-card">
      <div className="focus-timer-header">
        <div className="focus-mode-tabs">
          <button
            type="button"
            className={`mini-pill-btn ${mode === 'focus' ? 'active' : ''}`}
            onClick={() => switchMode('focus')}
          >
            <Sparkles size={11} /> 25m Focus
          </button>
          <button
            type="button"
            className={`mini-pill-btn ${mode === 'break' ? 'active' : ''}`}
            onClick={() => switchMode('break')}
          >
            <Coffee size={11} /> 5m Tea
          </button>
        </div>
        <button
          type="button"
          className="mini-icon-btn"
          onClick={() => setIsOpen(false)}
          title="Minimize timer"
        >
          ×
        </button>
      </div>

      <div className="focus-timer-display" data-testid="focus-timer-display">
        {mins}:{secs}
      </div>

      <div className="focus-timer-controls">
        <button
          type="button"
          className="cozy-btn primary compact"
          onClick={() => setIsRunning(!isRunning)}
          data-testid="toggle-timer-run-btn"
        >
          {isRunning ? <Pause size={13} /> : <Play size={13} />}
          <span>{isRunning ? 'Pause' : 'Start'}</span>
        </button>
        <button
          type="button"
          className="cozy-btn ghost compact"
          onClick={() => {
            setIsRunning(false);
            setSecondsLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
          }}
          title="Reset timer"
        >
          <RotateCcw size={13} />
        </button>
      </div>
    </div>
  );
};
