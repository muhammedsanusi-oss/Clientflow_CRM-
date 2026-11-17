"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "../../../../components/app-link";
import type { PublishWebsiteInput } from "../../../../../../packages/domain/src/website-editing";
import {
  defaultWebsiteContent,
  type WebsiteImageSection,
} from "../../../../../../packages/domain/src/website-content";
import { countWebsiteImages, WEBSITE_PLANS, type WebsitePlanKey } from "../../../../../../packages/domain/src/website-plans";
import { WEBSITE_TEMPLATE_KEYS, WEBSITE_TEMPLATES } from "../../../../../../packages/domain/src/website-templates";
import { BusinessWebsite } from "../../../../components/business-sites/business-website";
import { publishWebsiteAction } from "./actions";
import { WebsiteFeatureRequestForm } from "./feature-request-form";
import { resolvedWebsiteColors } from "../../../../../../packages/domain/src/website-colors";
import { SectionToolbar, type CurrentTextStyle } from "./section-toolbar";
import { PublishWebsite } from "../../../../../../packages/domain/src/website-editing";
import { changeRichTextCase, fieldSection, formatRichText, plainRichText, richTextValue, RichTextSchema, textLimit, WEBSITE_FONTS, type RichText, type TextMarks } from "../../../../../../packages/domain/src/website-rich-text";
import { cssHex, textSelection } from "../../../../components/business-sites/editable-text-dom";

type EditorSection = "header" | "hero" | "features" | "about" | "offerings" | "contact" | "footer" | `custom-${number}`;
type ImageSection = WebsiteImageSection | `custom-${number}`;

const standardSections: Array<{ key: Exclude<ImageSection, `custom-${number}`>; label: string }> = [
  { key: "header", label: "Header" },
  { key: "hero", label: "Hero" },
  { key: "features", label: "Features" },
  { key: "about", label: "About" },
  { key: "offerings", label: "Offerings" },
  { key: "contact", label: "Contact" },
];

const lines = (value: string) => value.split("\n").map(line => line.trim()).filter(Boolean);

