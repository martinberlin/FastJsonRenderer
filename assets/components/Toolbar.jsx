import React from 'react';

const ADD_TOOLS = [
    {
        type: 'drawString',
        label: 'Text',
        icon: 'T',
        defaults: { type: 'drawString', font: 'Ubuntu30', string: 'Text', x: 100, y: 100, c: 0 },
    },
    {
        type: 'fillRect',
        label: 'Filled Rect',
        icon: '▬',
        defaults: { type: 'fillRect', x: 100, y: 100, w: 200, h: 100, c: 0 },
    },
    {
        type: 'drawRect',
        label: 'Rect Outline',
        icon: '□',
        defaults: { type: 'drawRect', x: 100, y: 100, w: 200, h: 100, c: 0 },
    },
    {
        type: 'fillCircle',
        label: 'Filled Circle',
        icon: '●',
        defaults: { type: 'fillCircle', x: 200, y: 200, r: 60, c: 0 },
    },
    {
        type: 'drawCircle',
        label: 'Circle Outline',
        icon: '○',
        defaults: { type: 'drawCircle', x: 200, y: 200, r: 60, c: 0 },
    },
];

/**
 * Toolbar – buttons to add each element type to the canvas.
 *
 * Props:
 *  - onAdd(defaults)          Add a new item with default properties.
 *  - onStartDraw(mode)        Enter a draw mode (e.g. 'drawLine'). Toggle off if same.
 *  - onSelectMode()           Return to select/move mode (cancel any draw mode).
 *  - onImportImage()          Open the image importer modal.
 *  - drawMode                 Current draw mode (null | 'drawLine' | 'drawPixel').
 *  - drawColor                Current draw color (0–max) used in drawPixel mode.
 *  - drawColorMax             Maximum colour value for the current display BPP.
 *  - onDrawColorChange(c)     Called when the draw colour changes.
 */
export default function Toolbar({ onAdd, onStartDraw, onSelectMode, onImportImage, drawMode, drawColor, drawColorMax, onDrawColorChange, currentUser }) {
    const maxColor = drawColorMax ?? 15;

    return (
        <div className="toolbar">
            {/* Select / move tool – default mode, active when no draw mode is set */}
            <button
                className={`toolbar-btn${drawMode === null ? ' toolbar-btn-active' : ''}`}
                title="Select & move items"
                onClick={onSelectMode}
            >
                <span className="toolbar-icon">
                    <svg viewBox="0 0 14 18" width="14" height="18" fill="currentColor" aria-hidden="true">
                        <path d="M0 0 L0 14 L4 10 L7 16.5 L9 15.5 L6 9 L11 9 Z" />
                    </svg>
                </span>
                <span className="toolbar-label">Select</span>
            </button>

            <div className="toolbar-divider" />

            <div className="toolbar-title">Add Element</div>

            {/* Line tool – uses two-point click-to-draw mode */}
            <button
                className={`toolbar-btn${drawMode === 'drawLine' ? ' toolbar-btn-active' : ''}`}
                title={drawMode === 'drawLine' ? 'Cancel line drawing (Esc)' : 'Draw Line: click 1st point then 2nd point'}
                onClick={() => onStartDraw('drawLine')}
            >
                <span className="toolbar-icon">╱</span>
                <span className="toolbar-label">{drawMode === 'drawLine' ? 'Drawing…' : 'Line'}</span>
            </button>

            {/* Pixel draw tool – click/drag to paint pixels */}
            <button
                className={`toolbar-btn${drawMode === 'drawPixel' ? ' toolbar-btn-active' : ''}`}
                title={drawMode === 'drawPixel' ? 'Cancel pixel drawing (Esc)' : 'Draw Pixels: click or drag to paint pixels'}
                onClick={() => onStartDraw('drawPixel')}
            >
                <span className="toolbar-icon">✏</span>
                <span className="toolbar-label">{drawMode === 'drawPixel' ? 'Painting…' : 'Draw Pixel'}</span>
            </button>

            {/* Draw-colour picker – shown when a draw mode that uses colour is active */}
            {drawMode === 'drawPixel' && (
                <div className="toolbar-draw-color">
                    <label className="toolbar-draw-color-label">
                        Color: <span className="toolbar-draw-color-value">{drawColor ?? 0}</span>
                    </label>
                    <input
                        type="range"
                        min={0}
                        max={maxColor}
                        value={drawColor ?? 0}
                        onChange={(e) => onDrawColorChange(parseInt(e.target.value, 10))}
                        className="toolbar-draw-color-range"
                    />
                    <span
                        className="toolbar-draw-color-swatch"
                        style={(() => {
                            const grey = Math.round(((drawColor ?? 0) / maxColor) * 255);
                            return { background: `rgb(${grey},${grey},${grey})` };
                        })()}
                    />
                </div>
            )}

            {/* Other add tools */}
            {ADD_TOOLS.map((tool) => (
                <button
                    key={tool.type}
                    className="toolbar-btn"
                    title={tool.label}
                    onClick={() => onAdd({ ...tool.defaults })}
                >
                    <span className="toolbar-icon">{tool.icon}</span>
                    <span className="toolbar-label">{tool.label}</span>
                </button>
            ))}

            <div className="toolbar-divider" />

            {/* G5 image import — requires login */}
            <button
                className="toolbar-btn toolbar-btn-image"
                title={currentUser ? 'Import PNG/SVG image and convert to 1-bit G5 icon' : 'Sign in to use image import'}
                onClick={currentUser ? onImportImage : () => { window.location.href = '/login'; }}
                style={currentUser ? {} : { opacity: 0.5 }}
            >
                <span className="toolbar-icon">🖼</span>
                <span className="toolbar-label">Import Image{!currentUser ? ' 🔒' : ''}</span>
            </button>
        </div>
    );
}
