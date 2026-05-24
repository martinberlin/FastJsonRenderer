import React, { useCallback, useState } from 'react';
import { BLE_DEFAULTS, bleSendJson } from '../utils/bleSend';

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
    const [showBle, setShowBle] = useState(false);
    const [bleStatus, setBleStatus] = useState(null);   // null | string
    const [bleProgress, setBleProgress] = useState(null); // null | { sent, total }
    const [deviceName, setDeviceName] = useState(BLE_DEFAULTS.deviceName);
    const [serviceUuid, setServiceUuid] = useState(BLE_DEFAULTS.serviceUuid);
    const [charUuid, setCharUuid] = useState(BLE_DEFAULTS.charUuid);

    if (!screen) return null;

    const payload = {
        display_bpp: screen.displayBpp,
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

    // ── BLE send ──────────────────────────────────────────────────────────
    const handleBleSend = useCallback(() => {
        bleSendJson(json, { deviceName, serviceUuid, charUuid, onStatus: setBleStatus, onProgress: setBleProgress });
    }, [json, deviceName, serviceUuid, charUuid]);

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
                        className={`btn btn-secondary btn-sm${showBle ? ' btn-active' : ''}`}
                        onClick={() => { setShowBle((v) => !v); setBleStatus(null); setBleProgress(null); }}
                        title="Send JSON to ESP32 via Bluetooth"
                    >
                        🔵 BLE
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

            {/* BLE panel */}
            {showBle && (
                <div className="ble-panel">
                    <div className="ble-panel-row">
                        <label className="ble-label">Device Name</label>
                        <input
                            className="ble-input"
                            value={deviceName}
                            onChange={(e) => setDeviceName(e.target.value)}
                            spellCheck={false}
                        />
                    </div>
                    <div className="ble-panel-row">
                        <label className="ble-label">Service UUID</label>
                        <input
                            className="ble-input"
                            value={serviceUuid}
                            onChange={(e) => setServiceUuid(e.target.value.trim())}
                            spellCheck={false}
                        />
                    </div>
                    <div className="ble-panel-row">
                        <label className="ble-label">Characteristic UUID</label>
                        <input
                            className="ble-input"
                            value={charUuid}
                            onChange={(e) => setCharUuid(e.target.value.trim())}
                            spellCheck={false}
                        />
                    </div>
                    <div className="ble-panel-row">
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={handleBleSend}
                            disabled={!!bleProgress}
                        >
                            {bleProgress ? `Sending… ${bleProgress.sent}/${bleProgress.total} B` : 'Connect & Send'}
                        </button>
                        {bleProgress && (
                            <div className="ble-progress-bar">
                                <div
                                    className="ble-progress-fill"
                                    style={{ width: `${Math.round((bleProgress.sent / bleProgress.total) * 100)}%` }}
                                />
                            </div>
                        )}
                        {bleStatus && (
                            <span className="ble-status">{bleStatus}</span>
                        )}
                    </div>
                    <p className="ble-hint">
                        Requires Chrome / Edge on HTTPS (or localhost / 127.0.0.1). Discovery uses both the
                        service UUID filter and the device name filter — name matching is a reliable fallback when
                        the ESP32 advertisement packet overflows 31 bytes and the service UUID is dropped from it.
                        Each transfer is preceded by an 8-byte header (type <code>0x0001</code> + uint48 length,
                        both little-endian) as required by the FastJsonDL firmware.
                    </p>
                </div>
            )}

            {/* Scrollable code block */}
            <pre className="json-footer-code">{json}</pre>
        </div>
    );
}
