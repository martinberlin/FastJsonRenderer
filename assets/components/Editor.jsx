import React, { useCallback, useEffect, useRef, useState } from 'react';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import PropertiesPanel from './PropertiesPanel';
import JsonFooter from './JsonFooter';
import ImageImporter from './ImageImporter';
import { BLE_DEFAULTS, bleSendJson } from '../utils/bleSend';

const SCALE_OPTIONS = [0.25, 0.33, 0.5, 0.67, 0.75, 1.0];
const JSON_FOOTER_DEFAULT_H = 220;
const JSON_FOOTER_MIN_H = 80;
const JSON_FOOTER_MAX_H = 600;

/**
 * Apply a resize-handle drag to a rect-like item.
 * @param {object} item        Original item { x, y, w, h, ...rest }
 * @param {string} handleType  'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w'
 * @param {number} dx          Delta x in display pixels
 * @param {number} dy          Delta y in display pixels
 * @returns {object} Updated item
 */
function applyRectHandle(item, handleType, dx, dy) {
    let { x, y, w, h } = item;
    switch (handleType) {
        case 'nw': x += dx; y += dy; w -= dx; h -= dy; break;
        case 'n':             y += dy;          h -= dy; break;
        case 'ne':            y += dy; w += dx; h -= dy; break;
        case 'e':                      w += dx;          break;
        case 'se':                     w += dx; h += dy; break;
        case 's':                               h += dy; break;
        case 'sw': x += dx;            w -= dx; h += dy; break;
        case 'w':  x += dx;            w -= dx;          break;
        default: break;
    }
    return { ...item, x, y, w: Math.max(1, w), h: Math.max(1, h) };
}

/**
 * Editor – the full canvas-based screen design interface.
 *
 * Props:
 *  - screenId   ID of an existing screen to load, or null to start fresh
 *  - onBack()   Navigate back to the screen list
 */
