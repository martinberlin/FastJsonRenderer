import React, { useState, useRef } from 'react';
import { imageToG5, g5ToHexArray } from '../utils/g5encode';

/**
 * ImageImporter – modal dialog to import a PNG/SVG/JPEG image, preview it as
 * a 1-bit G5 icon, and add it to the canvas.
 *
 * Props:
 *  - onAdd(item)  Called with the new loadG5Image item when the user confirms.
 *  - onClose()    Called when the user cancels or closes.
 */
export default function ImageImporter({ onAdd, onClose }) {
    const [imgSrc, setImgSrc]           = useState(null);
    const [targetW, setTargetW]         = useState(64);
    const [targetH, setTargetH]         = useState(64);
    const [threshold, setThreshold]     = useState(128);
    const [keepAspect, setKeepAspect]   = useState(true);
    const [preview, setPreview]         = useState(null);
    const [originalAspect, setOrigAspect] = useState(1);
    const fileRef = useRef(null);

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const src = ev.target.result;
            setImgSrc(src);
            setPreview(null);
            const tmp = new Image();
            tmp.onload = () => {
                const aspect = tmp.width / tmp.height;
                setOrigAspect(aspect);
                const w = Math.min(128, tmp.width);
                const h = Math.round(w / aspect);
                setTargetW(w);
                setTargetH(h);
            };
            tmp.src = src;
        };
        reader.readAsDataURL(file);
    };

    const setW = (v) => {
        const w = Math.max(8, v);
        setTargetW(w);
        if (keepAspect) setTargetH(Math.max(8, Math.round(w / originalAspect)));
    };

    const setH = (v) => {
        const h = Math.max(8, v);
        setTargetH(h);
        if (keepAspect) setTargetW(Math.max(8, Math.round(h * originalAspect)));
    };

    const runPreview = () => {
        if (!imgSrc) return;
        const img = new Image();
        img.onload = () => {
            const { previewDataUrl } = imageToG5(img, targetW, targetH, threshold);
            setPreview(previewDataUrl);
        };
        img.src = imgSrc;
    };

    const handleAdd = () => {
        if (!imgSrc) return;
        const img = new Image();
        img.onload = () => {
            const { g5, previewDataUrl } = imageToG5(img, targetW, targetH, threshold);
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
                        <div className="importer-dims">
                            <div className="form-group">
                                <label>Width (px)</label>
                                <input type="number" min={8} max={400} value={targetW}
                                    onChange={(e) => setW(parseInt(e.target.value, 10) || 64)} />
                            </div>
                            <div className="importer-link">×</div>
                            <div className="form-group">
                                <label>Height (px)</label>
                                <input type="number" min={8} max={400} value={targetH}
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
                                onChange={(e) => { setThreshold(parseInt(e.target.value, 10)); setPreview(null); }} />
                        </div>

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
                                    <div className="importer-preview-empty">
                                        Click&nbsp;<em>Preview</em>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button className="btn btn-secondary btn-sm" onClick={runPreview}
                            style={{ marginBottom: 14 }}>
                            ↺ Preview 1-bit
                        </button>
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
