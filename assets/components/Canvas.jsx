import React, { useCallback, useRef, useState } from 'react';

/** Map a grayscale value (0–max) to an RGB CSS colour. */
const toGrayColor = (c = 0, bpp = 4) => {
    const max = (1 << bpp) - 1; // 1→1, 2→3, 4→15
    const v = Math.round((Math.min(Math.max(c, 0), max) / max) * 255);
    return `rgb(${v},${v},${v})`;
};

// Font sizes are in display pixels matching the firmware's fontconvert tool output.
// fontconvert renders TTF fonts at <pt size> points @ 141 DPI, so the actual
// pixel height = Math.round(pt * 141 / 72). E.g. Ubuntu40 = round(40*141/72) = 78 px.
const FONT_META = {
    Ubuntu40:    { size: 78, family: 'Ubuntu, sans-serif', weight: 400 },
    Ubuntu40b:   { size: 78, family: 'Ubuntu, sans-serif', weight: 700 },
    Ubuntu30:    { size: 59, family: 'Ubuntu, sans-serif', weight: 400 },
    Ubuntu20:    { size: 39, family: 'Ubuntu, sans-serif', weight: 400 },
    Monospace12: { size: 24, family: '"Roboto Mono", "Courier New", monospace', weight: 400 },
};
const DEFAULT_FONT_META = FONT_META.Ubuntu30;

const getFontMeta = (font) => (font && FONT_META[font]) ? FONT_META[font] : DEFAULT_FONT_META;

const getItemBounds = (item) => {
    switch (item.type) {
        case 'drawString': {
            const { size: fontSize } = getFontMeta(item.font);
            const text = item.string ?? 'Text';
            const textWidth = Math.max(fontSize * 0.6, text.length * fontSize * 0.6);
            return { x: item.x, y: item.y - fontSize, w: textWidth, h: fontSize };
        }
        case 'fillRect':
        case 'drawRect':
            return { x: item.x, y: item.y, w: item.w, h: item.h };
        case 'drawLine': {
            const x = Math.min(item.x1, item.x2);
            const y = Math.min(item.y1, item.y2);
            const w = Math.max(2, Math.abs(item.x2 - item.x1));
            const h = Math.max(2, Math.abs(item.y2 - item.y1));
            return { x, y, w, h };
        }
        case 'fillCircle':
        case 'drawCircle':
            return { x: item.x - item.r, y: item.y - item.r, w: item.r * 2, h: item.r * 2 };
        case 'drawG5':
            return { x: item.x, y: item.y, w: item.w, h: item.h };
        default:
            return null;
    }
};

// Cursors for each resize/move handle type
const HANDLE_CURSORS = {
    nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize',
    e: 'ew-resize',
    se: 'nwse-resize', s: 'ns-resize', sw: 'nesw-resize',
    w: 'ew-resize',
    p1: 'move', p2: 'move',
    r: 'ew-resize',
};

/**
 * Canvas component – renders a FastJsonDL screen as an SVG, scaled to fit.
 *
 * Props:
 *  - items               Array of FastJsonDL items
 *  - selectedIndex       Currently selected item index (or null)
 *  - onSelect(index)     Called when an item is clicked
 *  - onMove(index, dx, dy, origItem, handleType?)
 *                        Called while dragging. handleType is set for resize handles.
 *  - onCommitMove()      Called when drag ends
 *  - onTextEdit(index, newText)  Called when an inline text edit is committed
 *  - displayWidth/Height Display size in pixels
 *  - displayBpp          Bits per pixel (1 | 2 | 4)
 *  - scale               CSS scale factor (e.g. 0.5)
 *  - drawMode            null | 'drawLine'
 *  - lineFirstPoint      null | { x, y } – first click point when drawing a line
 *  - onCanvasClick(x, y) Called (in SVG coordinates) when canvas bg is clicked
 */
