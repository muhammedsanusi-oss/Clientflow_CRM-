"use client";

/** Same escaped structured-text rendering for public sites and the editable preview. */
import { useLayoutEffect, useMemo, useRef, type CSSProperties } from "react";
import { plainRichText, richTextValue, type RichText, type TextMarks } from "../../../../packages/domain/src/website-rich-text";
import { readEditableText, restoreTextSelection, textSelection } from "./editable-text-dom";

function markStyle(marks: TextMarks): CSSProperties {
  return {
    fontFamily: marks.font ? `'${marks.font}', ${["Georgia", "Times New Roman"].includes(marks.font) ? "serif" : marks.font === "Courier New" ? "monospace" : "Arial, sans-serif"}` : undefined,
    fontSize: marks.size ? `${marks.size}px` : undefined,
    lineHeight: marks.size ? 1.2 : undefined,
    fontWeight: marks.bold === undefined ? undefined : marks.bold ? 700 : 400,
    fontStyle: marks.italic === undefined ? undefined : marks.italic ? "italic" : "normal",
    textDecorationLine: marks.underline === undefined && marks.strike === undefined ? undefined : [marks.underline && "underline", marks.strike && "line-through"].filter(Boolean).join(" ") || "none",
    verticalAlign: marks.script === "normal" ? "baseline" : marks.script, color: marks.color, backgroundColor: marks.highlight,
  };
}
export type InlineTextEditing = {
  revision: number;
  disabled: boolean;
  onFocus: (field: string, element: HTMLElement) => void;
  onChange: (field: string, value: RichText) => void;
  selection?: { field: string; start: number; end: number } | null;
};
export function WebsiteRichText({ field, text, value, editing }: { field: string; text: string; value?: RichText; editing?: InlineTextEditing }) {
  const document = value && richTextValue(value).trim() === text.trim() ? value : plainRichText(text);
  // Freeze React's editable children. Native typing may split or replace these
  // nodes; supported formatting is rebuilt with safe DOM nodes on command/blur.
  const initialChildren = useMemo(() => document.runs.map((run, index) => <span key={index} style={markStyle(run.marks)}>{run.text}</span>), []);
  const element = useRef<HTMLSpanElement>(null), focused = useRef(false), composing = useRef(false), revision = useRef(editing?.revision);
  useLayoutEffect(() => {
    if (editing && element.current && (!focused.current || revision.current !== editing.revision)) {
      const spans = document.runs.map(run => {
        const span = window.document.createElement("span"); span.textContent = run.text;
        Object.assign(span.style, Object.fromEntries(Object.entries(markStyle(run.marks)).filter(([, value]) => value !== undefined))); return span;
      });
      element.current.replaceChildren(...spans);
      if (editing.selection?.field === field && focused.current) restoreTextSelection(element.current, editing.selection.start, editing.selection.end);
    }
    revision.current = editing?.revision;
  }, [value, text, editing?.revision]); // DOM owns typing until blur; formatting explicitly refreshes it.
  const commit = () => { if (element.current) editing?.onChange(field, readEditableText(element.current)); };
  function insertText(text: string) {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !element.current || !textSelection(element.current)) return;
    const range = selection.getRangeAt(0); range.deleteContents();
    const node = window.document.createTextNode(text); range.insertNode(node); range.setStartAfter(node); range.collapse(true);
    selection.removeAllRanges(); selection.addRange(range); commit();
  }
  return <span ref={element} data-rich-field={field} className="site-rich-text"
    style={{ textAlign: document.align, display: document.align ? "block" : undefined,
       boxSizing: "border-box", textTransform: value ? "none" : undefined }}
    {...(editing ? {
      contentEditable: !editing.disabled, suppressContentEditableWarning: true, role: "textbox", "aria-label": `Edit ${field.replaceAll("-", " ")}`, "aria-multiline": true,
      onFocus: () => { focused.current = true; if (element.current) editing.onFocus(field, element.current); },
      onBlur: () => { focused.current = false; commit(); },
      onInput: () => { if (!composing.current) commit(); },
      onCompositionStart: () => { composing.current = true; },
      onCompositionEnd: () => { composing.current = false; commit(); },
      onPaste: (event: React.ClipboardEvent) => { event.preventDefault(); insertText(event.clipboardData.getData("text/plain")); },
      onDrop: (event: React.DragEvent) => event.preventDefault(),
      onKeyDown: (event: React.KeyboardEvent) => { if (event.key === "Enter") { event.preventDefault(); insertText("\n"); } },
    } : {})}>
    {editing ? initialChildren : document.runs.map((run, index) => <span key={index} style={markStyle(run.marks)}>{run.text}</span>)}
  </span>;
}
