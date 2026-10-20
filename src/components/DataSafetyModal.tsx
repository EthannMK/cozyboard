import React, { useRef, useState } from 'react';
import {
  Download,
  Upload,
  ShieldAlert,
  HardDrive,
  CheckCircle2,
  Sparkles,
  Trash2,
  X,
  RefreshCw,
} from 'lucide-react';
import { AppSettings, BackgroundPattern } from '../types';

interface DataSafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  storageInfo: {
    persisted: boolean;
    usageBytes?: number;
    quotaBytes?: number;
  };
  storageError: string | null;
  onExportBackup: () => string;
  onImportBackupJson: (jsonText: string) => Promise<void>;
  onClearBoard: () => void;
  onLoadStarterTemplate: () => void;
  onGenerateManyObjects: (count: number) => void;
}

export const DataSafetyModal: React.FC<DataSafetyModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  storageInfo,
  storageError,
  onExportBackup,
  onImportBackupJson,
  onClearBoard,
  onLoadStarterTemplate,
  onGenerateManyObjects,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [manualJson, setManualJson] = useState('');
  const [showManualJson, setShowManualJson] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportStatus(null);
    try {
      const text = await file.text();
      await onImportBackupJson(text);
      setImportStatus('🎉 Backup restored! All your notes and tasks are back.');
    } catch (err: any) {
      setImportError(err?.message || 'Could not parse backup file.');
    }
  };

  const handleManualRestore = async () => {
    setImportError(null);
    setImportStatus(null);
    try {
      await onImportBackupJson(manualJson);
      setImportStatus('🎉 Backup restored from JSON!');
      setManualJson('');
      setShowManualJson(false);
    } catch (err: any) {
      setImportError(err?.message || 'Invalid backup JSON.');
    }
  };

  const formatBytes = (bytes?: number) => {
    if (typeof bytes !== 'number') return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      data-testid="data-safety-modal"
    >
      <div
        className="cozy-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>🛡️ Offline Storage, Backup & Cozy Settings</h3>
          <button
            type="button"
            className="mini-icon-btn"
            onClick={onClose}
            aria-label="Close settings modal"
            data-testid="close-modal-btn"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Storage Warning if any */}
          {storageError && (
            <div className="storage-alert-banner error" role="alert">
              <ShieldAlert size={18} />
              <div>
                <strong>Storage Warning:</strong> {storageError}
                <p>
                  Your changes are currently held in temporary memory. Please
                  export a backup file below before closing this tab!
                </p>
              </div>
            </div>
          )}

          {/* Browser Cache vs IndexedDB Explanation */}
          <section className="modal-section">
            <h4>
              <HardDrive size={16} /> Local-First Data Safety Notice
            </h4>
            <div className="safety-info-card">
              <p>
                <strong>How your board is stored:</strong> CozyBoard stores your
                boards, tasks, sticky notes, and drawings inside your browser’s{' '}
                <strong>IndexedDB</strong> database, while the{' '}
                <strong>Service Worker Cache</strong> keeps the application
                files ready so you can open and use CozyBoard completely offline.
              </p>
              <p className="warning-note">
                ⚠️ <strong>Important:</strong> Browser storage is not a
                permanent cloud backup! Clearing your browser’s{' '}
                <em>“Site Data / Cookies and Site Data”</em> or resetting your
                browser profile can erase locally stored boards. Export a local{' '}
                <code>.json</code> backup regularly to keep your workspace 100%
                safe.
              </p>
              <div className="storage-stats-row">
                <span>
                  <CheckCircle2 size={14} /> Persistent Storage Permission:{' '}
                  <strong>
                    {storageInfo.persisted ? 'Granted' : 'Best-Effort (Standard)'}
                  </strong>
                </span>
                {storageInfo.usageBytes !== undefined && (
                  <span>
                    Used: <strong>{formatBytes(storageInfo.usageBytes)}</strong>
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Backup Export & Restore */}
          <section className="modal-section">
            <h4>💾 Backup & Restore</h4>
            <div className="backup-buttons-row">
              <button
                type="button"
                className="cozy-btn primary"
                onClick={onExportBackup}
                data-testid="export-backup-btn"
              >
                <Download size={15} /> Export Backup (.json)
              </button>

              <button
                type="button"
                className="cozy-btn secondary"
                onClick={() => fileInputRef.current?.click()}
                data-testid="import-backup-btn"
              >
                <Upload size={15} /> Import Backup File (.json)
              </button>

              <button
                type="button"
                className="cozy-btn ghost"
                onClick={() => setShowManualJson(!showManualJson)}
                data-testid="toggle-json-paste-btn"
              >
                {showManualJson ? 'Hide JSON Paste' : 'Paste Backup JSON'}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                data-testid="backup-file-input"
              />
            </div>

            {showManualJson && (
              <div className="manual-json-box">
                <textarea
                  rows={4}
                  placeholder="Paste exported CozyBoard JSON backup here..."
                  value={manualJson}
                  onChange={(e) => setManualJson(e.target.value)}
                  data-testid="manual-json-textarea"
                />
                <button
                  type="button"
                  className="cozy-btn primary"
                  onClick={handleManualRestore}
                  data-testid="restore-manual-json-btn"
                >
                  Restore from Pasted JSON
                </button>
              </div>
            )}

            {importStatus && (
              <div
                className="import-feedback success"
                data-testid="import-success-msg"
              >
                {importStatus}
              </div>
            )}
            {importError && (
              <div
                className="import-feedback error"
                data-testid="import-error-msg"
              >
                {importError}
              </div>
            )}
          </section>

          {/* Cozy Aesthetics & Accessibility */}
          <section className="modal-section">
            <h4>
              <Sparkles size={16} /> Workspace Aesthetic & Accessibility
            </h4>

            <div className="settings-grid">
              <label className="setting-toggle-row">
                <span>🌙 Cozy Dark Mode</span>
                <input
                  type="checkbox"
                  checked={settings.darkMode}
                  onChange={(e) =>
                    onUpdateSettings({ darkMode: e.target.checked })
                  }
                  data-testid="toggle-dark-mode"
                />
              </label>

              <label className="setting-toggle-row">
                <span>🐢 Reduced Motion (Accessibility)</span>
                <input
                  type="checkbox"
                  checked={settings.reducedMotion}
                  onChange={(e) =>
                    onUpdateSettings({ reducedMotion: e.target.checked })
                  }
                  data-testid="toggle-reduced-motion"
                />
              </label>

              <label className="setting-toggle-row">
                <span>☁️ Floating Clouds, Stars & Mascot</span>
                <input
                  type="checkbox"
                  checked={settings.showDecorations}
                  onChange={(e) =>
                    onUpdateSettings({ showDecorations: e.target.checked })
                  }
                  data-testid="toggle-decorations"
                />
              </label>
            </div>

            <div className="pattern-picker-row">
              <span>Canvas Background Style:</span>
              <div className="pattern-buttons">
                {(
                  [
                    { id: 'dots', label: 'Pastel Dots' },
                    { id: 'grid', label: 'Cozy Grid' },
                    { id: 'notebook', label: 'Notebook Paper' },
                    { id: 'plain', label: 'Warm Plain' },
                  ] as Array<{ id: BackgroundPattern; label: string }>
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`cozy-btn ${
                      settings.backgroundPattern === p.id ? 'primary' : 'ghost'
                    }`}
                    onClick={() =>
                      onUpdateSettings({ backgroundPattern: p.id })
                    }
                    data-testid={`bg-pattern-${p.id}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Board Reset & Stress Test Actions */}
          <section className="modal-section">
            <h4>🧹 Board Templates & Diagnostics</h4>
            <div className="backup-buttons-row">
              <button
                type="button"
                className="cozy-btn secondary"
                onClick={() => {
                  onLoadStarterTemplate();
                  onClose();
                }}
                data-testid="reset-starter-btn"
              >
                <RefreshCw size={14} /> Reset to Starter Board
              </button>

              <button
                type="button"
                className="cozy-btn ghost"
                onClick={() => {
                  onGenerateManyObjects(60);
                  onClose();
                }}
                data-testid="stress-test-btn"
              >
                🚀 Add 60 Notes & Drawings (Stress Test)
              </button>

              <button
                type="button"
                className="cozy-btn danger-outline"
                onClick={() => {
                  onClearBoard();
                  onClose();
                }}
                data-testid="clear-board-btn"
              >
                <Trash2 size={14} /> Clear Board
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