export default function Canvas({
    items,
    selectedIndex,
    onSelect,
    onMove,
    onCommitMove,
    onTextEdit,
    displayWidth,
    displayHeight,
    displayBpp,
    scale,
    drawMode,
    lineFirstPoint,
    onCanvasClick,
}) {
    // Drag state: null | { index, startClientX, startClientY, origItem, handleType }
    const drag = useRef(null);
    // Ref to the <svg> element for coordinate calculations
    const svgRef = useRef(null);
    // Inline text editing state
    const [editingText, setEditingText] = useState(null); // { index, value, screenX, screenY, fontMeta }

    // ── helper: translate a client-position event to SVG coordinates ─────
    const clientToSvg = useCallback((clientX, clientY) => {
        const rect = svgRef.current.getBoundingClientRect();
        return {
            x: Math.round((clientX - rect.left) / scale),
            y: Math.round((clientY - rect.top) / scale),
        };
    }, [scale]);

    // ── item drag ────────────────────────────────────────────────────────
    const handleItemMouseDown = useCallback((e, index) => {
        e.stopPropagation();
        // In line-draw mode treat any click as a canvas coordinate click
        if (drawMode === 'drawLine' && onCanvasClick) {
            const { x, y } = clientToSvg(e.clientX, e.clientY);
            onCanvasClick(x, y);
            return;
        }
        onSelect(index);
        drag.current = {
            index,
            startClientX: e.clientX,
            startClientY: e.clientY,
            origItem: { ...items[index] },
            handleType: null,
        };
    }, [items, onSelect, drawMode, onCanvasClick, clientToSvg]);

    // ── handle drag ──────────────────────────────────────────────────────
    const handleHandleMouseDown = useCallback((e, index, handleType) => {
        e.stopPropagation();
        drag.current = {
            index,
            startClientX: e.clientX,
            startClientY: e.clientY,
            origItem: { ...items[index] },
            handleType,
        };
    }, [items]);

    const handleMouseMove = useCallback((e) => {
        if (!drag.current) return;
        const { index, startClientX, startClientY, handleType } = drag.current;
        const dx = Math.round((e.clientX - startClientX) / scale);
        const dy = Math.round((e.clientY - startClientY) / scale);
        onMove(index, dx, dy, drag.current.origItem, handleType);
    }, [onMove, scale]);

    const handleMouseUp = useCallback(() => {
        if (drag.current) {
            onCommitMove();
            drag.current = null;
        }
    }, [onCommitMove]);

    // ── background click ─────────────────────────────────────────────────
    const handleBackgroundMouseDown = useCallback((e) => {
        if (e.target !== e.currentTarget) return;
        if (drawMode === 'drawLine' && onCanvasClick) {
            const { x, y } = clientToSvg(e.clientX, e.clientY);
            onCanvasClick(x, y);
        } else {
            onSelect(null);
        }
    }, [drawMode, onCanvasClick, onSelect, clientToSvg]);

    // ── text inline editing ──────────────────────────────────────────────
    const startTextEdit = useCallback((e, index) => {
        e.stopPropagation();
        e.preventDefault();
        drag.current = null;
        const item = items[index];
        const fontMeta = getFontMeta(item.font);
        const rect = svgRef.current.getBoundingClientRect();
        setEditingText({
            index,
            value: item.string ?? '',
            screenX: rect.left + item.x * scale,
            screenY: rect.top + (item.y - fontMeta.size) * scale,
            fontMeta,
        });
    }, [items, scale]);

    const commitTextEdit = useCallback(() => {
        if (!editingText) return;
        if (onTextEdit) onTextEdit(editingText.index, editingText.value);
        setEditingText(null);
    }, [editingText, onTextEdit]);

    // ── resize handle squares renderer ───────────────────────────────────
    const hs = 8 / scale; // handle visual size stays 8 CSS px at all zoom levels

    const makeHandle = (key, cx, cy, handleType, index) => (
        <rect
            key={key}
            x={cx - hs / 2}
            y={cy - hs / 2}
            width={hs}
            height={hs}
            fill="white"
            stroke="#2563eb"
            strokeWidth={1.5 / scale}
            style={{ cursor: HANDLE_CURSORS[handleType] ?? 'move' }}
            onMouseDown={(e) => handleHandleMouseDown(e, index, handleType)}
        />
    );

    const renderHandles = (item, index) => {
        if (item.type === 'drawLine') {
            return (
                <g key={`handles-${index}`}>
                    {makeHandle('p1', item.x1, item.y1, 'p1', index)}
                    {makeHandle('p2', item.x2, item.y2, 'p2', index)}
                </g>
            );
        }
        if (item.type === 'fillRect' || item.type === 'drawRect' || item.type === 'drawG5') {
            const { x, y, w, h } = item.type === 'drawG5'
                ? { x: item.x, y: item.y, w: item.w, h: item.h }
                : { x: item.x, y: item.y, w: item.w, h: item.h };
            return (
                <g key={`handles-${index}`}>
                    {makeHandle('nw', x,         y,         'nw', index)}
                    {makeHandle('n',  x + w / 2, y,         'n',  index)}
                    {makeHandle('ne', x + w,     y,         'ne', index)}
                    {makeHandle('e',  x + w,     y + h / 2, 'e',  index)}
                    {makeHandle('se', x + w,     y + h,     'se', index)}
                    {makeHandle('s',  x + w / 2, y + h,     's',  index)}
                    {makeHandle('sw', x,         y + h,     'sw', index)}
                    {makeHandle('w',  x,         y + h / 2, 'w',  index)}
                </g>
            );
        }
        if (item.type === 'fillCircle' || item.type === 'drawCircle') {
            return (
                <g key={`handles-${index}`}>
                    {makeHandle('r', item.x + item.r, item.y, 'r', index)}
                </g>
            );
        }
        return null;
    };

    // ── item renderer ─────────────────────────────────────────────────────
    const renderItem = (item, index) => {
        const color = toGrayColor(item.c, displayBpp);
        const isSelected = index === selectedIndex;
        const inDrawMode = drawMode === 'drawLine';
        const baseProps = {
            onMouseDown: (e) => handleItemMouseDown(e, index),
            style: { cursor: inDrawMode ? 'crosshair' : 'move' },
        };

        switch (item.type) {
            case 'drawString': {
                const fontMeta = getFontMeta(item.font);
                return (
                    <text
                        key={index}
                        x={item.x}
                        y={item.y}
                        fontSize={fontMeta.size}
                        fill={color}
                        fontFamily={fontMeta.family}
                        fontWeight={fontMeta.weight}
                        stroke={isSelected ? '#2563eb' : 'none'}
                        strokeWidth={isSelected ? 0.5 : 0}
                        onMouseDown={(e) => handleItemMouseDown(e, index)}
                        onDoubleClick={(e) => startTextEdit(e, index)}
                        style={{ cursor: inDrawMode ? 'crosshair' : 'move', userSelect: 'none' }}
                    >
                        {item.string ?? 'Text'}
                    </text>
                );
            }
            case 'fillRect':
                return (
                    <rect key={index} x={item.x} y={item.y} width={item.w} height={item.h}
                        fill={color}
                        stroke={isSelected ? '#2563eb' : 'none'}
                        strokeWidth={isSelected ? 2 / scale : 0}
                        strokeDasharray={isSelected ? `${6 / scale}` : undefined}
                        {...baseProps} />
                );
            case 'drawRect':
                return (
                    <rect key={index} x={item.x} y={item.y} width={item.w} height={item.h}
                        fill="none"
                        stroke={isSelected ? '#2563eb' : color}
                        strokeWidth={isSelected ? 2 / scale : 2}
                        strokeDasharray={isSelected ? `${6 / scale}` : undefined}
                        {...baseProps} />
                );
            case 'drawLine':
                return (
                    <line key={index} x1={item.x1} y1={item.y1} x2={item.x2} y2={item.y2}
                        stroke={isSelected ? '#2563eb' : color}
                        strokeWidth={isSelected ? 3 / scale : 2}
                        {...baseProps} />
                );
            case 'fillCircle':
                return (
                    <circle key={index} cx={item.x} cy={item.y} r={item.r}
                        fill={color}
                        stroke={isSelected ? '#2563eb' : 'none'}
                        strokeWidth={isSelected ? 2 / scale : 0}
                        strokeDasharray={isSelected ? `${6 / scale}` : undefined}
                        {...baseProps} />
                );
            case 'drawCircle':
                return (
                    <circle key={index} cx={item.x} cy={item.y} r={item.r}
                        fill="none"
                        stroke={isSelected ? '#2563eb' : color}
                        strokeWidth={isSelected ? 2 / scale : 2}
                        strokeDasharray={isSelected ? `${6 / scale}` : undefined}
                        {...baseProps} />
                );
            case 'drawG5':
                return (
                    <image
                        key={index}
                        href={item.preview ?? ''}
                        x={item.x}
                        y={item.y}
                        width={item.w}
                        height={item.h}
                        imageRendering="pixelated"
                        stroke={isSelected ? '#2563eb' : 'none'}
                        strokeWidth={isSelected ? 2 / scale : 0}
                        {...baseProps}
                    />
                );
            default:
                return null;
        }
    };

    // ── selection overlay ─────────────────────────────────────────────────
    const selectedItem = selectedIndex !== null ? items[selectedIndex] : null;
    const selectedBounds = selectedItem ? getItemBounds(selectedItem) : null;
    const selPad = Math.max(4 / scale, 2);
    const selSW  = Math.max(1.5 / scale, 1);
    const selDash = `${Math.max(5 / scale, 2)} ${Math.max(3 / scale, 2)}`;

    const inDrawMode = drawMode === 'drawLine';

    return (
        <>
            <div
                className="canvas-wrapper"
                style={{ width: displayWidth * scale, height: displayHeight * scale }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <svg
                    ref={svgRef}
                    width={displayWidth * scale}
                    height={displayHeight * scale}
                    viewBox={`0 0 ${displayWidth} ${displayHeight}`}
                    className="canvas-svg"
                    style={{ cursor: inDrawMode ? 'crosshair' : undefined }}
                    onMouseDown={handleBackgroundMouseDown}
                >
                    {/* White display background */}
                    <rect x={0} y={0} width={displayWidth} height={displayHeight} fill="white" />

                    {/* Render items */}
                    {items.map((item, index) => renderItem(item, index))}

                    {/* Persistent selection box (for non-handle items, or as supplement) */}
                    {selectedBounds && (
                        <rect
                            x={selectedBounds.x - selPad}
                            y={selectedBounds.y - selPad}
                            width={selectedBounds.w + selPad * 2}
                            height={selectedBounds.h + selPad * 2}
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth={selSW}
                            strokeDasharray={selDash}
                            pointerEvents="none"
                        />
                    )}

                    {/* Resize / endpoint handles for the selected item */}
                    {selectedItem && renderHandles(selectedItem, selectedIndex)}

                    {/* Line draw mode: first-point indicator */}
                    {inDrawMode && lineFirstPoint && (
                        <g pointerEvents="none">
                            <circle
                                cx={lineFirstPoint.x}
                                cy={lineFirstPoint.y}
                                r={6 / scale}
                                fill="#2563eb"
                                fillOpacity={0.25}
                                stroke="#2563eb"
                                strokeWidth={1.5 / scale}
                            />
                            <line
                                x1={lineFirstPoint.x - 8 / scale}
                                y1={lineFirstPoint.y}
                                x2={lineFirstPoint.x + 8 / scale}
                                y2={lineFirstPoint.y}
                                stroke="#2563eb"
                                strokeWidth={1 / scale}
                            />
                            <line
                                x1={lineFirstPoint.x}
                                y1={lineFirstPoint.y - 8 / scale}
                                x2={lineFirstPoint.x}
                                y2={lineFirstPoint.y + 8 / scale}
                                stroke="#2563eb"
                                strokeWidth={1 / scale}
                            />
                        </g>
                    )}
                </svg>
            </div>

            {/* Inline text editor – rendered outside the SVG, positioned with fixed coords */}
            {editingText && (
                <div
                    className="inline-text-edit-overlay"
                    style={{
                        position: 'fixed',
                        left: editingText.screenX,
                        top: editingText.screenY,
                        zIndex: 1000,
                    }}
                >
                    <input
                        className="inline-text-input"
                        autoFocus
                        value={editingText.value}
                        onChange={(e) =>
                            setEditingText((prev) => ({ ...prev, value: e.target.value }))
                        }
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') commitTextEdit();
                            if (e.key === 'Escape') setEditingText(null);
                            e.stopPropagation(); // don't fire canvas shortcuts
                        }}
                        onBlur={commitTextEdit}
                        style={{
                            fontSize: editingText.fontMeta.size * scale + 'px',
                            fontFamily: editingText.fontMeta.family,
                            fontWeight: editingText.fontMeta.weight,
                        }}
                    />
                </div>
            )}
        </>
    );
}
