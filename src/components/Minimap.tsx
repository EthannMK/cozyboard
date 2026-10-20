import React from 'react';
import { ZoomIn, ZoomOut, Compass, Maximize2 } from 'lucide-react';
import { CanvasObject } from '../types';
import { PASTEL_PALETTE } from '../constants';

interface MinimapProps {
  objects: CanvasObject[];
  panX: number;
  panY: number;
  zoom: number;
  viewportWidth: number;
  viewportHeight: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onJumpToWorld: (worldX: number, worldY: number) => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  objects,
  panX,
  panY,
  zoom,
  viewportWidth,
  viewportHeight,
  onZoomIn,
  onZoomOut,
  onResetView,
  onJumpToWorld,
}) => {
  // Map world bounds [-600..2600] x [-400..2000] into 150x100 minimap
  const mapWidth = 152;
  const mapHeight = 98;
  const worldMinX = -400;
  const worldMaxX = 2400;
  const worldMinY = -300;
  const worldMaxY = 1800;

  const scaleX = mapWidth / (worldMaxX - worldMinX);
  const scaleY = mapHeight / (worldMaxY - worldMinY);

  // Viewport rectangle in world space
  const viewWorldX = -panX / zoom;
  const viewWorldY = -panY / zoom;
  const viewWorldW = viewportWidth / zoom;
  const viewWorldH = viewportHeight / zoom;

  const rectX = Math.max(0, Math.min(mapWidth - 12, (viewWorldX - worldMinX) * scaleX));
  const rectY = Math.max(0, Math.min(mapHeight - 10, (viewWorldY - worldMinY) * scaleY));
  const rectW = Math.min(mapWidth, Math.max(16, viewWorldW * scaleX));
  const rectH = Math.min(mapHeight, Math.max(12, viewWorldH * scaleY));

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - bounds.left;
    const clickY = e.clientY - bounds.top;
    const targetWorldX = worldMinX + clickX / scaleX;
    const targetWorldY = worldMinY + clickY / scaleY;
    onJumpToWorld(targetWorldX, targetWorldY);
  };

  return (
    <div className="minimap-dock" data-testid="minimap-dock">
      <div className="zoom-controls-bar">
        <button
          type="button"
          className="zoom-btn"
          onClick={onZoomOut}
          title="Zoom Out (-)"
          data-testid="zoom-out-btn"
          aria-label="Zoom out"
        >
          <ZoomOut size={15} />
        </button>
        <span className="zoom-readout" data-testid="zoom-readout">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          className="zoom-btn"
          onClick={onZoomIn}
          title="Zoom In (+)"
          data-testid="zoom-in-btn"
          aria-label="Zoom in"
        >
          <ZoomIn size={15} />
        </button>
        <button
          type="button"
          className="zoom-btn reset-view-btn"
          onClick={onResetView}
          title="Return to Main View (100%)"
          data-testid="reset-view-btn"
        >
          <Compass size={14} /> Main View
        </button>
      </div>

      <svg
        width={mapWidth}
        height={mapHeight}
        className="minimap-svg"
        onClick={handleMapClick}
        data-testid="minimap-svg"
      >
        <rect
          x={0}
          y={0}
          width={mapWidth}
          height={mapHeight}
          rx={10}
          fill="rgba(255, 253, 249, 0.85)"
        />
        {objects
          .filter((o) => o.type !== 'connector' && o.type !== 'drawing')
          .map((o) => {
            const mx = (o.x - worldMinX) * scaleX;
            const my = (o.y - worldMinY) * scaleY;
            const mw = Math.max(4, (o.width || 120) * scaleX);
            const mh = Math.max(4, (o.height || 90) * scaleY);
            const hex = PASTEL_PALETTE[o.color]?.accentLight || '#8B5CF6';
            return (
              <rect
                key={o.id}
                x={mx}
                y={my}
                width={mw}
                height={mh}
                rx={2}
                fill={hex}
                opacity={o.type === 'section' ? 0.25 : 0.75}
              />
            );
          })}
        <rect
          x={rectX}
          y={rectY}
          width={rectW}
          height={rectH}
          rx={3}
          fill="rgba(139, 92, 246, 0.12)"
          stroke="#7C3AED"
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
};
