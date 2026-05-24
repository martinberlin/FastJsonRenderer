import React, { useCallback, useState } from 'react';

// BLE_CHUNK_SIZE: maximum bytes per BLE write-without-response operation.
// Modern BLE stacks negotiate extended MTU (up to 512 bytes) after connection;
// 512 is used here as a safe upper bound.  If your firmware uses a smaller MTU,
// lower this value accordingly.
const BLE_CHUNK_SIZE = 512;

// Default NUS (Nordic UART Service) UUIDs used by the FastJsonDL firmware.
// These can be overridden by the user in the BLE modal.
const DEFAULT_SERVICE_UUID      = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const DEFAULT_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

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
    const [serviceUuid, setServiceUuid] = useState(DEFAULT_SERVICE_UUID);
    const [charUuid, setCharUuid] = useState(DEFAULT_CHARACTERISTIC_UUID);

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
    const handleBleSend = useCallback(async () => {
        if (!navigator.bluetooth) {
            setBleStatus('❌ Web Bluetooth is not available. Use Chrome/Edge on HTTPS or localhost / 127.0.0.1.');
            return;
        }
        setBleStatus('🔍 Requesting BLE device…');
        setBleProgress(null);
        try {
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ services: [serviceUuid] }],
            });
            setBleStatus(`🔗 Connecting to "${device.name ?? 'device'}"…`);
            const server = await device.gatt.connect();
            setBleStatus('📡 Accessing service…');
            const service = await server.getPrimaryService(serviceUuid);
            const characteristic = await service.getCharacteristic(charUuid);

            const data = new TextEncoder().encode(json);
            const total = data.length;
            let sent = 0;
            setBleStatus('📤 Sending…');
            while (sent < total) {
                const chunk = data.slice(sent, sent + BLE_CHUNK_SIZE);
                await characteristic.writeValueWithoutResponse(chunk);
                sent += chunk.length;
                setBleProgress({ sent, total });
            }
            setBleStatus(`✅ Sent ${total} bytes successfully.`);
            setBleProgress(null);
        } catch (err) {
            if (err.name === 'NotFoundError') {
                setBleStatus('ℹ️ No device selected.');
            } else {
                setBleStatus(`❌ BLE error: ${err.message}`);
            }
            setBleProgress(null);
        }
    }, [json, serviceUuid, charUuid]);

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
                        Requires Chrome / Edge on HTTPS (or localhost / 127.0.0.1). The UUIDs above match the default Nordic
                        UART Service used by FastJsonDL firmware — change them if your firmware uses custom UUIDs.
                        Chunk size assumes extended MTU (512 B); lower <code>BLE_CHUNK_SIZE</code> in the source if your
                        device uses a smaller MTU.
                    </p>
                </div>
            )}

            {/* Scrollable code block */}
            <pre className="json-footer-code">{json}</pre>
        </div>
    );
}
