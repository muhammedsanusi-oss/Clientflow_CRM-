/** Read only supported formatting from the editable DOM; never serialize HTML. */
import { WEBSITE_FONTS, plainRichText, type RichText, type TextMarks } from "../../../../packages/domain/src/website-rich-text";
import { normalizeHex } from "../../../../packages/domain/src/website-colors";

export function cssHex(color: string): string | null {
  const hex = normalizeHex(color); if (hex) return hex;
  const rgb = /^rgba?\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)(?:[, /]+([\d.]+))?\s*\)$/.exec(color);
  return rgb && (!rgb[4] || Number(rgb[4]) === 1)
    ? "#" + rgb.slice(1, 4).map(value => Math.min(255, Number(value)).toString(16).padStart(2, "0")).join("").toUpperCase() : null;
}
export function readEditableText(element: HTMLElement): RichText {
  const runs: RichText["runs"] = [];
  function walk(node: Node, inherited: TextMarks) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text) {
        const previous = runs.at(-1);
        if (previous && JSON.stringify(previous.marks) === JSON.stringify(inherited)) previous.text += text;
        else runs.push({ text, marks: { ...inherited } });
      }
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "SVG", "IMG"].includes(node.tagName)) return;
    if (node.tagName === "BR") { runs.push({ text: "\n", marks: { ...inherited } }); return; }
    const marks = { ...inherited }, style = node.style;
    if (["B", "STRONG"].includes(node.tagName)) marks.bold = true;
    if (["I", "EM"].includes(node.tagName)) marks.italic = true;
    if (node.tagName === "U") marks.underline = true;
    if (["S", "STRIKE"].includes(node.tagName)) marks.strike = true;
    if (node.tagName === "SUB") marks.script = "sub";
    if (node.tagName === "SUP") marks.script = "super";
    const font = style.fontFamily.split(",")[0]?.replace(/["']/g, "").trim();
    if (WEBSITE_FONTS.includes(font as typeof WEBSITE_FONTS[number])) marks.font = font as typeof WEBSITE_FONTS[number];
    if (style.fontSize && /^\d+px$/.test(style.fontSize) && parseInt(style.fontSize) >= 8 && parseInt(style.fontSize) <= 96) marks.size = parseInt(style.fontSize);
    if (style.fontWeight) marks.bold = style.fontWeight === "bold" || Number(style.fontWeight) >= 600;
    if (style.fontStyle) marks.italic = style.fontStyle === "italic";
    if (style.textDecorationLine) { marks.underline = style.textDecorationLine.includes("underline"); marks.strike = style.textDecorationLine.includes("line-through"); }
    if (["sub", "super", "normal"].includes(style.verticalAlign)) marks.script = style.verticalAlign as TextMarks["script"];
    if (style.verticalAlign === "baseline") marks.script = "normal";
    const color = cssHex(style.color), highlight = cssHex(style.backgroundColor);
    if (color) marks.color = color; if (highlight) marks.highlight = highlight;
    for (const child of node.childNodes) walk(child, marks);
  }
  for (const child of element.childNodes) walk(child, {});
  const align = element.style.textAlign;
  const borderColor = cssHex(element.style.borderColor);
  return { runs: runs.length ? runs : plainRichText("").runs, ...(borderColor ? { borderColor } : {}), ...(["left", "center", "right"].includes(align) ? { align: align as RichText["align"] } : {}) };
}
export function textSelection(element: HTMLElement): { start: number; end: number } | null {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) return null;
  const before = range.cloneRange(); before.selectNodeContents(element); before.setEnd(range.startContainer, range.startOffset);
  return { start: before.toString().length, end: before.toString().length + range.toString().length };
}
export function restoreTextSelection(element: HTMLElement, start: number, end: number) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const range = document.createRange(); let offset = 0, started = false, finished = false;
  while (walker.nextNode()) {
    const node = walker.currentNode, length = node.textContent?.length ?? 0;
    if (!started && start <= offset + length) { range.setStart(node, Math.max(0, start - offset)); started = true; }
    if (end <= offset + length) { range.setEnd(node, Math.max(0, end - offset)); finished = true; break; }
    offset += length;
  }
  if (!started) { range.selectNodeContents(element); range.collapse(false); }
  else if (!finished) { range.selectNodeContents(element); range.collapse(false); }
  const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
}
