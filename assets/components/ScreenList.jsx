import React, { useEffect, useState } from 'react';

const DISPLAY_PRESETS = [
    { label: 'ED052TC4 – 1280×780 (16 grays)', type: 'ED052TC4', width: 1280, height: 780, bpp: 4 },
    { label: 'Generic 800×480 (4 grays)', type: 'GENERIC_800x480', width: 800, height: 480, bpp: 2 },
    { label: 'Generic 400×300 (B&W)', type: 'GENERIC_400x300', width: 400, height: 300, bpp: 1 },
];

/**
 * Lists all saved screens and provides Create / Edit / Delete actions.
 */
export default function ScreenList({ onEdit, onNew }) {
    const [screens, setScreens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showCreate, setShowCreate] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newPreset, setNewPreset] = useState(0);

    const fetchScreens = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/screens');
            if (!res.ok) throw new Error('Failed to load screens');
            setScreens(await res.json());
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchScreens(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        const preset = DISPLAY_PRESETS[newPreset];
        const res = await fetch('/api/screens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: newTitle || 'Untitled Screen',
                displayType: preset.type,
                displayWidth: preset.width,
                displayHeight: preset.height,
                displayBpp: preset.bpp,
                items: [],
            }),
        });
        if (res.ok) {
            const screen = await res.json();
            setShowCreate(false);
            setNewTitle('');
            onEdit(screen.id);
        }
    };

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Delete "${title}"?`)) return;
        await fetch(`/api/screens/${id}`, { method: 'DELETE' });
        fetchScreens();
    };

    const handleExport = async (id, title) => {
        const res = await fetch(`/api/screens/${id}/export`);
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${title.replace(/[^a-z0-9_-]/gi, '_')}.json`;
        a.click();
    };

    return (
        <div className="screen-list">
            <header className="app-header">
                <div className="header-brand">
                    <span className="header-icon">🖥</span>
                    <h1>FastJsonRenderer</h1>
                    <span className="header-sub">ePaper Screen Designer for FastJsonDL</span>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                    + New Screen
                </button>
            </header>

            {showCreate && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Create New Screen</h2>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label>Title</label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="My ePaper Design"
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label>Display</label>
                                <select value={newPreset} onChange={(e) => setNewPreset(Number(e.target.value))}>
                                    {DISPLAY_PRESETS.map((p, i) => (
                                        <option key={i} value={i}>{p.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <main className="screen-grid-container">
                {loading && <p className="status-msg">Loading…</p>}
                {error && <p className="status-msg error">{error}</p>}
                {!loading && !error && screens.length === 0 && (
                    <div className="empty-state">
                        <p>No screens yet.</p>
                        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                            Create your first screen
                        </button>
                    </div>
                )}
                <div className="screen-grid">
                    {screens.map((s) => (
                        <div key={s.id} className="screen-card">
                            <div className="screen-card-title">{s.title}</div>
                            <div className="screen-card-meta">
                                {s.displayType} · {s.displayWidth}×{s.displayHeight} · {s.displayBpp}BPP
                            </div>
                            <div className="screen-card-meta">
                                {s.itemCount} element{s.itemCount !== 1 ? 's' : ''} ·{' '}
                                Updated {new Date(s.updatedAt).toLocaleDateString()}
                            </div>
                            <div className="screen-card-actions">
                                <button className="btn btn-primary btn-sm" onClick={() => onEdit(s.id)}>
                                    Edit
                                </button>
                                <button className="btn btn-secondary btn-sm" onClick={() => handleExport(s.id, s.title)}>
                                    Export JSON
                                </button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id, s.title)}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
