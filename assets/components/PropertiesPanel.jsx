import React from 'react';

const FONTS = ['Ubuntu40', 'Ubuntu40b', 'Ubuntu30', 'Ubuntu20', 'Monospace12'];

/**
 * Numeric field helper – shows an input[number] and keeps the value as integer.
 */
const NumField = ({ label, value, onChange, min, max }) => (
    <div className="prop-row">
        <label>{label}</label>
        <input
            type="number"
            value={value ?? 0}
            min={min}
            max={max}
            onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        />
    </div>
);

/**
 * PropertiesPanel – edit the properties of the currently selected item.
 *
 * Props:
 *  - item          The selected FastJsonDL item (or null)
 *  - displayBpp    Bits per pixel for the current screen (1 | 2 | 4)
 *  - onChange(patch)   Partial update to apply to the item
 *  - onDelete()        Remove the item from the canvas
 *  - onMoveUp()        Move item one layer up (earlier in array = below others)
 *  - onMoveDown()      Move item one layer down
 */
export default function PropertiesPanel({ item, displayBpp, onChange, onDelete, onMoveUp, onMoveDown }) {
    if (!item) {
        return (
            <div className="properties-panel empty">
                <p>Select an element on the canvas to edit its properties.</p>
            </div>
        );
    }

    const maxColor = (1 << displayBpp) - 1; // 1→1, 2→3, 4→15

    return (
        <div className="properties-panel">
            <div className="props-header">
                <span className="props-type">{item.type}</span>
                <div className="props-actions">
                    <button title="Move up (renders later / on top)" onClick={onMoveDown}>↑</button>
                    <button title="Move down (renders earlier / below)" onClick={onMoveUp}>↓</button>
                    <button title="Delete element" className="btn-danger-sm" onClick={onDelete}>✕</button>
                </div>
            </div>

            {/* Colour – not applicable for G5 images (they use fg/bg instead) */}
            {item.type !== 'loadG5Image' && (
                <div className="prop-row">
                    <label>
                        Color (c) <span className="hint">0=black · {maxColor}=white</span>
                    </label>
                    <input
                        type="range"
                        min={0}
                        max={maxColor}
                        value={item.c ?? 0}
                        onChange={(e) => onChange({ c: parseInt(e.target.value, 10) })}
                    />
                    <span className="color-preview" style={{
                        background: `rgb(${Math.round(((item.c ?? 0) / maxColor) * 255)},${Math.round(((item.c ?? 0) / maxColor) * 255)},${Math.round(((item.c ?? 0) / maxColor) * 255)})`,
                    }}>{item.c ?? 0}</span>
                </div>
            )}

            {/* Text-specific */}
            {item.type === 'drawString' && (
                <>
                    <div className="prop-row">
                        <label>Text <span className="hint">double-click on canvas to edit</span></label>
                        <input
                            type="text"
                            value={item.string ?? ''}
                            onChange={(e) => onChange({ string: e.target.value })}
                        />
                    </div>
                    <div className="prop-row">
                        <label>Font</label>
                        <select value={item.font ?? 'Ubuntu30'} onChange={(e) => onChange({ font: e.target.value })}>
                            {FONTS.map((f) => <option key={f}>{f}</option>)}
                        </select>
                    </div>
                    <NumField label="X" value={item.x} onChange={(v) => onChange({ x: v })} min={0} />
                    <NumField label="Y (baseline)" value={item.y} onChange={(v) => onChange({ y: v })} min={0} />
                </>
            )}

            {/* Rect-based */}
            {(item.type === 'fillRect' || item.type === 'drawRect') && (
                <>
                    <NumField label="X" value={item.x} onChange={(v) => onChange({ x: v })} min={0} />
                    <NumField label="Y" value={item.y} onChange={(v) => onChange({ y: v })} min={0} />
                    <NumField label="Width" value={item.w} onChange={(v) => onChange({ w: Math.max(1, v) })} min={1} />
                    <NumField label="Height" value={item.h} onChange={(v) => onChange({ h: Math.max(1, v) })} min={1} />
                </>
            )}

            {/* Line */}
            {item.type === 'drawLine' && (
                <>
                    <NumField label="X1" value={item.x1} onChange={(v) => onChange({ x1: v })} />
                    <NumField label="Y1" value={item.y1} onChange={(v) => onChange({ y1: v })} />
                    <NumField label="X2" value={item.x2} onChange={(v) => onChange({ x2: v })} />
                    <NumField label="Y2" value={item.y2} onChange={(v) => onChange({ y2: v })} />
                </>
            )}

            {/* G5 image */}
            {item.type === 'loadG5Image' && (
                <>
                    <NumField label="X" value={item.x} onChange={(v) => onChange({ x: v })} min={0} />
                    <NumField label="Y" value={item.y} onChange={(v) => onChange({ y: v })} min={0} />
                    <NumField label="Width" value={item.w} onChange={(v) => onChange({ w: Math.max(1, v) })} min={1} />
                    <NumField label="Height" value={item.h} onChange={(v) => onChange({ h: Math.max(1, v) })} min={1} />
                    <div className="prop-row">
                        <label>FG Color <span className="hint">white/background pixels (1-bits)</span></label>
                        <input
                            type="range"
                            min={0}
                            max={maxColor}
                            value={item.fg ?? maxColor}
                            onChange={(e) => onChange({ fg: parseInt(e.target.value, 10) })}
                        />
                        {(() => {
                            const fgV = Math.round(((item.fg ?? maxColor) / maxColor) * 255);
                            return (
                                <span className="color-preview" style={{
                                    background: `rgb(${fgV},${fgV},${fgV})`,
                                }}>{item.fg ?? maxColor}</span>
                            );
                        })()}
                    </div>
                    <div className="prop-row">
                        <label>BG Color <span className="hint">black/content pixels (0-bits)</span></label>
                        <input
                            type="range"
                            min={0}
                            max={maxColor}
                            value={item.bg ?? 0}
                            onChange={(e) => onChange({ bg: parseInt(e.target.value, 10) })}
                        />
                        {(() => {
                            const bgV = Math.round(((item.bg ?? 0) / maxColor) * 255);
                            return (
                                <span className="color-preview" style={{
                                    background: `rgb(${bgV},${bgV},${bgV})`,
                                }}>{item.bg ?? 0}</span>
                            );
                        })()}
                    </div>
                    <div className="prop-row">
                        <label>G5 data</label>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {item.data ? `${Array.isArray(item.data) ? item.data.length : '?'} bytes` : '—'}
                        </span>
                    </div>
                </>
            )}
        </div>
    );
}
