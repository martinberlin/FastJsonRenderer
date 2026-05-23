import React, { useCallback, useRef } from 'react';

/** Map a 4BPP grayscale value (0–15) to an RGB CSS colour. */
const toGrayColor = (c = 0, bpp = 4) => {
    const max = (1 << bpp) - 1; // 1→1, 2→3, 4→15
    const v = Math.round((Math.min(Math.max(c, 0), max) / max) * 255);
    return `rgb(${v},${v},${v})`;
};

const FONT_META = {
    Ubuntu40: { size: 40, family: 'Ubuntu, sans-serif', weight: 400 },
    Ubuntu40b: { size: 40, family: 'Ubuntu, sans-serif', weight: 700 },
    Ubuntu30: { size: 30, family: 'Ubuntu, sans-serif', weight: 400 },
    Ubuntu20: { size: 20, family: 'Ubuntu, sans-serif', weight: 400 },
    Monospace12: { size: 12, family: '"Ubuntu Mono", "Courier New", monospace', weight: 400 },
};
const DEFAULT_FONT_META = FONT_META.Ubuntu30;

const getFontMeta = (font) => {
    if (font && FONT_META[font]) return FONT_META[font];
    return DEFAULT_FONT_META;
};

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
        default:
            return null;
    }
};

/**
 * Canvas component – renders a FastJsonDL screen as an SVG, scaled to fit.
 *
 * Props:
 *  - items               Array of FastJsonDL items
 *  - selectedIndex       Currently selected item index (or null)
 *  - onSelect(index)     Called when an item is clicked
 *  - onMove(index, dx, dy)  Called while dragging (delta from drag start in display px)
 *  - onCommitMove()      Called when drag ends
 *  - displayWidth/Height Display size in pixels
 *  - displayBpp          Bits per pixel (1 | 2 | 4)
 *  - scale               CSS scale factor (e.g. 0.5)
 */
export default function Canvas({
    items,
    selectedIndex,
    onSelect,
    onMove,
    onCommitMove,
    displayWidth,
    displayHeight,
    displayBpp,
    scale,
}) {
    // Track drag state via a ref to avoid re-renders during move
    const drag = useRef(null); // { index, startClientX, startClientY, origItem }

    const handleItemMouseDown = useCallback(
        (e, index) => {
            e.stopPropagation();
            onSelect(index);
            drag.current = {
                index,
                startClientX: e.clientX,
                startClientY: e.clientY,
                origItem: { ...items[index] },
            };
        },
        [items, onSelect],
    );

    const handleMouseMove = useCallback(
        (e) => {
            if (!drag.current) return;
            const { index, startClientX, startClientY } = drag.current;
            const dx = Math.round((e.clientX - startClientX) / scale);
            const dy = Math.round((e.clientY - startClientY) / scale);
            onMove(index, dx, dy, drag.current.origItem);
        },
        [onMove, scale],
    );

    const handleMouseUp = useCallback(() => {
        if (drag.current) {
            onCommitMove();
            drag.current = null;
        }
    }, [onCommitMove]);

    const handleBackgroundMouseDown = useCallback((e) => {
        if (e.target === e.currentTarget) {
            onSelect(null);
        }
    }, [onSelect]);

    const renderItem = (item, index) => {
        const color = toGrayColor(item.c, displayBpp);
        const isSelected = index === selectedIndex;
        const selStyle = isSelected
            ? { outline: `${Math.ceil(2 / scale)}px dashed #2563eb` }
            : {};
        const baseProps = {
            onMouseDown: (e) => handleItemMouseDown(e, index),
            style: { cursor: 'move', ...selStyle },
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
                        onMouseDown={(e) => handleItemMouseDown(e, index)}
                        style={{ cursor: 'move', userSelect: 'none' }}
                        stroke={isSelected ? '#2563eb' : 'none'}
                        strokeWidth={isSelected ? 0.5 : 0}
                    >
                        {item.string ?? 'Text'}
                    </text>
                );
            }
            case 'fillRect':
                return (
                    <rect
                        key={index}
                        x={item.x}
                        y={item.y}
                        width={item.w}
                        height={item.h}
                        fill={color}
                        stroke={isSelected ? '#2563eb' : 'none'}
                        strokeWidth={isSelected ? 2 / scale : 0}
                        strokeDasharray={isSelected ? `${6 / scale}` : undefined}
                        {...baseProps}
                    />
                );
            case 'drawRect':
                return (
                    <rect
                        key={index}
                        x={item.x}
                        y={item.y}
                        width={item.w}
                        height={item.h}
                        fill="none"
                        stroke={isSelected ? '#2563eb' : color}
                        strokeWidth={isSelected ? 2 / scale : 2}
                        strokeDasharray={isSelected ? `${6 / scale}` : undefined}
                        {...baseProps}
                    />
                );
            case 'drawLine':
                return (
                    <line
                        key={index}
                        x1={item.x1}
                        y1={item.y1}
                        x2={item.x2}
                        y2={item.y2}
                        stroke={isSelected ? '#2563eb' : color}
                        strokeWidth={isSelected ? 3 / scale : 2}
                        {...baseProps}
                    />
                );
            case 'fillCircle':
                return (
                    <circle
                        key={index}
                        cx={item.x}
                        cy={item.y}
                        r={item.r}
                        fill={color}
                        stroke={isSelected ? '#2563eb' : 'none'}
                        strokeWidth={isSelected ? 2 / scale : 0}
                        strokeDasharray={isSelected ? `${6 / scale}` : undefined}
                        {...baseProps}
                    />
                );
            case 'drawCircle':
                return (
                    <circle
                        key={index}
                        cx={item.x}
                        cy={item.y}
                        r={item.r}
                        fill="none"
                        stroke={isSelected ? '#2563eb' : color}
                        strokeWidth={isSelected ? 2 / scale : 2}
                        strokeDasharray={isSelected ? `${6 / scale}` : undefined}
                        {...baseProps}
                    />
                );
            default:
                return null;
        }
    };

    const selectedItem = selectedIndex !== null ? items[selectedIndex] : null;
    const selectedBounds = selectedItem ? getItemBounds(selectedItem) : null;
    const selectionPadding = Math.max(4 / scale, 2);
    const selectionStrokeWidth = Math.max(1.5 / scale, 1);
    const selectionDash = `${Math.max(5 / scale, 2)} ${Math.max(3 / scale, 2)}`;

    return (
        <div
            className="canvas-wrapper"
            style={{ width: displayWidth * scale, height: displayHeight * scale }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Background grid hint */}
            <svg
                width={displayWidth * scale}
                height={displayHeight * scale}
                viewBox={`0 0 ${displayWidth} ${displayHeight}`}
                className="canvas-svg"
                onMouseDown={handleBackgroundMouseDown}
            >
                {/* White display background */}
                <rect x={0} y={0} width={displayWidth} height={displayHeight} fill="white" />

                {/* Render items */}
                {items.map((item, index) => renderItem(item, index))}

                {/* Persistent selection box */}
                {selectedBounds && (
                    <rect
                        x={selectedBounds.x - selectionPadding}
                        y={selectedBounds.y - selectionPadding}
                        width={selectedBounds.w + selectionPadding * 2}
                        height={selectedBounds.h + selectionPadding * 2}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth={selectionStrokeWidth}
                        strokeDasharray={selectionDash}
                        pointerEvents="none"
                    />
                )}
            </svg>
        </div>
    );
}