export function WebsiteEditor({
  businessId,
  initial,
  canChangeTemplate,
  maxImages,
  imageCount,
  canAddCustomSections,
  canSubmitFeatureRequests,
  featureRequestCount,
  featureRequestLimit,
  websitePlan,
}: {
  businessId: string;
  initial: PublishWebsiteInput;
  canChangeTemplate: boolean;
  maxImages: number | null;
  imageCount: number;
  canAddCustomSections: boolean;
  canSubmitFeatureRequests: boolean;
  featureRequestCount: number;
  featureRequestLimit: number | null;
  websitePlan: WebsitePlanKey | null;
}) {
  const [values, setValues] = useState(initial);
  const [validColors, setValidColors] = useState(true);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const history = useRef<PublishWebsiteInput[]>([]);
  const gesture = useRef({ active: false, recorded: false });
  const valuesRef = useRef(initial); valuesRef.current = values;
  const activeElement = useRef<HTMLElement | null>(null);
  const selection = useRef<{ field: string; start: number; end: number } | null>(null);
  const [current, setCurrent] = useState<CurrentTextStyle>({ font: "Arial", size: 16, color: "#263A2F", align: "left" });
  const [selectedSection, setSelectedSection] = useState<EditorSection | null>(null);
  const [pending, setPending] = useState(false);
  const [uploadingSection, setUploadingSection] = useState<ImageSection | null>(null);
  const [error, setError] = useState("");
  const [published, setPublished] = useState(false);
  const [publishedImageCount, setPublishedImageCount] = useState(imageCount);
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});
  const previewUrls = useRef<Record<string, string>>({});

  useEffect(() => () => {
    for (const url of Object.values(previewUrls.current)) URL.revokeObjectURL(url);
  }, []);

  function edited() {
    setPublished(false);
    setError("");
  }

  function update<K extends keyof PublishWebsiteInput>(key: K, value: PublishWebsiteInput[K]) {
    edited();
    changeValues({ ...valuesRef.current, [key]: value });
  }

  function sectionImages(section: ImageSection) {
    if (section.startsWith("custom-")) {
      return values.additionalSections[Number(section.slice("custom-".length))]?.images ?? [];
    }
    return values.sectionImages[section as WebsiteImageSection];
  }

  function updateSectionImages(section: ImageSection, images: string[]) {
    setValues(current => {
      if (section.startsWith("custom-")) {
        const index = Number(section.slice("custom-".length));
        return {
          ...current,
          additionalSections: current.additionalSections.map((item, itemIndex) =>
            itemIndex === index ? { ...item, images } : item),
        };
      }
      return { ...current,       sectionImages: { ...current.sectionImages, [section as WebsiteImageSection]: images } };
    });
  }

  function appendSectionImage(section: ImageSection, imageRef: string) {
    setValues(current => {
      if (section.startsWith("custom-")) {
        const index = Number(section.slice("custom-".length));
        return {
          ...current,
          additionalSections: current.additionalSections.map((item, itemIndex) =>
            itemIndex === index ? { ...item, images: [...item.images, imageRef] } : item),
        };
      }
      return {
        ...current,
        sectionImages: {
          ...current.sectionImages,
          [section as WebsiteImageSection]: [...current.sectionImages[section as WebsiteImageSection], imageRef],
        },
      };
    });
  }

  function imageLocator(section: ImageSection, index: number) {
    return `${section}-${index}`;
  }

  function imageUrl(section: ImageSection, imageRef: string, index: number) {
    return imagePreviews[imageRef]
      ?? `/api/sites/${encodeURIComponent(businessId)}/image/${imageLocator(section, index)}`;
  }

  async function uploadImage(section: ImageSection, file?: File) {
    if (!file) return;
    if (sectionImages(section).length >= 10) {
      setError("Each website section can have up to 10 images.");
      return;
    }
    if (maxImages !== null && countWebsiteImages(values) >= maxImages) {
      setError(`Your ${maxImages}-image plan limit has been reached.`);
      return;
    }
    if (maxImages !== null && publishedImageCount >= maxImages) {
      setError("Publish image removals before uploading replacements to free space in your plan.");
      return;
    }
    edited();
    setUploadingSection(section);
    const previewUrl = URL.createObjectURL(file);
    try {
      const body = new FormData();
      body.set("image", file);
      const uploadSection = section.startsWith("custom-") ? "custom" : section;
      const response = await fetch(`/api/sites/${encodeURIComponent(businessId)}/images/${uploadSection}`, {
        method: "POST",
        body,
      });
      const result = await response.json() as { imageRef?: string; error?: { message?: string } };
      if (!response.ok || !result.imageRef) {
        throw new Error(result.error?.message ?? "The image could not be uploaded.");
      }
      previewUrls.current[result.imageRef] = previewUrl;
      setImagePreviews(current => ({ ...current, [result.imageRef!]: previewUrl }));
      appendSectionImage(section, result.imageRef);
    } catch (uploadError) {
      URL.revokeObjectURL(previewUrl);
      setError(uploadError instanceof Error ? uploadError.message : "The image could not be uploaded. Try again.");
    } finally {
      setUploadingSection(null);
    }
  }

  function removeImage(section: ImageSection, index: number) {
    const images = sectionImages(section);
    const imageRef = images[index];
    if (!imageRef || !window.confirm("Remove this image from the website? It will disappear after you publish; the uploaded file will be retained.")) return;
    edited();
    updateSectionImages(section, images.filter((_, itemIndex) => itemIndex !== index));
    const previewUrl = previewUrls.current[imageRef];
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      delete previewUrls.current[imageRef];
      setImagePreviews(current => {
        const next = { ...current };
        delete next[imageRef];
        return next;
      });
    }
  }

  const draftImagePreviews: Record<string, string> = {};
  for (const section of standardSections) {
    values.sectionImages[section.key].forEach((imageRef, index) => {
      if (imagePreviews[imageRef]) draftImagePreviews[imageLocator(section.key, index)] = imagePreviews[imageRef]!;
    });
  }
  values.additionalSections.forEach((section, sectionIndex) => {
    section.images.forEach((imageRef, imageIndex) => {
      if (imagePreviews[imageRef]) {
        draftImagePreviews[imageLocator(`custom-${sectionIndex}`, imageIndex)] = imagePreviews[imageRef]!;
      }
    });
  });

  function imageControls(section: ImageSection) {
    const images = sectionImages(section);
    const currentImageCount = countWebsiteImages(values);
    const planLimitReached = maxImages !== null && currentImageCount >= maxImages;
    const mustPublishRemoval = maxImages !== null && publishedImageCount >= maxImages && currentImageCount < maxImages;
    return <section className="space-y-3 rounded-xl border border-slate-200 p-4" aria-label="Section images">
      <div>
        <h3 className="font-semibold">Images ({images.length}/10){maxImages !== null && ` · Website total ${currentImageCount}/${maxImages}`}</h3>
        <p className="mt-1 text-xs text-slate-600">Add up to 10 JPEG, PNG, or WebP images to this section. Uploaded files are retained even if you remove an image later.</p>
        {mustPublishRemoval && <p className="text-xs text-amber-800">Publish image removals before uploading replacements to free plan space.</p>}
      </div>
      {images.length > 0 && <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((imageRef, index) => <li key={`${imageRef}-${index}`} className="rounded-lg border border-slate-200 p-2">
          <img src={imageUrl(section, imageRef, index)} alt={`Section image ${index + 1}`} className="aspect-square w-full rounded-md object-cover" />
          <button type="button" onClick={() => removeImage(section, index)} className="mt-2 text-sm text-red-700 underline">Remove image</button>
        </li>)}
      </ul>}
      <label className="block text-sm font-medium">Add image to this section
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={images.length >= 10 || planLimitReached || mustPublishRemoval || pending || uploadingSection !== null}
          onChange={event => {
            void uploadImage(section, event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
          className="mt-2 block w-full rounded-lg border border-slate-300 p-3 text-sm disabled:opacity-50" />
      </label>
      {uploadingSection === section && <p role="status" className="text-sm text-slate-600">Uploading image…</p>}
    </section>;
  }

  function changeValues(next: PublishWebsiteInput) {
    const previous = valuesRef.current;
    if (JSON.stringify(previous) === JSON.stringify(next)) return;
    if (!gesture.current.active || !gesture.current.recorded) history.current = [...history.current, previous].slice(-100);
    if (gesture.current.active) gesture.current.recorded = true;
    setHistoryCount(history.current.length); valuesRef.current = next; setValues(next); edited();
  }
  function syncStyle(element: HTMLElement) {
    const range = window.getSelection();
    let selected = range?.anchorNode && element.contains(range.anchorNode)
      ? range.anchorNode.nodeType === Node.TEXT_NODE ? range.anchorNode.parentElement : range.anchorNode as HTMLElement : null;
    const savedSelection = selection.current;
    if (!selected && savedSelection && savedSelection.field === element.dataset.richField) {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT); let offset = 0;
      while (walker.nextNode()) {
        const node = walker.currentNode, length = node.textContent?.length ?? 0;
        if (savedSelection.start < offset + length) { selected = node.parentElement; break; }
        offset += length;
      }
    }
    const style = getComputedStyle(selected ?? element.firstElementChild ?? element);
    const family = style.fontFamily.split(",")[0]!.replace(/["']/g, "").trim();
    setCurrent({
      font: WEBSITE_FONTS.includes(family as typeof WEBSITE_FONTS[number]) ? family as typeof WEBSITE_FONTS[number] : "Arial",
      size: Math.round(parseFloat(style.fontSize)) || 16, color: cssHex(style.color) ?? "#263A2F",
      bold: style.fontWeight === "bold" || Number(style.fontWeight) >= 600, italic: style.fontStyle === "italic",
      underline: style.textDecorationLine.includes("underline"), strike: style.textDecorationLine.includes("line-through"),
      script: ["sub", "super"].includes(style.verticalAlign) ? style.verticalAlign as TextMarks["script"] : "normal",
      highlight: cssHex(style.backgroundColor) ?? undefined,
      align: ["center", "right"].includes(getComputedStyle(element).textAlign) ? getComputedStyle(element).textAlign as "center" | "right" : "left",
    });
  }
  function selectSection(section: string) {
    if (!validColors) { setError("Correct the HEX value before switching sections."); return; }
    setSelectedSection(section as EditorSection);
  }
  useEffect(() => {
    if (!selectedSection) return;
    const root = document.querySelector(`[data-website-editor-section="${selectedSection}"]`);
    if (activeElement.current && root?.contains(activeElement.current)) return;
    const first = root?.querySelector<HTMLElement>("[data-rich-field]");
    activeElement.current = first ?? null; selection.current = null;
    setActiveField(first?.dataset.richField ?? null);
    if (first) syncStyle(first);
  }, [selectedSection]);
  useEffect(() => {
    const selected = () => {
      const element = activeElement.current; if (!element) return;
      const range = textSelection(element);
      if (range) { selection.current = { field: element.dataset.richField!, ...range }; syncStyle(element); }
    };
    document.addEventListener("selectionchange", selected);
    return () => document.removeEventListener("selectionchange", selected);
  }, []);
  function focusText(field: string, element: HTMLElement) {
    if (!validColors && fieldSection(field) !== selectedSection) {
      setError("Correct the HEX value in the open picker before switching sections.");
      requestAnimationFrame(() => activeElement.current?.focus()); return;
    }
    if (activeElement.current !== element) selection.current = null;
    activeElement.current = element; setActiveField(field); setSelectedSection(fieldSection(field) as EditorSection); syncStyle(element);
  }
  function setText(field: string, document: RichText, formatting = false) {
    const text = richTextValue(document), result = RichTextSchema.safeParse(document);
    const invalid = text.length > textLimit(field) || !result.success;
    setInvalidFields(fields => invalid ? [...new Set([...fields, field])] : fields.filter(value => value !== field));
    if (invalid) { setError(`Keep ${field.replaceAll("-", " ")} within ${textLimit(field)} characters and 256 formatting runs.`); return; }
    const next = { ...valuesRef.current, richText: { ...valuesRef.current.richText, [field]: document } };
    const custom = /^custom-([0-5])-(heading|body)$/.exec(field), feature = /^feature-(\d)$/.exec(field), offering = /^offering-(\d)$/.exec(field);
    if (custom) next.additionalSections = next.additionalSections.map((item, index) => index === Number(custom[1]) ? { ...item, [custom[2]!]: text } : item);
    else if (feature) next.features = next.features.map((item, index) => index === Number(feature[1]) ? text : item);
    else if (offering) next.offerings = next.offerings.map((item, index) => index === Number(offering[1]) ? text : item);
    else if (field in next && typeof next[field as keyof typeof next] === "string") Object.assign(next, { [field]: text });
    changeValues(next);
    if (formatting) setRevision(value => value + 1);
  }
  function fieldDocument() {
    if (!activeField || !activeElement.current) return null;
    return valuesRef.current.richText[activeField] ?? plainRichText(activeElement.current.textContent ?? "");
  }
  function format(marks: Partial<TextMarks>, clear = false) {
    const document = fieldDocument(); if (!document || !activeField) return;
    const range = selection.current?.field === activeField ? selection.current : { start: 0, end: 0 };
    const next = formatRichText(document, range.start, range.end, marks, clear);
    if (clear && (range.start === range.end || range.end - range.start === richTextValue(document).length)) delete next.align;
    setText(activeField, next, true);
    setCurrent(value => clear ? { font: "Arial", size: 16, color: value.color, align: "left" } : { ...value, ...marks });
    requestAnimationFrame(() => { if (activeElement.current) syncStyle(activeElement.current); });
  }
  function undo() {
    const previous = history.current.pop(); if (!previous) return;
    const restored = { ...previous, version: valuesRef.current.version };
    valuesRef.current = restored; setValues(restored); setHistoryCount(history.current.length); setRevision(value => value + 1);
    setInvalidFields([]); setValidColors(true); edited();
    requestAnimationFrame(() => { if (activeElement.current) syncStyle(activeElement.current); });
  }
  function changeCase(kind: string) {
    const document = fieldDocument(); if (!document || !activeField) return;
    const range = selection.current?.field === activeField ? selection.current : { start: 0, end: 0 };
    const next = changeRichTextCase(document, range.start, range.end, kind);
    if (range.start !== range.end) selection.current = { field: activeField, start: range.start, end: range.end + richTextValue(next).length - richTextValue(document).length };
    setText(activeField, next, true);
  }
  const sectionFields: Record<string, Array<keyof PublishWebsiteInput>> = {
    header: ["name"], hero: ["eyebrow", "headline", "description", "buttonLabel"], features: ["features"],
    about: ["sectionTitle", "aboutText"], offerings: ["offerings"], contact: ["email", "phone_number", "publicAddress", "openingHours"], footer: [],
  };
  function resetSection() {
    if (!selectedSection || !window.confirm("Restore only this section to the version loaded when you opened the editor?")) return;
    const section = selectedSection;
    const next = { ...valuesRef.current, richText: Object.fromEntries(Object.entries(valuesRef.current.richText).filter(([field]) => fieldSection(field) !== section)), sectionStyles: { ...valuesRef.current.sectionStyles } };
    for (const [field, value] of Object.entries(initial.richText)) if (fieldSection(field) === section) next.richText[field] = value;
    if (initial.sectionStyles[section]) next.sectionStyles[section] = initial.sectionStyles[section]!; else delete next.sectionStyles[section];
    if (section.startsWith("custom-")) {
      const index = Number(section.slice(7));
      next.additionalSections = next.additionalSections.map((item, i) => i === index ? initial.additionalSections[index] ?? { heading: "New section", body: "Add your text here.", images: [] } : item);
    } else {
      for (const field of sectionFields[section] ?? []) Object.assign(next, { [field]: initial[field] });
      if (section !== "footer") next.sectionImages = { ...next.sectionImages, [section]: initial.sectionImages[section as WebsiteImageSection] };
    }
    changeValues(next); setInvalidFields(fields => fields.filter(field => fieldSection(field) !== section)); setValidColors(true); setRevision(value => value + 1);
  }
  function arrayText(key: "features" | "offerings", value: string) {
    const prefix = key === "features" ? "feature-" : "offering-";
    changeValues({ ...valuesRef.current, [key]: lines(value), richText: Object.fromEntries(Object.entries(valuesRef.current.richText).filter(([field]) => !field.startsWith(prefix))) });
    setInvalidFields(fields => fields.filter(field => !field.startsWith(prefix)));
  }
  function addSection() {
    const index = values.additionalSections.length; if (index >= 6) return;
    changeValues({ ...values, additionalSections: [...values.additionalSections, { heading: "New section", body: "Add your text here.", images: [] }] });
    setSelectedSection(`custom-${index}`);
  }
  function removeCustom(index: number) {
    if (!window.confirm("Remove this section? Uploaded images are retained.")) return;
    const richText: PublishWebsiteInput["richText"] = {}, sectionStyles: PublishWebsiteInput["sectionStyles"] = {};
    const reindex = (key: string) => key.replace(/^custom-(\d)/, (_, number) => `custom-${Number(number) > index ? Number(number) - 1 : number}`);
    for (const [key, value] of Object.entries(values.richText)) if (!key.startsWith(`custom-${index}-`)) richText[reindex(key)] = value;
    for (const [key, value] of Object.entries(values.sectionStyles)) if (key !== `custom-${index}`) sectionStyles[reindex(key)] = value;
    changeValues({ ...values, richText, sectionStyles, additionalSections: values.additionalSections.filter((_, i) => i !== index) });
    setInvalidFields(fields => fields.filter(field => !field.startsWith(`custom-${index}-`)).map(reindex));
    setSelectedSection(null); activeElement.current = null; setRevision(value => value + 1);
  }
  function moveCustom(index: number, direction: number) {
    const target = index + direction; if (target < 0 || target >= values.additionalSections.length) return;
    const sections = [...values.additionalSections]; [sections[index], sections[target]] = [sections[target]!, sections[index]!];
    const reindex = (key: string) => key.replace(/^custom-(\d)/, (_, number) => `custom-${Number(number) === index ? target : Number(number) === target ? index : number}`);
    changeValues({ ...values, additionalSections: sections, richText: Object.fromEntries(Object.entries(values.richText).map(([key, value]) => [reindex(key), value])), sectionStyles: Object.fromEntries(Object.entries(values.sectionStyles).map(([key, value]) => [reindex(key), value])) });
    setInvalidFields(fields => fields.map(reindex));
    setSelectedSection(`custom-${target}`); activeElement.current = null; setRevision(value => value + 1);
  }
  function restoreTemplateText() {
    if (!window.confirm("Replace customized template headings, feature labels, and offerings? Section colors, images, and custom sections are retained.")) return;
    const defaults = defaultWebsiteContent(values.websiteTemplate);
    const replaced = new Set(["eyebrow", "headline", "sectionTitle", "buttonLabel"]);
    changeValues({ ...values, eyebrow: defaults.eyebrow, headline: defaults.headline, sectionTitle: defaults.sectionTitle,
      buttonLabel: defaults.buttonLabel, features: defaults.features, offerings: defaults.offerings,
      richText: Object.fromEntries(Object.entries(values.richText).filter(([field]) => !replaced.has(field) && !field.startsWith("feature-") && !field.startsWith("offering-"))) });
    setRevision(value => value + 1);
  }
  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validColors || invalidFields.length) { setError("Correct the highlighted text or HEX value before publishing."); return; }
    const parsed = PublishWebsite.safeParse(valuesRef.current);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the website text."); return; }
    setPending(true); setError(""); setPublished(false);
    try {
      const result = await publishWebsiteAction(businessId, parsed.data);
      if (result.error) setError(result.error.message);
      else if (result.publication) {
        setValues(current => ({ ...current, version: result.publication.version })); setPublishedImageCount(countWebsiteImages(valuesRef.current)); setPublished(true);
      }
    } catch { setError("Your website could not be published. Check your connection and try again."); }
    finally { setPending(false); }
  }
  function renderSectionControls(section: string) {
    const root = typeof document !== "undefined" ? document.querySelector<HTMLElement>(`[data-website-editor-section="${section}"]`) : null;
    const background = values.sectionStyles[section]?.background ?? (root ? cssHex(getComputedStyle(root).backgroundColor) : null)
      ?? (root ? cssHex(getComputedStyle(root.closest(".business-site")!).getPropertyValue("--site-bg")) : null) ?? "#F5F5EB";
    return <SectionToolbar key={section} section={section} current={current} background={background}
      pageBackground={resolvedWebsiteColors(values.websiteTemplate, values.textColor, values.colors).page}
      onPageBackground={color => changeValues({ ...valuesRef.current, colors: { ...valuesRef.current.colors, page: color } })}
      disabled={pending || uploadingSection !== null} valid={validColors} onValidity={setValidColors}
      onGesture={active => { gesture.current = { active, recorded: false }; }}
      swatches={values.colorSwatches} onSaveSwatch={color => { if (valuesRef.current.colorSwatches.length < 12 && !valuesRef.current.colorSwatches.includes(color)) changeValues({ ...valuesRef.current, colorSwatches: [...valuesRef.current.colorSwatches, color] }); }}
      onFormat={format} onUndo={undo} canUndo={historyCount > 0} onReset={resetSection} onClose={() => setSelectedSection(null)}
      onAlign={align => { const doc = fieldDocument(); if (doc && activeField) { setText(activeField, { ...doc, align }, true); setCurrent(value => ({ ...value, align })); } }}
      onCase={changeCase}
      onBackground={color => changeValues({ ...valuesRef.current, sectionStyles: { ...valuesRef.current.sectionStyles, [section]: { ...valuesRef.current.sectionStyles[section], background: color } } })}>
      <p className="site-tool-hint">Click text to type. Select words to format just those words. Current field: {activeField?.replaceAll("-", " ") ?? "select text"}.</p>
      <details className="site-section-options"><summary>Section options &amp; images</summary>
        {section !== "footer" && imageControls(section as ImageSection)}
        {(section === "features" || section === "offerings") && <label>{section === "features" ? "Feature labels (up to 3)" : "Offering titles (up to 6)"}<textarea rows={3} value={values[section].join("\n")} onChange={event => arrayText(section, event.target.value)} /></label>}
        {section.startsWith("custom-") && <div className="site-tool-row"><button type="button" disabled={Number(section.slice(7)) === 0} onClick={() => moveCustom(Number(section.slice(7)), -1)}>Move up</button><button type="button" disabled={Number(section.slice(7)) === values.additionalSections.length - 1} onClick={() => moveCustom(Number(section.slice(7)), 1)}>Move down</button><button type="button" onClick={() => removeCustom(Number(section.slice(7)))}>Remove section</button></div>}
      </details>
    </SectionToolbar>;
  }
  return <div className="space-y-5" aria-busy={pending || uploadingSection !== null}>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div><p className="font-semibold">Live website editor</p><p className="text-sm text-slate-600">Hover over a section and choose Click to edit. Type directly on the website; publish when ready.</p>
        {websitePlan && <p className="mt-1 text-xs text-indigo-700">{WEBSITE_PLANS[websitePlan].label} demo plan · {maxImages} images maximum</p>}</div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" form="website-editor-form" disabled={pending || uploadingSection !== null || !validColors || invalidFields.length > 0} className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Publishing…" : "Save and publish"}</button>
        <Link href={canChangeTemplate ? `/businesses/${businessId}` : `/website?businessId=${businessId}`} className="text-sm text-indigo-700 underline">Cancel</Link>
        <a href={`/sites/${businessId}`} target="_blank" rel="noreferrer" className="text-sm text-indigo-700 underline">Open published website</a>
      </div>
    </div>
    <form id="website-editor-form" onSubmit={publish} />
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {!validColors && <p role="alert" className="text-sm text-red-700">Enter a valid HEX color in the open picker before publishing.</p>}
    {published && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">Website published. The public site and owner preview show your changes.</p>}
    <section id="website-preview" aria-label="Live website preview" className="min-w-0 rounded-xl border border-slate-300 bg-white">
      <BusinessWebsite preview site={{ ...values, id: businessId, websiteContent: values }} draftImagePreviews={draftImagePreviews}
        onSelectSection={selectSection} selectedSection={selectedSection ?? undefined} renderSectionControls={renderSectionControls}
        textEditing={{ revision, disabled: pending || uploadingSection !== null, onFocus: focusText, onChange: setText, selection: selection.current }} />
    </section>
    <div className="flex flex-wrap items-center gap-4">
      {canAddCustomSections && <button type="button" disabled={values.additionalSections.length >= 6 || pending} onClick={addSection} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">Add text section</button>}
      {canChangeTemplate && <details className="rounded-lg border border-slate-200 bg-white p-3"><summary className="cursor-pointer text-sm">Website template</summary><label className="mt-3 block text-sm">Template<select aria-label="Website template" value={values.websiteTemplate} onChange={event => update("websiteTemplate", event.target.value as PublishWebsiteInput["websiteTemplate"])} className="ml-3 rounded border border-slate-300 p-2">{WEBSITE_TEMPLATE_KEYS.map(key => <option key={key} value={key}>{WEBSITE_TEMPLATES[key].label}</option>)}</select></label><button type="button" onClick={restoreTemplateText} className="mt-3 text-sm text-indigo-700 underline">Use template text</button></details>}
    </div>
    {canSubmitFeatureRequests && <WebsiteFeatureRequestForm businessId={businessId} initialCount={featureRequestCount} limit={featureRequestLimit} />}
  </div>;
}
