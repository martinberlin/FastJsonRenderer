import React from 'react';

const TOOLS = [
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
        type: 'drawLine',
        label: 'Line',
        icon: '╱',
        defaults: { type: 'drawLine', x1: 50, y1: 50, x2: 250, y2: 150, c: 0 },
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
 * Calls onAdd(itemDefaults) when a tool is clicked.
 */
export default function Toolbar({ onAdd }) {
    return (
        <div className="toolbar">
            <div className="toolbar-title">Add Element</div>
            {TOOLS.map((tool) => (
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
        </div>
    );
}
