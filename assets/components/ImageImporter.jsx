import React, { useState, useRef, useEffect } from 'react';
import { imageToG5, g5ToHexArray } from '../utils/g5encode';

/**
 * ImageImporter – modal dialog to import a PNG/SVG/JPEG image, preview it as
 * a 1-bit G5 icon, and add it to the canvas.
 *
 * Props:
 *  - onAdd(item)        Called with the new loadG5Image item when the user confirms.
 *  - onClose()          Called when the user cancels or closes.
 *  - displayWidth       Width of the target display in pixels (default 1280).
 *  - displayHeight      Height of the target display in pixels (default 780).
 */
export default function ImageImporter({ onAdd, onClose, displayWidth = 1280, displayHeight = 780 }) {
    // Maximum allowed import size = half the target display dimensions
    const maxW = Math.floor(displayWidth / 2);
    const maxH = Math.floor(displayHeight / 2);

    const [imgSrc, setImgSrc]             = useState(null);
    const [targetW, setTargetW]           = useState(64);
    const [targetH, setTargetH]           = useState(64);
    const [threshold, setThreshold]       = useState(128);
    const [keepAspect, setKeepAspect]     = useState(true);
    const [invert, setInvert]             = useState(false);
    const [preview, setPreview]           = useState(null);
    const [originalAspect, setOrigAspect] = useState(1);

    // SVG-specific: scale buttons and natural source dimensions
    const [isSvg, setIsSvg]               = useState(false);
    const [svgScale, setSvgScale]         = useState(1);
    const [origNaturalW, setOrigNaturalW] = useState(64);
    const [origNaturalH, setOrigNaturalH] = useState(64);

    const fileRef = useRef(null);

    // Auto-preview: regenerate 1-bit preview whenever any relevant parameter changes
    useEffect(() => {
        if (!imgSrc) return;
        const timer = setTimeout(() => {
            const img = new Image();
            img.onload = () => {
                const { previewDataUrl } = imageToG5(img, targetW, targetH, threshold, invert);
                setPreview(previewDataUrl);
            };
            img.src = imgSrc;
        }, 200);
        return () => clearTimeout(timer);
    }, [imgSrc, targetW, targetH, threshold, invert]);

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const svg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
        setIsSvg(svg);
        setSvgScale(1);
        const reader = new FileReader();
        reader.onload = (ev) => {
            const src = ev.target.result;
            setImgSrc(src);
            setPreview(null);
            const tmp = new Image();
            tmp.onload = () => {
                const aspect = tmp.width / tmp.height;
                setOrigAspect(aspect);
                setOrigNaturalW(tmp.width);
                setOrigNaturalH(tmp.height);
                const w = Math.min(Math.min(128, tmp.width), maxW);
                const h = Math.min(Math.max(8, Math.round(w / aspect)), maxH);
                setTargetW(w);
                setTargetH(h);
            };
            tmp.src = src;
        };
        reader.readAsDataURL(file);
    };

    // Apply an integer scale factor (1×/2×/3×) to the SVG's natural dimensions,
    // clamped to the half-display maximum.
    const applyScale = (scale) => {
        setSvgScale(scale);
        const aspect = origNaturalW / origNaturalH;
        let w = Math.min(Math.round(origNaturalW * scale), maxW);
        let h = Math.min(Math.round(origNaturalH * scale), maxH);
        // Preserve aspect ratio if clamped on either axis
        if (keepAspect) {
            if (w / h > aspect) {
                w = Math.max(8, Math.round(h * aspect));
            } else {
                h = Math.max(8, Math.round(w / aspect));
            }
        }
        setTargetW(Math.max(8, w));
        setTargetH(Math.max(8, h));
    };

    const setW = (v) => {
        const w = Math.min(Math.max(8, v), maxW);
        setTargetW(w);
        if (keepAspect) setTargetH(Math.min(Math.max(8, Math.round(w / originalAspect)), maxH));
    };

    const setH = (v) => {
        const h = Math.min(Math.max(8, v), maxH);
        setTargetH(h);
        if (keepAspect) setTargetW(Math.min(Math.max(8, Math.round(h * originalAspect)), maxW));
    };

    const handleAdd = () => {
        if (!imgSrc) return;
        const img = new Image();
        img.onload = () => {
            const { g5, previewDataUrl } = imageToG5(img, targetW, targetH, threshold, invert);
            onAdd({
                type:    'loadG5Image',
                x:       50,
                y:       50,
                w:       targetW,
                h:       targetH,
                data:    g5ToHexArray(g5),
                preview: previewDataUrl, // editor-only; stripped on firmware export
                fg:      15,
                bg:      0,
            });
            onClose();
        };
        img.src = imgSrc;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal importer-modal" onClick={(e) => e.stopPropagation()}>
                <h2>Import Image → G5 Icon</h2>
                <p className="importer-hint">
                    Import a PNG, JPG, or SVG and convert it to a 1-bit G5 icon for e-paper
                    displays. Only black &amp; white (1 bpp) – keep images simple.
                </p>

                <div className="form-group">
                    <label>Image file (PNG · JPG · SVG · GIF)</label>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} />
                </div>

                {imgSrc && (
                    <>
                        {/* SVG-only: quick 1×/2×/3× scale buttons */}
                        {isSvg && (
                            <div className="form-group">
                                <label>
                                    Scale <span className="hint">max {maxW}×{maxH} px (½ display)</span>
                                </label>
                                <div className="importer-scale-btns">
                                    {[1, 2, 3].map((s) => (
                                        <button
                                            key={s}
                                            className={`btn btn-sm${svgScale === s ? ' btn-primary' : ' btn-secondary'}`}
                                            onClick={() => applyScale(s)}
                                        >
                                            {s}×
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="importer-dims">
                            <div className="form-group">
                                <label>Width (px)</label>
                                <input type="number" min={8} max={maxW} value={targetW}
                                    onChange={(e) => setW(parseInt(e.target.value, 10) || 64)} />
                            </div>
                            <div className="importer-link">×</div>
                            <div className="form-group">
                                <label>Height (px)</label>
                                <input type="number" min={8} max={maxH} value={targetH}
                                    onChange={(e) => setH(parseInt(e.target.value, 10) || 64)} />
                            </div>
                            <label className="importer-aspect">
                                <input type="checkbox" checked={keepAspect}
                                    onChange={(e) => setKeepAspect(e.target.checked)} />
                                Lock ratio
                            </label>
                        </div>

                        <div className="form-group">
                            <label>Threshold — below = black · above = white · {threshold}</label>
                            <input type="range" min={0} max={255} value={threshold}
                                onChange={(e) => setThreshold(parseInt(e.target.value, 10))} />
                        </div>

                        <label className="importer-aspect" style={{ marginBottom: 12 }}>
                            <input type="checkbox" checked={invert}
                                onChange={(e) => setInvert(e.target.checked)} />
                            {/* Swaps black↔white in both the G5 bitstream and the preview PNG */}
                            Invert colors
                        </label>

                        <div className="importer-previews">
                            <div className="importer-preview-box">
                                <div className="importer-preview-label">Original</div>
                                <img src={imgSrc} alt="original"
                                    style={{ maxWidth: 140, maxHeight: 140 }} />
                            </div>
                            <div className="importer-preview-box">
                                <div className="importer-preview-label">1-bit preview</div>
                                {preview ? (
                                    <img src={preview} alt="1-bit"
                                        style={{ maxWidth: 140, maxHeight: 140, imageRendering: 'pixelated' }} />
                                ) : (
                                    <div className="importer-preview-empty">Generating…</div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleAdd} disabled={!imgSrc}>
                        Add to Canvas
                    </button>
                </div>
            </div>
        </div>
    );
}
