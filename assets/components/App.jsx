import React, { useState, useEffect } from 'react';
import ScreenList from './ScreenList';
import Editor from './Editor';

/**
 * Root application component.
 * Handles top-level routing between the screen list and the canvas editor.
 */
export default function App() {
    // Simple client-side routing via state (avoids react-router dependency complexity)
    const [route, setRoute] = useState(() => {
        const path = window.location.pathname;
        const match = path.match(/^\/editor\/(\d+)$/);
        if (match) return { view: 'editor', screenId: parseInt(match[1], 10) };
        if (path === '/editor/new') return { view: 'editor', screenId: null };
        return { view: 'list' };
    });

    // Current authenticated user (null = guest)
    const [currentUser, setCurrentUser] = useState(undefined); // undefined = loading

    useEffect(() => {
        fetch('/api/me')
            .then((r) => r.json())
            .then((u) => setCurrentUser(u))
            .catch(() => setCurrentUser(null));
    }, []);

    // Keep the browser URL in sync
    useEffect(() => {
        const url =
            route.view === 'editor'
                ? route.screenId
                    ? `/editor/${route.screenId}`
                    : '/editor/new'
                : '/';
        window.history.pushState({}, '', url);
    }, [route]);

    const navigate = (view, screenId = null) => setRoute({ view, screenId });

    // Don't render until we know the auth state
    if (currentUser === undefined) return null;

    if (route.view === 'editor') {
        return (
            <Editor
                screenId={route.screenId}
                onBack={() => navigate('list')}
                currentUser={currentUser}
            />
        );
    }

    return (
        <ScreenList
            onEdit={(id) => navigate('editor', id)}
            onNew={() => navigate('editor', null)}
            currentUser={currentUser}
        />
    );
}
