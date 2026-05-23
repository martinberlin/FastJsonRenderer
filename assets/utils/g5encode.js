/**
 * G5 image encoding utility for FastEPD e-paper displays.
 *
 * G5 is a 1bpp compressed bitmap format used by the FastEPD firmware
 * (https://github.com/bitbank2/FastEPD). This encoder converts RGBA pixel
 * data to a proper BB_BITMAP + Group5 VLC-compressed bitstream, exactly
 * matching the format expected by the loadG5Image / bbepLoadG5 firmware
 * function (src/bb_ep_gfx.inl).
 *
 * Wire format
 * ───────────
 *   BB_BITMAP header (8 bytes, little-endian):
 *     uint16 u16Marker = 0xBBBF  → bytes [0xBF, 0xBB]
 *     uint16 width
 *     uint16 height
 *     uint16 size   (bytes of G5 data that follow, not including this header)
 *   Group5 VLC bitstream (big-endian bit-packing, CCITT Group4-based 2D coding)
 *
 * Ported from bitbank2/FastEPD src/g5enc.inl (Apache 2.0).
 */

// ── constants ────────────────────────────────────────────────────────────────

// BB_BITMAP_MARKER = 0xBBBF stored little-endian in the header
const BB_BITMAP_MARKER = 0xBBBF;
const MAX_FLIPS = 512; // max colour-change positions per line

// Vertical codes [code, length] for V(-3) … V(3) (index = (delta+3)*2)
const VTABLE = [3, 7,  3, 6,  3, 3,  1, 1,  2, 3,  2, 6,  2, 7];
const HORIZ_SS = 0, HORIZ_SL = 1, HORIZ_LS = 2, HORIZ_LL = 3;

// Pre-computed: number of consecutive 1-bits from the MSB for each byte value
const BITCOUNT = new Uint8Array(256);
(function buildBitcount() {
    for (let i = 0; i < 256; i++) {
        let n = 0;
        for (let b = 7; b >= 0; b--) { if ((i >> b) & 1) n++; else break; }
        BITCOUNT[i] = n;
    }
})();

// ── bit-stream writer (big-endian, MSB first) ─────────────────────────────────
// Mirrors G5ENCInsertCode / G5ENCFlushBits from g5enc.inl.

class G5BitWriter {
    constructor(maxBytes) {
        this._buf = new Uint8Array(maxBytes);
        this._pos = 0;
        this._bits = 0;   // 32-bit accumulator (unsigned)
        this._off = 0;    // number of valid bits in _bits
    }

    insertCode(code, len) {
        const total = this._off + len;
        if (total > 32) {
            // Upper (32 - _off) bits go into current accumulator, then flush 4 bytes
            this._bits = (this._bits | (code >>> (total - 32))) >>> 0;
            this._buf[this._pos++] = (this._bits >>> 24) & 0xFF;
            this._buf[this._pos++] = (this._bits >>> 16) & 0xFF;
            this._buf[this._pos++] = (this._bits >>>  8) & 0xFF;
            this._buf[this._pos++] =  this._bits         & 0xFF;
            this._off  = total - 32;
            this._bits = (this._off > 0) ? (code << (32 - this._off)) >>> 0 : 0;
        } else {
            this._bits = (this._bits | (code << (32 - total))) >>> 0;
            this._off  = total;
        }
    }

    flush() {
        while (this._off >= 8) {
            this._buf[this._pos++] = (this._bits >>> 24) & 0xFF;
            this._bits = (this._bits << 8) >>> 0;
            this._off -= 8;
        }
        if (this._off > 0) {
            this._buf[this._pos++] = (this._bits >>> 24) & 0xFF;
        }
        this._bits = 0;
        this._off  = 0;
    }

    result() { return this._buf.subarray(0, this._pos); }
}

// ── line flip encoder ─────────────────────────────────────────────────────────
// Converts a row of 0/1 pixel values (0=black, 1=white) into an array of
// colour-change positions used by the G5 VLC encoder. Mirrors G5ENCEncodeLine.
// Returns an Int16Array: [startB0, startW0, startB1, startW1, …, w, w, w, w]

