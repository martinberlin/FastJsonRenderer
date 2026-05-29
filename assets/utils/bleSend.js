// BLE send utility for FastJsonDL firmware.
//
// Used by both the quick-send button in the Editor header and the full BLE
// configuration panel in JsonFooter.

const BLE_CHUNK_SIZE = 512;

// Transfer protocol – 8-byte header prepended to every JSON payload.
//   Byte 0-1 : type   uint16 little-endian  0x0001 = plain JSON
//                                            0x0002 = raw-deflate compressed JSON (miniz compatible)
//   Byte 2-7 : length uint48 little-endian  total payload byte count
const HEADER_TYPE_JSON = 0x0001;
const HEADER_TYPE_ZLIB = 0x0002;

function buildHeader(type, byteLength) {
    const header = new Uint8Array(8);
    const dv = new DataView(header.buffer);
    dv.setUint16(0, type, /* littleEndian */ true);
    // uint48 split into low 32 bits + high 16 bits
    dv.setUint32(2, byteLength >>> 0, true);
    dv.setUint16(6, Math.floor(byteLength / 0x100000000), true);
    return header;
}

/**
 * Compress bytes using raw DEFLATE (no zlib/gzip wrapper).
 * Compatible with miniz tinfl_decompress on the firmware side.
 * Uses the browser-native CompressionStream API (Chrome 80+, Edge 80+).
 *
 * @param {Uint8Array} bytes  Input bytes
 * @returns {Promise<Uint8Array>} Compressed bytes
 */
async function compressDeflate(bytes) {
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const chunks = [];
    const reader = cs.readable.getReader();
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
    return result;
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
 * @param {boolean}  [opts.compress]   When true, compress the payload with raw DEFLATE (header type 0x0002)
 * @param {function} opts.onStatus     (message: string) => void
 * @param {function} opts.onProgress   ({ sent, total } | null) => void
 */
export async function bleSendJson(json, { deviceName, serviceUuid, charUuid, compress, onStatus, onProgress }) {
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

        // Build payload: 8-byte header + (optionally compressed) JSON bytes
        const jsonBytes = new TextEncoder().encode(json);
        let payloadBytes;
        let headerType;
        if (compress) {
            onStatus('🗜️ Compressing…');
            payloadBytes = await compressDeflate(jsonBytes);
            headerType = HEADER_TYPE_ZLIB;
        } else {
            payloadBytes = jsonBytes;
            headerType = HEADER_TYPE_JSON;
        }
        const payloadLen = payloadBytes.length;
        const header = buildHeader(headerType, payloadLen);
        const data = new Uint8Array(8 + payloadLen);
        data.set(header, 0);
        data.set(payloadBytes, 8);

        const total = data.length;
        let sent = 0;
        onStatus('📤 Sending…');
        while (sent < total) {
            const chunk = data.slice(sent, sent + BLE_CHUNK_SIZE);
            await characteristic.writeValueWithoutResponse(chunk);
            sent += chunk.length;
            onProgress({ sent, total });
        }
        if (compress) {
            const ratio = ((1 - payloadLen / jsonBytes.length) * 100).toFixed(0);
            onStatus(`✅ Sent ${total} bytes (8-byte header + ${payloadLen} compressed, ${ratio}% smaller than ${jsonBytes.length} raw).`);
        } else {
            onStatus(`✅ Sent ${total} bytes (8-byte header + ${payloadLen} JSON).`);
        }
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
