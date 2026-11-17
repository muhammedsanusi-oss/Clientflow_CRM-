"use client";

/** Contextual controls stay with the selected section; only explicit publication saves them. */
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { WEBSITE_FONTS, WEBSITE_FONT_SIZES, type TextMarks } from "../../../../../../packages/domain/src/website-rich-text";
import { contrastRatio, hexToHsv, hsvToHex, normalizeHex } from "../../../../../../packages/domain/src/website-colors";

export type CurrentTextStyle = TextMarks & { font: typeof WEBSITE_FONTS[number]; size: number; color: string; align: "left" | "center" | "right" };
function ColorPicker({ value, onChange, onValidity, close, onGesture, swatches, onSaveSwatch }: { value: string; onChange: (color: string) => void; onValidity: (valid: boolean) => void; close: () => void; onGesture: (active: boolean) => void; swatches: string[]; onSaveSwatch: (color: string) => void; }) {
  const id = useId(), dragging = useRef(false);
  const ownColor = useRef<string | null>(null);
  const previousValue = useRef(value);
  const popover = useRef<HTMLDivElement>(null);
  const [hex, setHex] = useState(value), [hsv, setHsv] = useState(() => hexToHsv(value));
  const valid = normalizeHex(hex) !== null;
  useLayoutEffect(() => {
    const place = () => {
      const element = popover.current, toolbar = element?.closest(".site-inline-tools"); if (!element || !toolbar) return;
      const anchor = toolbar.getBoundingClientRect(), width = element.offsetWidth, height = element.offsetHeight;
      element.style.left = `${Math.max(12, Math.min(innerWidth - width - 12, anchor.right - width)) - anchor.left}px`;
      element.style.top = `${Math.max(76, Math.min(innerHeight - height - 12, anchor.bottom + 8)) - anchor.top}px`;
      element.style.maxHeight = `${Math.max(160, innerHeight - 100)}px`;
    };
    place(); window.addEventListener("resize", place);
    return () => { window.removeEventListener("resize", place); };
  }, [valid, swatches.length]);
  useEffect(() => { if (previousValue.current !== value) { if (ownColor.current !== value) { setHex(value); setHsv(hexToHsv(value)); } previousValue.current = value; ownColor.current = null; } }, [value]);
  function apply(color: string, next = hexToHsv(color)) { ownColor.current = color; setHex(color); setHsv(next); onValidity(true); onChange(color); }
  return <div ref={popover} className="site-color-popover" role="dialog" aria-label="Color picker" onKeyDown={event => { if (event.key === "Escape" && valid) close(); }}>
    <div className="site-tool-row"><strong>Choose color</strong><button type="button" aria-label="Close color picker" onClick={() => { if (valid) close(); }}>×</button></div>
    <div className="site-color-wheel" role="group" aria-label="Hue and saturation. HEX and native picker provide keyboard alternatives."
      style={{ background: "radial-gradient(circle,#fff 0%,transparent 70.71%),conic-gradient(from 90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }}
      onPointerDown={event => { event.preventDefault(); onGesture(true); dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); const rect = event.currentTarget.getBoundingClientRect(); const x = (event.clientX - rect.left) / rect.width * 2 - 1, y = (event.clientY - rect.top) / rect.height * 2 - 1; const next: [number, number, number] = [(Math.atan2(y, x) * 180 / Math.PI + 360) % 360, Math.min(1, Math.hypot(x, y)), hsv[2]]; apply(hsvToHex(...next), next); }}
      onPointerMove={event => { if (!dragging.current) return; const rect = event.currentTarget.getBoundingClientRect(); const x = (event.clientX - rect.left) / rect.width * 2 - 1, y = (event.clientY - rect.top) / rect.height * 2 - 1; const next: [number, number, number] = [(Math.atan2(y, x) * 180 / Math.PI + 360) % 360, Math.min(1, Math.hypot(x, y)), hsv[2]]; apply(hsvToHex(...next), next); }}
      onPointerUp={() => { dragging.current = false; onGesture(false); }} onPointerCancel={() => { dragging.current = false; onGesture(false); }} onLostPointerCapture={() => { dragging.current = false; onGesture(false); }}>
      <span className="site-wheel-shade" style={{ opacity: 1 - hsv[2] }} />
      <span className="site-wheel-marker" style={{ left: `${50 + 50 * hsv[1] * Math.cos(hsv[0] * Math.PI / 180)}%`, top: `${50 + 50 * hsv[1] * Math.sin(hsv[0] * Math.PI / 180)}%` }} />
    </div>
    <label htmlFor={`${id}-brightness`}>Brightness · {Math.round(hsv[2] * 100)}%</label>
    <input id={`${id}-brightness`} type="range" min="0" max="100" value={Math.round(hsv[2] * 100)} onChange={event => { const next: [number, number, number] = [hsv[0], hsv[1], Number(event.target.value) / 100]; apply(hsvToHex(...next), next); }} />
    <label htmlFor={`${id}-hex`}>HEX color</label><div className="site-tool-row">
      <input type="color" aria-label="Native color picker" value={value} onChange={event => apply(event.target.value.toUpperCase())} />
      <input id={`${id}-hex`} type="text" aria-invalid={!valid} aria-describedby={!valid ? `${id}-error` : undefined} value={hex} maxLength={7} autoComplete="off" spellCheck={false}
        onChange={event => { const raw = event.target.value; setHex(raw); const next = normalizeHex(raw); onValidity(Boolean(next)); if (next && raw.replace(/^#/, "").length === 6) apply(next); }}
        onBlur={() => { const next = normalizeHex(hex); if (next) apply(next); }}
        onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); const next = normalizeHex(hex); if (next) apply(next); } }} />
    </div>
    {!valid && <p id={`${id}-error`} role="alert">Enter a HEX color, such as #2563EB.</p>}
    <div className="site-tool-row site-saved-colors" aria-label="Reusable colors">
      {swatches.map(color => <button key={color} type="button" aria-label={`Apply ${color}`} style={{ backgroundColor: color }} onClick={() => apply(color)} />)}
      <button type="button" disabled={!valid || swatches.length >= 12 || swatches.includes(normalizeHex(hex)!)} onClick={() => { const color = normalizeHex(hex); if (color) onSaveSwatch(color); }}>Save swatch ({swatches.length}/12)</button>
    </div>
  </div>;
}

export function SectionToolbar({ section, current, background, pageBackground, disabled, valid, onFormat, onAlign, onCase, onBackground, onPageBackground, onValidity, onUndo, canUndo, onReset, onClose, onGesture, swatches, onSaveSwatch, children }: {
  section: string; current: CurrentTextStyle; background: string; pageBackground: string; disabled: boolean; valid: boolean;
  onFormat: (marks: Partial<TextMarks>, clear?: boolean) => void; onAlign: (align: CurrentTextStyle["align"]) => void;
  onCase: (kind: string) => void; onBackground: (color: string) => void; onPageBackground: (color: string) => void; onValidity: (valid: boolean) => void;
  onUndo: () => void; canUndo: boolean; onReset: () => void; onClose: () => void; children?: ReactNode;
  onGesture: (active: boolean) => void;
  swatches: string[]; onSaveSwatch: (color: string) => void;
}) {
  const [picker, setPicker] = useState<"text" | "background" | "page" | "highlight" | null>(null);
  const ratio = contrastRatio(current.color, background);
  const sizes = [...new Set<number>([...WEBSITE_FONT_SIZES, current.size])].sort((a, b) => a - b);
  return <div className="site-inline-tools" role="region" aria-label={`Editing ${section} section`} contentEditable={false}
    onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}
    onPointerDown={event => { if ((event.target as HTMLElement).closest("button")) event.preventDefault(); }}>
    <fieldset disabled={disabled}>
      <div className="site-tool-row site-tool-heading"><strong>Editing {section.replace("custom-", "section ")}</strong><span>Changes preview live</span><button type="button" onClick={() => { if (valid) onClose(); }} aria-label="Close section editor">Done ×</button></div>
      <div className="site-tool-row">
        <label>Font<select aria-label="Font family" value={current.font} onChange={event => onFormat({ font: event.target.value as TextMarks["font"] })}>{WEBSITE_FONTS.map(font => <option key={font} value={font}>{font}</option>)}</select></label>
        <label>Size<select aria-label="Font size" value={current.size} onChange={event => { const size = Number(event.target.value); if (size >= 8 && size <= 96) onFormat({ size }); }}>{sizes.map(size => <option key={size} value={size}>{size}</option>)}</select></label>
        {([ ["bold", "B", "Bold"], ["italic", "I", "Italic"], ["underline", "U", "Underline"] ] as const).map(([key, text, label]) => <button key={key} type="button" aria-label={label} aria-pressed={Boolean(current[key])} style={{ fontWeight: key === "bold" ? 700 : undefined, fontStyle: key === "italic" ? "italic" : undefined, textDecoration: key === "underline" ? "underline" : undefined }} onClick={() => onFormat({ [key]: !current[key] })}>{text}</button>)}
        <label>Alignment<select aria-label="Text alignment" value={current.align} onChange={event => onAlign(event.target.value as CurrentTextStyle["align"])}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
        <label>Case<select aria-label="Change letter case" value="" onChange={event => onCase(event.target.value)}><option value="">Aa</option><option value="upper">UPPERCASE</option><option value="lower">lowercase</option><option value="title">Title Case</option></select></label>
        <button type="button" aria-label="Text color" onClick={() => { if (valid) setPicker(picker === "text" ? null : "text"); }}><span className="site-tool-swatch" style={{ background: current.color }} /> Text {current.color}</button>
        <button type="button" aria-label="Text highlight" onClick={() => { if (valid) setPicker(picker === "highlight" ? null : "highlight"); }}>Highlight</button>
        <button type="button" aria-label="Section background color" onClick={() => { if (valid) setPicker(picker === "background" ? null : "background"); }}><span className="site-tool-swatch" style={{ background }} /> Background {background}</button>
        <button type="button" aria-label="Page background color" onClick={() => { if (valid) setPicker(picker === "page" ? null : "page"); }}><span className="site-tool-swatch" style={{ background: pageBackground }} /> Page background {pageBackground}</button>
        <button type="button" aria-label="Clear formatting" onClick={() => onFormat({}, true)}>Clear formatting</button>
        <button type="button" disabled={!canUndo || !valid} onClick={() => { setPicker(null); onUndo(); }}>Undo</button><button type="button" disabled={!valid} onClick={() => { setPicker(null); onReset(); }}>Reset section</button>
      </div>
      {ratio < 4.5 && <p className="site-contrast-warning" role="status">Readability warning · {ratio.toFixed(2)}:1 contrast. You can still publish. Check image-backed text separately.</p>}
      {children}
      {picker && <ColorPicker key={picker} value={picker === "page" ? pageBackground : picker === "background" ? background : picker === "highlight" ? current.highlight ?? "#FFFF00" : current.color}
        onChange={color => picker === "page" ? onPageBackground(color) : picker === "background" ? onBackground(color) : onFormat(picker === "highlight" ? { highlight: color } : { color })}
        onValidity={onValidity} onGesture={onGesture} swatches={swatches} onSaveSwatch={onSaveSwatch} close={() => setPicker(null)} />}
    </fieldset>
  </div>;
}