function lineToFlips(pixels, width) {
    const flips = new Int16Array(MAX_FLIPS + 4).fill(width);
    let fi = 0;
    let curColor = 1; // G5 convention: row implicitly starts white
    for (let x = 0; x < width; x++) {
        if (pixels[x] !== curColor) {
            if (fi < MAX_FLIPS) flips[fi++] = x;
            curColor = pixels[x];
        }
    }
    // Terminate with four copies of width
    if (fi < MAX_FLIPS) flips[fi++] = width;
    if (fi < MAX_FLIPS) flips[fi++] = width;
    if (fi < MAX_FLIPS) flips[fi++] = width;
    if (fi < MAX_FLIPS) flips[fi++] = width;
    return flips;
}

// ── core G5 encoder ───────────────────────────────────────────────────────────
// pixels2d[y][x] = 0 (black) or 1 (white). Returns compressed Uint8Array.

function encodeG5(pixels2d, width, height) {
    // iHLen = number of bits needed to represent the max run = width
    const iHLen = 32 - Math.clz32(width);
    const bw = new G5BitWriter(width * height + 1024);

    // Reference line starts all-"no flip" (equivalent to all-white)
    let refFlips = new Int16Array(MAX_FLIPS + 4).fill(width);

    for (let y = 0; y < height; y++) {
        const curFlips = lineToFlips(pixels2d[y], width);

        let a0 = 0;
        let iCur = 0;
        let iRef = 0;

        while (a0 < width) {
            const b2 = refFlips[iRef + 1];
            const a1 = curFlips[iCur];

            if (b2 < a1) {
                // ── Pass mode ──────────────────────────────────────────────
                a0 = b2;
                iRef += 2;
                bw.insertCode(1, 4); // 0001

            } else {
                const dx = refFlips[iRef] - a1; // b1 - a1

                if (dx > 3 || dx < -3) {
                    // ── Horizontal mode ────────────────────────────────────
                    bw.insertCode(1, 3); // 001
                    const run1 = curFlips[iCur]     - a0;
                    const run2 = curFlips[iCur + 1] - curFlips[iCur];

                    if (run1 < 8) {
                        if (run2 < 8) { bw.insertCode(HORIZ_SS, 2); bw.insertCode(run1, 3);      bw.insertCode(run2, 3); }
                        else          { bw.insertCode(HORIZ_SL, 2); bw.insertCode(run1, 3);      bw.insertCode(run2, iHLen); }
                    } else {
                        if (run2 < 8) { bw.insertCode(HORIZ_LS, 2); bw.insertCode(run1, iHLen); bw.insertCode(run2, 3); }
                        else          { bw.insertCode(HORIZ_LL, 2); bw.insertCode(run1, iHLen); bw.insertCode(run2, iHLen); }
                    }

                    a0 = curFlips[iCur + 1];
                    if (a0 !== width) {
                        iCur += 2;
                        while (refFlips[iRef] !== width && refFlips[iRef] <= a0) iRef += 2;
                    }

                } else {
                    // ── Vertical mode ──────────────────────────────────────
                    const vi = (dx + 3) * 2;
                    bw.insertCode(VTABLE[vi], VTABLE[vi + 1]);

                    a0 = a1;
                    if (a0 !== width) {
                        if (iRef !== 0) iRef -= 2;
                        iRef++;
                        iCur++;
                        while (refFlips[iRef] <= a0 && refFlips[iRef] !== width) iRef += 2;
                    }
                }
            }
        } // while a0 < width

        refFlips = curFlips;
    } // for y

    bw.flush();
    return bw.result();
}

// ── public API ────────────────────────────────────────────────────────────────

/** Weighted luminance of one RGBA pixel starting at byte offset `off`. */
function luminance(rgba, off) {
    return 0.299 * rgba[off] + 0.587 * rgba[off + 1] + 0.114 * rgba[off + 2];
}

