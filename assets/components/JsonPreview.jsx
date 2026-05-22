import React, { useState } from 'react';

/**
 * JsonPreview – shows the FastJsonDL JSON payload for the current screen.
 * Provides a one-click copy-to-clipboard button.
 */
export default function JsonPreview({ screen }) {
    const [copied, setCopied] = useState(false);

    if (!screen) return null;

    const payload = {
        display_bpp: screen.displayBpp,
        clear: true,
        items: screen.items,
    };
    const json = JSON.stringify(payload, null, 2);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(json);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const ta = document.createElement('textarea');
            ta.value = json;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="json-preview">
            <div className="json-preview-header">
                <span>FastJsonDL JSON</span>
                <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
                    {copied ? '✓ Copied!' : 'Copy'}
                </button>
            </div>
            <pre className="json-code">{json}</pre>
        </div>
    );
}
