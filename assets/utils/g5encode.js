/**
 * G5 image encoding utility for FastEPD e-paper displays.
 *
 * G5 is a 1bpp compressed bitmap format used by the FastEPD firmware
 * (https://github.com/bitbank2/FastEPD). This encoder converts RGBA pixel
 * data to a portable 1bpp run-length-encoded format compatible with the
 * drawG5() firmware function.
 *
 * Wire format
 * ───────────
 *   [uint16_le width] [uint16_le height]
 *   for each row:
 *     [uint16_le runCount]
 *     [uint16_le run_0] [uint16_le run_1] … [uint16_le run_(runCount-1)]
 *
 * Runs alternate black (0) / white (1). The first run is always black; if
 * the row actually starts with a white pixel a zero-length black run is
 * prepended automatically.
 */

/** Weighted luminance of one RGBA pixel starting at byte offset `off`. */
function luminance(rgba, off) {
    return 0.299 * rgba[off] + 0.587 * rgba[off + 1] + 0.114 * rgba[off + 2];
}

/**
 * Convert RGBA pixel data to a G5-encoded Uint8Array.
 *
 * @param {Uint8ClampedArray} rgba      Flat RGBA data, 4 bytes per pixel.
 * @param {number}            width
 * @param {number}            height
 * @param {number}            threshold Luminance threshold (0-255); pixels
 *                                      below → black, at/above → white.
 * @returns {Uint8Array}
 */
export function rgbaToG5(rgba, width, height, threshold = 128) {
    const parts = [];

    // 4-byte header
    const header = new Uint8Array(4);
    const hv = new DataView(header.buffer);
    hv.setUint16(0, width, true);
    hv.setUint16(2, height, true);
    parts.push(header);

    for (let y = 0; y < height; y++) {
        const runs = [];
        let currentBit = 0; // always start encoding as black
        let count = 0;

        // If the row actually begins with a white pixel, prepend an empty black run
        const firstLum = luminance(rgba, y * width * 4);
        if (firstLum >= threshold) {
            runs.push(0);
            currentBit = 1;
        }

        for (let x = 0; x < width; x++) {
            const bit = luminance(rgba, (y * width + x) * 4) >= threshold ? 1 : 0;
            if (bit === currentBit) {
                count++;
            } else {
                runs.push(count);
                count = 1;
                currentBit = bit;
            }
        }
        runs.push(count);

        // Encode: uint16_le runCount, then uint16_le per run
        const rowBuf = new Uint8Array(2 + runs.length * 2);
        const rv = new DataView(rowBuf.buffer);
        rv.setUint16(0, runs.length, true);
        for (let i = 0; i < runs.length; i++) {
            rv.setUint16(2 + i * 2, runs[i], true);
        }
        parts.push(rowBuf);
    }

    const total = parts.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const p of parts) { out.set(p, off); off += p.length; }
    return out;
}

/**
 * Convert an HTMLImageElement to G5 data *and* a 1-bit preview PNG.
 *
 * The image is drawn onto an offscreen canvas at the given target size,
 * converted to greyscale, thresholded, then G5-encoded.
 *
 * @param {HTMLImageElement} img
 * @param {number}           targetWidth
 * @param {number}           targetHeight
 * @param {number}           threshold   0-255
 * @returns {{ g5: Uint8Array, previewDataUrl: string }}
 */
export function imageToG5(img, targetWidth, targetHeight, threshold = 128) {
    // ── source canvas: greyscale render ──────────────────────────────────
    const src = document.createElement('canvas');
    src.width = targetWidth;
    src.height = targetHeight;
    const sctx = src.getContext('2d');
    sctx.filter = 'grayscale(1)';
    sctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    const imageData = sctx.getImageData(0, 0, targetWidth, targetHeight);

    // ── G5 encode ─────────────────────────────────────────────────────────
    const g5 = rgbaToG5(imageData.data, targetWidth, targetHeight, threshold);

    // ── 1-bit preview PNG ─────────────────────────────────────────────────
    const prev = document.createElement('canvas');
    prev.width = targetWidth;
    prev.height = targetHeight;
    const pctx = prev.getContext('2d');
    const pd = pctx.createImageData(targetWidth, targetHeight);
    for (let i = 0; i < targetWidth * targetHeight; i++) {
        const v = luminance(imageData.data, i * 4) >= threshold ? 255 : 0;
        pd.data[i * 4]     = v;
        pd.data[i * 4 + 1] = v;
        pd.data[i * 4 + 2] = v;
        pd.data[i * 4 + 3] = 255;
    }
    pctx.putImageData(pd, 0, 0);

    return { g5, previewDataUrl: prev.toDataURL('image/png') };
}

/**
 * Base64-encode a Uint8Array for JSON storage.
 */
export function g5ToBase64(data) {
    let bin = '';
    for (let i = 0; i < data.length; i++) bin += String.fromCharCode(data[i]);
    return btoa(bin);
}