/**
 * Convert RGBA pixel data to a BB_BITMAP + G5-encoded Uint8Array.
 * The output starts with an 8-byte BB_BITMAP header followed by the
 * Group5 VLC compressed bitstream. This is the exact format expected by
 * bbepLoadG5() / loadG5Image in FastEPD firmware.
 *
 * @param {Uint8ClampedArray} rgba      Flat RGBA data, 4 bytes per pixel.
 * @param {number}            width
 * @param {number}            height
 * @param {number}            threshold Luminance threshold (0-255); pixels
 *                                      below → black (0), at/above → white (1).
 * @param {boolean}           invert    When true, swap black and white pixels.
 * @returns {Uint8Array}
 */
export function rgbaToG5(rgba, width, height, threshold = 128, invert = false) {
    // Build 2-D pixel array (0=black, 1=white) for the encoder
    const pixels2d = [];
    for (let y = 0; y < height; y++) {
        const row = new Uint8Array(width);
        for (let x = 0; x < width; x++) {
            let white = luminance(rgba, (y * width + x) * 4) >= threshold;
            if (invert) white = !white;
            row[x] = white ? 1 : 0;
        }
        pixels2d.push(row);
    }

    const g5data = encodeG5(pixels2d, width, height);

    // BB_BITMAP header: [marker_lo, marker_hi, w_lo, w_hi, h_lo, h_hi, size_lo, size_hi]
    const out = new Uint8Array(8 + g5data.length);
    const dv  = new DataView(out.buffer);
    dv.setUint16(0, BB_BITMAP_MARKER, true); // 0xBBBF little-endian
    dv.setUint16(2, width,  true);
    dv.setUint16(4, height, true);
    dv.setUint16(6, g5data.length, true);
    out.set(g5data, 8);
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
 * @param {boolean}          invert      When true, swap black and white pixels
 * @returns {{ g5: Uint8Array, previewDataUrl: string }}
 */
export function imageToG5(img, targetWidth, targetHeight, threshold = 128, invert = false) {
    // ── source canvas: greyscale render ──────────────────────────────────
    const src = document.createElement('canvas');
    src.width = targetWidth;
    src.height = targetHeight;
    const sctx = src.getContext('2d');
    // Fill white first so transparent PNG areas become white, not black
    sctx.fillStyle = '#ffffff';
    sctx.fillRect(0, 0, targetWidth, targetHeight);
    sctx.filter = 'grayscale(1)';
    sctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    const imageData = sctx.getImageData(0, 0, targetWidth, targetHeight);

    // ── G5 encode ─────────────────────────────────────────────────────────
    const g5 = rgbaToG5(imageData.data, targetWidth, targetHeight, threshold, invert);

    // ── 1-bit preview PNG ─────────────────────────────────────────────────
    const prev = document.createElement('canvas');
    prev.width = targetWidth;
    prev.height = targetHeight;
    const pctx = prev.getContext('2d');
    const pd = pctx.createImageData(targetWidth, targetHeight);
    for (let i = 0; i < targetWidth * targetHeight; i++) {
        let white = luminance(imageData.data, i * 4) >= threshold;
        if (invert) white = !white;
        const v = white ? 255 : 0;
        pd.data[i * 4]     = v;
        pd.data[i * 4 + 1] = v;
        pd.data[i * 4 + 2] = v;
        pd.data[i * 4 + 3] = 255;
    }
    pctx.putImageData(pd, 0, 0);

    return { g5, previewDataUrl: prev.toDataURL('image/png') };
}

/**
 * Convert a Uint8Array of G5 bytes to the firmware-compatible hex-string array.
 * Each byte becomes a "0x"-prefixed 2-char lowercase hex string.
 * Example: [0xbf, 0x00] → ["0xbf","0x00"]
 *
 * @param {Uint8Array} data
 * @returns {string[]}
 */
export function g5ToHexArray(data) {
    const out = new Array(data.length);
    for (let i = 0; i < data.length; i++) {
        // "0x" prefix is required for FastJsonDL firmware to parse hex byte values correctly
        out[i] = '0x' + data[i].toString(16).padStart(2, '0');
    }
    return out;
}