export default function Editor({ screenId, onBack, currentUser }) {
    const [screen, setScreen] = useState(null);
    const [loading, setLoading] = useState(!!screenId);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [scale, setScale] = useState(0.5);
    const [showJson, setShowJson] = useState(false);
    const [jsonFooterHeight, setJsonFooterHeight] = useState(JSON_FOOTER_DEFAULT_H);
    const [title, setTitle] = useState('');

    // Unsaved items buffer (working copy of screen.items during editing)
    const [items, setItems] = useState([]);

    // Rotation: 0 = landscape (0°), 1 = portrait (90°), 2 = inverted landscape (180°), 3 = inverted portrait (270°).
    // The UI toggle cycles between 0 and 1 only; all four values are supported by the firmware export.
    const [rotation, setRotation] = useState(0);

    // Line-draw mode state
    const [drawMode, setDrawMode] = useState(null);       // null | 'drawLine' | 'drawPixel'
    const [lineFirstPoint, setLineFirstPoint] = useState(null); // null | { x, y }

    // Draw color for pixel-paint mode (0 = black)
    const [drawColor, setDrawColor] = useState(0);

    // Image importer modal
    const [showImporter, setShowImporter] = useState(false);

    // Quick BLE send (header button)
    const [bleQuickStatus, setBleQuickStatus] = useState(null);   // null | string
    const [bleQuickProgress, setBleQuickProgress] = useState(null); // null | { sent, total }
    const bleStatusTimerRef = useRef(null);

    // Ref used during footer drag-to-resize
    const footerDragRef = useRef(null);

    // Snapshot of items before a canvas drag starts – used to compute position from delta
    const snapRef = useRef([]);

    // ------------ footer resize drag ------------------------------------
    const handleFooterDragStart = useCallback((e) => {
        e.preventDefault();
        footerDragRef.current = { startY: e.clientY, startH: jsonFooterHeight };

        const onMove = (me) => {
            if (!footerDragRef.current) return;
            const dy = footerDragRef.current.startY - me.clientY;
            setJsonFooterHeight(
                Math.max(JSON_FOOTER_MIN_H, Math.min(JSON_FOOTER_MAX_H, footerDragRef.current.startH + dy)),
            );
        };
        const onUp = () => {
            footerDragRef.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [jsonFooterHeight]);

    // ------------ load existing screen -----------------------------------
    useEffect(() => {
        if (!screenId) {
            // Brand-new unsaved screen – use a sensible default
            const draft = {
                id: null,
                title: 'Untitled Screen',
                displayType: 'ED052TC4',
                displayWidth: 1280,
                displayHeight: 780,
                displayBpp: 4,
                rotation: 0,
                items: [],
            };
            setScreen(draft);
            setItems(draft.items);
            setTitle(draft.title);
            setRotation(draft.rotation);
            return;
        }

        fetch(`/api/screens/${screenId}`)
            .then((r) => r.json())
            .then((s) => {
                setScreen(s);
                setItems(s.items);
                setTitle(s.title);
                setRotation(s.rotation ?? 0);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [screenId]);

    // ------------ save ---------------------------------------------------
    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const body = { ...screen, title, items, rotation };
            const url = screen?.id ? `/api/screens/${screen.id}` : '/api/screens';
            const method = screen?.id ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error('Save failed');
            const saved = await res.json();
            setScreen(saved);
            setItems(saved.items);
            setRotation(saved.rotation ?? 0);
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    // ------------ add item -----------------------------------------------
    const handleAdd = useCallback((defaults) => {
        setItems((prev) => {
            // Offset the new item slightly so it is not on top of the last one
            const offset = prev.length * 20;
            const item = { ...defaults };
            if ('x' in item) item.x = Math.min(item.x + offset, (screen?.displayWidth ?? 1280) - 50);
            if ('y' in item) item.y = Math.min(item.y + offset, (screen?.displayHeight ?? 780) - 50);
            const next = [...prev, item];
            setSelectedIndex(next.length - 1);
            return next;
        });
    }, [screen]);

    // ------------ canvas drag --------------------------------------------
    const handleMove = useCallback((index, dx, dy, origItem, handleType) => {
        setItems((prev) => {
            const next = [...prev];
            const item = origItem;

            if (handleType) {
                // Handle-based resize / endpoint drag
                if (item.type === 'drawLine') {
                    if (handleType === 'p1') {
                        next[index] = { ...item, x1: item.x1 + dx, y1: item.y1 + dy };
                    } else if (handleType === 'p2') {
                        next[index] = { ...item, x2: item.x2 + dx, y2: item.y2 + dy };
                    }
                } else if (item.type === 'fillRect' || item.type === 'drawRect') {
                    next[index] = applyRectHandle(item, handleType, dx, dy);
                } else if (item.type === 'fillCircle' || item.type === 'drawCircle') {
                    if (handleType === 'r') {
                        next[index] = { ...item, r: Math.max(1, item.r + dx) };
                    }
                }
            } else if (item.type === 'drawLine') {
                next[index] = { ...item, x1: item.x1 + dx, y1: item.y1 + dy, x2: item.x2 + dx, y2: item.y2 + dy };
            } else {
                next[index] = { ...item, x: item.x + dx, y: item.y + dy };
            }
            return next;
        });
    }, []);

    const handleCommitMove = useCallback(() => {
        // Nothing special needed – items state is already updated during drag
    }, []);

    // ------------ text inline edit ---------------------------------------
    const handleTextEdit = useCallback((index, newText) => {
        setItems((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], string: newText };
            return next;
        });
    }, []);

    // ------------ select mode (cancel any draw mode) ----------------------
    const handleSelectMode = useCallback(() => {
        setDrawMode(null);
        setLineFirstPoint(null);
    }, []);

    // ------------ line two-point drawing ---------------------------------
    const handleStartDraw = useCallback((mode) => {
        setDrawMode((prev) => {
            if (prev === mode) return null; // toggle off
            return mode;
        });
        setLineFirstPoint(null);
        setSelectedIndex(null);
    }, []);

    const handleCanvasClick = useCallback((x, y) => {
        if (drawMode === 'drawLine') {
            if (!lineFirstPoint) {
                setLineFirstPoint({ x, y });
            } else {
                // Complete the line
                handleAdd({ type: 'drawLine', x1: lineFirstPoint.x, y1: lineFirstPoint.y, x2: x, y2: y, c: 0 });
                setDrawMode(null);
                setLineFirstPoint(null);
            }
        } else if (drawMode === 'drawPixel') {
            // Place pixel at the exact canvas coordinate (no auto-offset)
            setItems((prev) => [...prev, { type: 'p', x, y, c: drawColor }]);
        } else {
            setSelectedIndex(null);
        }
    }, [drawMode, lineFirstPoint, handleAdd, drawColor]);

    // ------------ pixel paint drag ----------------------------------------
    // Called continuously during a mouse-drag in drawPixel mode
    const handleCanvasPaint = useCallback((x, y) => {
        if (drawMode === 'drawPixel') {
            setItems((prev) => [...prev, { type: 'p', x, y, c: drawColor }]);
        }
    }, [drawMode, drawColor]);

    // ------------ property edit ------------------------------------------
    const handlePropChange = useCallback((patch) => {
        setItems((prev) => {
            if (selectedIndex === null) return prev;
            const next = [...prev];
            next[selectedIndex] = { ...next[selectedIndex], ...patch };
            return next;
        });
    }, [selectedIndex]);

    // ------------ delete -------------------------------------------------
    const handleDelete = useCallback(() => {
        if (selectedIndex === null) return;
        setItems((prev) => prev.filter((_, i) => i !== selectedIndex));
        setSelectedIndex(null);
    }, [selectedIndex]);

    // ------------ layer order --------------------------------------------
    const handleMoveUp = useCallback(() => {
        if (selectedIndex === null || selectedIndex === 0) return;
        setItems((prev) => {
            const next = [...prev];
            [next[selectedIndex - 1], next[selectedIndex]] = [next[selectedIndex], next[selectedIndex - 1]];
            return next;
        });
        setSelectedIndex((i) => i - 1);
    }, [selectedIndex]);

    const handleMoveDown = useCallback(() => {
        if (selectedIndex === null) return;
        setItems((prev) => {
            if (selectedIndex >= prev.length - 1) return prev;
            const next = [...prev];
            [next[selectedIndex], next[selectedIndex + 1]] = [next[selectedIndex + 1], next[selectedIndex]];
            return next;
        });
        setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
    }, [selectedIndex, items.length]);

    // ------------ export -------------------------------------------------
    const handleExport = () => {
        if (!screen?.id) {
            alert('Save the screen first before exporting.');
            return;
        }
        window.open(`/api/screens/${screen.id}/export`, '_blank');
    };

    // ------------ keyboard shortcuts -------------------------------------
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (document.activeElement === document.body) handleDelete();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
            if (e.key === 'Escape') {
                if (drawMode) {
                    setDrawMode(null);
                    setLineFirstPoint(null);
                }
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [handleDelete, handleSave, drawMode]);

    if (loading) return <div className="status-msg">Loading screen…</div>;

    // When portrait (rotation=1) the canvas coordinate space is the transposed
    // display: width and height swap so items are designed in portrait dimensions.
    const baseWidth  = screen?.displayWidth  ?? 1280;
    const baseHeight = screen?.displayHeight ?? 780;
    const displayWidth  = rotation === 1 ? baseHeight : baseWidth;
    const displayHeight = rotation === 1 ? baseWidth  : baseHeight;
    const displayBpp = screen?.displayBpp ?? 4;

    // ── Quick BLE send ─────────────────────────────────────────────────────
    const bleJson = JSON.stringify({ display_bpp: displayBpp, rotation, clear: true, items });
    const handleBleQuickSend = () => {
        // Auto-clear status after 5 s so the header doesn't stay cluttered
        clearTimeout(bleStatusTimerRef.current);
        const onStatus = (msg) => {
            setBleQuickStatus(msg);
            if (msg.startsWith('✅') || msg.startsWith('ℹ️') || msg.startsWith('❌')) {
                bleStatusTimerRef.current = setTimeout(() => setBleQuickStatus(null), 5000);
            }
        };
        bleSendJson(bleJson, { ...BLE_DEFAULTS, onStatus, onProgress: setBleQuickProgress });
    };

    return (
        <div className="editor-layout">
            {/* ── Top bar ─────────────────────────────────────────────── */}
            <header className="editor-header">
                <button className="btn btn-secondary btn-sm" onClick={onBack}>
                    ← Back
                </button>
                <input
                    className="editor-title-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Screen title…"
                />
                <span className="editor-display-info">
                    {screen?.displayType} · {displayWidth}×{displayHeight} · {displayBpp}BPP
                    {rotation === 1 ? ' · 📱 Portrait' : ''}
                </span>

                <div className="editor-header-actions">
                    <label className="scale-label">
                        Zoom:
                        <select value={scale} onChange={(e) => setScale(parseFloat(e.target.value))}>
                            {SCALE_OPTIONS.map((s) => (
                                <option key={s} value={s}>{Math.round(s * 100)}%</option>
                            ))}
                        </select>
                    </label>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setRotation((r) => (r === 0 ? 1 : 0))}
                        title={rotation === 0 ? 'Switch to portrait mode (90° rotation)' : 'Switch to landscape mode'}
                    >
                        {rotation === 0 ? '🖥 Landscape' : '📱 Portrait'}
                    </button>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={handleBleQuickSend}
                        disabled={!!bleQuickProgress}
                        title="Send JSON to ESP32 via BLE (uses default FastJsonDL UUIDs — open JSON panel to customise)"
                    >
                        {bleQuickProgress
                            ? `📤 ${Math.round((bleQuickProgress.sent / bleQuickProgress.total) * 100)}%`
                            : '🔵 BLE Send'}
                    </button>
                    {bleQuickStatus && (
                        <span className="editor-ble-status" title={bleQuickStatus}>
                            {bleQuickStatus}
                        </span>
                    )}
                    <button className={`btn btn-secondary btn-sm${showJson ? ' btn-active' : ''}`} onClick={() => setShowJson((v) => !v)}>
                        {'{ }'} JSON
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={handleExport}>
                        Export
                    </button>
                    {currentUser ? (
                        <>
                            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                            <span className="auth-greeting btn-sm">👤 {currentUser.firstName}</span>
                            <a href="/logout" className="btn btn-secondary btn-sm">Sign out</a>
                        </>
                    ) : (
                        <a href="/login" className="btn btn-primary btn-sm" title="Sign in to save your work">
                            🔑 Sign in to Save
                        </a>
                    )}
                </div>
            </header>

            {error && <div className="editor-error">{error}</div>}

            {/* ── Main area ───────────────────────────────────────────── */}
            <div className="editor-body">
                {/* Left: toolbar */}
                <Toolbar
                    onAdd={handleAdd}
                    onStartDraw={handleStartDraw}
                    onSelectMode={handleSelectMode}
                    onImportImage={() => setShowImporter(true)}
                    drawMode={drawMode}
                    drawColor={drawColor}
                    drawColorMax={(1 << displayBpp) - 1}
                    onDrawColorChange={setDrawColor}
                    currentUser={currentUser}
                />

                {/* Centre: scrollable canvas */}
                <div className="canvas-area">
                    <div
                        className="canvas-scroll"
                        style={{
                            minWidth: displayWidth * scale + 40,
                            minHeight: displayHeight * scale + 40,
                        }}
                    >
                        <Canvas
                            items={items}
                            selectedIndex={selectedIndex}
                            onSelect={setSelectedIndex}
                            onMove={handleMove}
                            onCommitMove={handleCommitMove}
                            onTextEdit={handleTextEdit}
                            displayWidth={displayWidth}
                            displayHeight={displayHeight}
                            displayBpp={displayBpp}
                            scale={scale}
                            drawMode={drawMode}
                            lineFirstPoint={lineFirstPoint}
                            onCanvasClick={handleCanvasClick}
                            onCanvasPaint={handleCanvasPaint}
                        />
                    </div>
                </div>

                {/* Right: properties panel */}
                <div className="right-panel">
                    <PropertiesPanel
                        item={selectedIndex !== null ? items[selectedIndex] : null}
                        displayBpp={displayBpp}
                        onChange={handlePropChange}
                        onDelete={handleDelete}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                    />
                </div>
            </div>

            {/* ── JSON footer bar ──────────────────────────────────── */}
            {showJson && (
                <JsonFooter
                    screen={{ ...screen, items, rotation }}
                    height={jsonFooterHeight}
                    onDragHandleMouseDown={handleFooterDragStart}
                    onClose={() => setShowJson(false)}
                />
            )}

            {/* ── Image import modal ─────────────────────────────── */}
            {showImporter && (
                <ImageImporter
                    onAdd={handleAdd}
                    onClose={() => setShowImporter(false)}
                    displayWidth={displayWidth}
                    displayHeight={displayHeight}
                />
            )}
        </div>
    );
}
