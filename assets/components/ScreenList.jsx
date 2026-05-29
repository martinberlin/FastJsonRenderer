import React, { useEffect, useState } from 'react';

const DISPLAY_PRESETS = [
    { label: 'ED052TC4 – 1280×780 (16 grays)', type: 'ED052TC4', width: 1280, height: 780, bpp: 4 },
    { label: 'ED060SCT – 600×800 6" (16 grays)', type: 'ED060SCT', width: 600, height: 800, bpp: 4 },
    { label: 'ED060XH2 – 758×1024 6" (16 grays)', type: 'ED060XH2', width: 758, height: 1024, bpp: 4 },
    { label: 'ED060KD1 – 1072×1448 6" (16 grays)', type: 'ED060KD1', width: 1072, height: 1448, bpp: 4 },
    { label: 'ED133UT2 – 1600×1200 13.3" (16 grays)', type: 'ED133UT2', width: 1600, height: 1200, bpp: 4 },
    { label: 'ED078KC1 – 1872×1404 7.8" (16 grays)', type: 'ED078KC1', width: 1872, height: 1404, bpp: 4 },
    { label: 'Generic 800×480 (4 grays)', type: 'GENERIC_800x480', width: 800, height: 480, bpp: 2 },
    { label: 'Generic 400×300 (B&W)', type: 'GENERIC_400x300', width: 400, height: 300, bpp: 1 },
];

/**
 * Lists all saved screens and provides Create / Edit / Delete actions.
 * Requires a logged-in user to create/edit/delete screens.
 */
export default function ScreenList({ onEdit, onNew, currentUser }) {
    const [screens, setScreens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showCreate, setShowCreate] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newPreset, setNewPreset] = useState(0);
    const [newRotation, setNewRotation] = useState(0);

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

    useEffect(() => { fetchScreens(); }, [currentUser]);

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
                rotation: newRotation,
                items: [],
            }),
        });
        if (res.ok) {
            const screen = await res.json();
            setShowCreate(false);
            setNewTitle('');
            setNewRotation(0);
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
                <div className="header-auth">
                    {currentUser ? (
                        <>
                            <span className="auth-greeting">👤 {currentUser.firstName}</span>
                            <a href="/logout" className="btn btn-secondary btn-sm">Sign out</a>
                        </>
                    ) : (
                        <a href="/login" className="btn btn-primary btn-sm">Sign in with GitHub</a>
                    )}
                </div>
                {currentUser && (
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                        + New Screen
                    </button>
                )}
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
                            <div className="form-group">
                                <label>Orientation</label>
                                <select value={newRotation} onChange={(e) => setNewRotation(Number(e.target.value))}>
                                    <option value={0}>🖥 Landscape (default)</option>
                                    <option value={1}>📱 Portrait (90° rotation)</option>
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
                {!loading && !error && !currentUser && (
                    <div className="empty-state">
                        <p>Sign in to save and manage your ePaper screen designs.</p>
                        <p className="empty-state-sub">You can still open the editor and draw/send via BLE without signing in.</p>
                        <div className="empty-state-actions">
                            <a href="/login" className="btn btn-primary">Sign in with GitHub</a>
                            <button className="btn btn-secondary" onClick={onNew}>Try the editor (no save)</button>
                        </div>
                    </div>
                )}
                {!loading && !error && currentUser && screens.length === 0 && (
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
                                {s.rotation === 1 ? ' · 📱 Portrait' : ''}
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
