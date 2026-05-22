import React, { useCallback, useEffect, useRef, useState } from 'react';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import PropertiesPanel from './PropertiesPanel';
import JsonPreview from './JsonPreview';

const SCALE_OPTIONS = [0.25, 0.33, 0.5, 0.67, 0.75, 1.0];

/**
 * Editor – the full canvas-based screen design interface.
 *
 * Props:
 *  - screenId   ID of an existing screen to load, or null to start fresh
 *  - onBack()   Navigate back to the screen list
 */
export default function Editor({ screenId, onBack }) {
    const [screen, setScreen] = useState(null);
    const [loading, setLoading] = useState(!!screenId);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [scale, setScale] = useState(0.5);
    const [showJson, setShowJson] = useState(false);
    const [title, setTitle] = useState('');

    // Unsaved items buffer (working copy of screen.items during editing)
    const [items, setItems] = useState([]);

    // Snapshot of items before a drag starts – used to compute position from delta
    const snapRef = useRef([]);

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
                items: [],
            };
            setScreen(draft);
            setItems(draft.items);
            setTitle(draft.title);
            return;
        }

        fetch(`/api/screens/${screenId}`)
            .then((r) => r.json())
            .then((s) => {
                setScreen(s);
                setItems(s.items);
                setTitle(s.title);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [screenId]);

    // ------------ save ---------------------------------------------------
    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const body = { ...screen, title, items };
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
    const handleMove = useCallback((index, dx, dy, origItem) => {
        setItems((prev) => {
            const next = [...prev];
            const item = origItem;
            if (item.type === 'drawLine') {
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
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [handleDelete, handleSave]);

    if (loading) return <div className="status-msg">Loading screen…</div>;

    const displayWidth = screen?.displayWidth ?? 1280;
    const displayHeight = screen?.displayHeight ?? 780;
    const displayBpp = screen?.displayBpp ?? 4;

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
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowJson((v) => !v)}>
                        {showJson ? 'Hide JSON' : 'Show JSON'}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={handleExport}>
                        Export
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </header>

            {error && <div className="editor-error">{error}</div>}

            {/* ── Main area ───────────────────────────────────────────── */}
            <div className="editor-body">
                {/* Left: toolbar */}
                <Toolbar onAdd={handleAdd} />

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
                            displayWidth={displayWidth}
                            displayHeight={displayHeight}
                            displayBpp={displayBpp}
                            scale={scale}
                        />
                    </div>
                </div>

                {/* Right: properties + optional JSON */}
                <div className="right-panel">
                    <PropertiesPanel
                        item={selectedIndex !== null ? items[selectedIndex] : null}
                        displayBpp={displayBpp}
                        onChange={handlePropChange}
                        onDelete={handleDelete}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                    />
                    {showJson && (
                        <JsonPreview screen={{ ...screen, items }} />
                    )}
                </div>
            </div>
        </div>
    );
}
