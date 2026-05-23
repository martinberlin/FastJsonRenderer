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
 *  - onImportImage()          Open the image importer modal.
 *  - drawMode                 Current draw mode (null | 'drawLine').
 */
export default function Toolbar({ onAdd, onStartDraw, onImportImage, drawMode }) {
    return (
        <div className="toolbar">
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

            {/* G5 image import */}
            <button
                className="toolbar-btn toolbar-btn-image"
                title="Import PNG/SVG image and convert to 1-bit G5 icon"
                onClick={onImportImage}
            >
                <span className="toolbar-icon">🖼</span>
                <span className="toolbar-label">Import Image</span>
            </button>
        </div>
    );
}
