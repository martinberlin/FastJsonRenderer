import React, { useState } from 'react';

/**
 * JsonFooter – a collapsible, resizable footer panel that shows the live
 * FastJsonDL JSON payload for the current screen design.
 *
 * Props:
 *  - screen                  Current screen state (with items)
 *  - height                  Pixel height of the panel (controlled by Editor)
 *  - onDragHandleMouseDown   Called when the user starts dragging the resize handle
 *  - onClose()               Called when the user clicks ✕
 */
export default function JsonFooter({ screen, height, onDragHandleMouseDown, onClose }) {
    const [copied, setCopied] = useState(false);

    if (!screen) return null;

    const payload = {
        display_bpp: screen.displayBpp,
        rotation: (screen.rotation ?? 0) * 90,
        clear: true,
        items: screen.items,
    };
    const json = JSON.stringify(payload, null, 2);
    const itemCount = screen.items?.length ?? 0;
    const byteCount = new TextEncoder().encode(json).length;
    const kbCount   = (byteCount / 1024).toFixed(1);
    const sizeWarn  = byteCount > 50 * 1024;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(json);
        } catch {
            // Fallback for older browsers / non-HTTPS
            const ta = document.createElement('textarea');
            ta.value = json;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="json-footer" style={{ height }}>
            {/* Drag handle – grab and pull up/down to resize the panel */}
            <div
                className="json-footer-handle"
                onMouseDown={onDragHandleMouseDown}
                title="Drag to resize"
            />

            {/* Bar: label + item count + actions */}
            <div className="json-footer-bar">
                <span className="json-footer-title">
                    <span className="json-footer-brace">{'{ }'}</span>
                    FastJsonDL JSON
                    <span className="json-footer-count">
                        {itemCount} item{itemCount !== 1 ? 's' : ''}
                    </span>
                    <span className={`json-footer-size${sizeWarn ? ' json-footer-size-warn' : ''}`}
                        title={sizeWarn ? 'Payload exceeds 50 KB – BLE transmission may be slow' : `${byteCount} bytes`}
                    >
                        {kbCount} KB{sizeWarn ? ' ⚠' : ''}
                    </span>
                </span>

                <div className="json-footer-actions">
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={handleCopy}
                        title="Copy JSON to clipboard"
                    >
                        {copied ? '✓ Copied!' : 'Copy'}
                    </button>
                    <button
                        className="json-footer-close"
                        onClick={onClose}
                        title="Close JSON preview"
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Scrollable code block */}
            <pre className="json-footer-code">{json}</pre>
        </div>
    );
}
