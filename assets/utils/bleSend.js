// BLE send utility for FastJsonDL firmware.
//
// Used by both the quick-send button in the Editor header and the full BLE
// configuration panel in JsonFooter.

const BLE_CHUNK_SIZE = 244;
const BLE_NO_RESPONSE_PACING_MS = 10;

// Transfer protocol – 8-byte header prepended to every JSON payload.
//   Byte 0-1 : type   uint16 little-endian  0x0001 = JSON payload
//   Byte 2-7 : length uint48 little-endian  total JSON byte count
const HEADER_TYPE_JSON = 0x0001;

function buildHeader(jsonByteLength) {
    const header = new Uint8Array(8);
    const dv = new DataView(header.buffer);
    dv.setUint16(0, HEADER_TYPE_JSON, /* littleEndian */ true);
    // uint48 split into low 32 bits + high 16 bits
    dv.setUint32(2, jsonByteLength >>> 0, true);
    dv.setUint16(6, Math.floor(jsonByteLength / 0x100000000), true);
    return header;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/** Default NUS (Nordic UART Service) UUIDs and device name used by FastJsonDL firmware. */
export const BLE_DEFAULTS = {
    deviceName: 'FastJsonDL',
    serviceUuid: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    charUuid: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
};

/**
 * Send a JSON string to a BLE GATT device using the FastJsonDL 8-byte header protocol.
 *
 * @param {string}   json              JSON string to send
 * @param {object}   opts
 * @param {string}   opts.deviceName   BLE device name prefix filter (used when provided; falls back to service UUID otherwise)
 * @param {string}   opts.serviceUuid  NUS service UUID
 * @param {string}   opts.charUuid     NUS RX characteristic UUID
 * @param {function} opts.onStatus     (message: string) => void
 * @param {function} opts.onProgress   ({ sent, total } | null) => void
 */
export async function bleSendJson(json, { deviceName, serviceUuid, charUuid, onStatus, onProgress }) {
    if (!navigator.bluetooth) {
        onStatus('❌ Web Bluetooth is not available. Use Chrome/Edge on HTTPS or localhost / 127.0.0.1.');
        return;
    }
    onStatus('🔍 Requesting BLE device…');
    onProgress(null);
    try {
        // Build filters: use namePrefix when a device name is provided (reliable
        // even when the ESP32 advertisement overflows 31 bytes and drops the
        // service UUID), otherwise fall back to the service UUID filter.
        // Chrome requires exactly one approach – mixing both in separate filter
        // objects causes the picker to show no devices when the UUID is absent
        // from the advertisement.
        const filters = [];
        if (deviceName?.trim()) {
            filters.push({ namePrefix: deviceName.trim() });
        } else {
            filters.push({ services: [serviceUuid] });
        }
        const device = await navigator.bluetooth.requestDevice({
            filters,
            // optionalServices grants access to the service even when discovery
            // happened via the namePrefix filter rather than the service UUID filter.
            optionalServices: [serviceUuid],
        });
        onStatus(`🔗 Connecting to "${device.name ?? 'device'}"…`);
        const server = await device.gatt.connect();
        onStatus('📡 Accessing service…');
        const service = await server.getPrimaryService(serviceUuid);
        const characteristic = await service.getCharacteristic(charUuid);

        // Build payload: 8-byte header + raw JSON bytes
        const jsonBytes = new TextEncoder().encode(json);
        const jsonLen   = jsonBytes.length;
        const header    = buildHeader(jsonLen);
        const data      = new Uint8Array(8 + jsonLen);
        data.set(header, 0);
        data.set(jsonBytes, 8);

        const total = data.length;
        let sent = 0;
        onStatus('📤 Sending…');
        const canWriteWithResponse = characteristic.properties?.write;
        while (sent < total) {
            const chunk = data.slice(sent, sent + BLE_CHUNK_SIZE);
            if (canWriteWithResponse) {
                await characteristic.writeValueWithResponse(chunk);
            } else {
                await characteristic.writeValueWithoutResponse(chunk);
                await delay(BLE_NO_RESPONSE_PACING_MS);
            }
            sent += chunk.length;
            onProgress({ sent, total });
        }
        onStatus(`✅ Sent ${total} bytes (8-byte header + ${jsonLen} JSON).`);
        onProgress(null);
    } catch (err) {
        if (err.name === 'NotFoundError') {
            onStatus('ℹ️ No device selected.');
        } else {
            onStatus(`❌ BLE error: ${err.message}`);
        }
        onProgress(null);
    }
}
