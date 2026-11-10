"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import type { PublishWebsiteInput } from "../../../../../../packages/domain/src/website-editing";
import {
  defaultWebsiteContent,
  type WebsiteImageSection,
  WEBSITE_FONT_FAMILIES,
  WEBSITE_TEXT_COLORS,
  WEBSITE_TEXT_SCALES,
} from "../../../../../../packages/domain/src/website-content";
import { countWebsiteImages, WEBSITE_PLANS, type WebsitePlanKey } from "../../../../../../packages/domain/src/website-plans";
import { WEBSITE_TEMPLATE_KEYS, WEBSITE_TEMPLATES } from "../../../../../../packages/domain/src/website-templates";
import { BusinessWebsite } from "../../../../components/business-sites/business-website";
import { publishWebsiteAction } from "./actions";
import { WebsiteFeatureRequestForm } from "./feature-request-form";

type EditorSection = "header" | "hero" | "features" | "about" | "offerings" | "contact" | "design" | `custom-${number}`;
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
  const [selectedSection, setSelectedSection] = useState<EditorSection>("hero");
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
    setValues(current => ({ ...current, [key]: value }));
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

  const customIndex = selectedSection.startsWith("custom-")
    ? Number(selectedSection.slice("custom-".length))
    : -1;
  const selectedCustomSection = customIndex >= 0 ? values.additionalSections[customIndex] : undefined;

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setPublished(false);
    try {
      const result = await publishWebsiteAction(businessId, values);
      if (result.error) setError(result.error.message);
      else if (result.publication) {
        setValues(current => ({ ...current, version: result.publication.version }));
        setPublishedImageCount(countWebsiteImages(values));
        setPublished(true);
      }
    } catch {
      setError("Your website could not be published. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return <div className="space-y-5" aria-busy={pending || uploadingSection !== null}>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div>
        <p className="font-semibold">Live website preview</p>
        <p className="text-sm text-slate-600">Click a section on the page to edit it. Changes preview immediately and publish only when you choose.</p>
        {websitePlan && <p className="mt-1 text-xs font-medium text-indigo-700">{WEBSITE_PLANS[websitePlan].label} demo plan · {maxImages} images maximum</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" form="website-editor-form" disabled={pending || uploadingSection !== null} className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Publishing…" : "Save and publish"}
        </button>
        <Link href={`/businesses/${businessId}`} className="text-sm text-indigo-700 underline">Cancel</Link>
        <a href={`/sites/${businessId}`} target="_blank" rel="noreferrer" className="text-sm text-indigo-700 underline">Open published website</a>
      </div>
    </div>

    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {published && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">Website published. The owner can view these changes on the public website and in their portal.</p>}

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
      <section id="website-preview" aria-label="Live website preview" className="min-w-0 overflow-hidden rounded-xl border border-slate-300 bg-white">
        <BusinessWebsite
          preview
          site={{ ...values, id: businessId, websiteContent: values }}
          draftImagePreviews={draftImagePreviews}
          onSelectSection={section => setSelectedSection(section as EditorSection)}
          selectedSection={selectedSection}
        />
      </section>

      <aside className="min-w-0 space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5" aria-label="Selected section settings">
        <form id="website-editor-form" onSubmit={publish}>
        <fieldset disabled={pending || uploadingSection !== null} className="min-w-0 space-y-4 border-0 p-0">
        <div>
          <h2 className="text-lg font-semibold">Edit website</h2>
          <p className="mt-1 text-sm text-slate-600">Selected section settings update the preview without publishing.</p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Website sections">
          {standardSections.map(section => <button key={section.key} type="button" aria-pressed={selectedSection === section.key}
            onClick={() => setSelectedSection(section.key)} className={`rounded-full border px-3 py-1.5 text-sm ${selectedSection === section.key ? "border-indigo-700 bg-indigo-50 text-indigo-800" : "border-slate-300"}`}>
            {section.label}
          </button>)}
          {values.additionalSections.map((section, index) => {
            const key = `custom-${index}` as const;
            return <button key={key} type="button" aria-pressed={selectedSection === key} onClick={() => setSelectedSection(key)}
              className={`rounded-full border px-3 py-1.5 text-sm ${selectedSection === key ? "border-indigo-700 bg-indigo-50 text-indigo-800" : "border-slate-300"}`}>
              {section.heading || `Section ${index + 1}`}
            </button>;
          })}
          <button type="button" aria-pressed={selectedSection === "design"} onClick={() => setSelectedSection("design")}
            className={`rounded-full border px-3 py-1.5 text-sm ${selectedSection === "design" ? "border-indigo-700 bg-indigo-50 text-indigo-800" : "border-slate-300"}`}>Design</button>
        </div>

        {selectedSection === "header" && <div className="space-y-4">
          <label className="block text-sm font-medium">Public business name
            <input value={values.name} maxLength={100} onChange={event => update("name", event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" />
          </label>
          {imageControls("header")}
        </div>}

        {selectedSection === "hero" && <div className="space-y-4">
          <label className="block text-sm font-medium">Hero introduction
            <input value={values.eyebrow} maxLength={100} onChange={event => update("eyebrow", event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" />
          </label>
          <label className="block text-sm font-medium">Hero headline
            <textarea value={values.headline} maxLength={200} rows={3} onChange={event => update("headline", event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" />
          </label>
          <label className="block text-sm font-medium">Hero description
            <textarea value={values.description} maxLength={1000} rows={4} onChange={event => update("description", event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" />
          </label>
          <label className="block text-sm font-medium">Button label
            <input value={values.buttonLabel} maxLength={60} onChange={event => update("buttonLabel", event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" />
          </label>
          {imageControls("hero")}
        </div>}

        {selectedSection === "features" && <div className="space-y-4">
          <label className="block text-sm font-medium">Feature labels (up to 3)
            <textarea value={values.features.join("\n")} rows={4} maxLength={302} onChange={event => update("features", lines(event.target.value))} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" />
            <span className="mt-1 block text-xs text-slate-500">One per line. Leave blank to hide this section.</span>
          </label>
          {imageControls("features")}
        </div>}

        {selectedSection === "about" && <div className="space-y-4">
          <label className="block text-sm font-medium">About section heading
            <input value={values.sectionTitle} maxLength={160} onChange={event => update("sectionTitle", event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" />
          </label>
          <label className="block text-sm font-medium">About section text
            <textarea value={values.aboutText} maxLength={1000} rows={4} onChange={event => update("aboutText", event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" />
          </label>
          {imageControls("about")}
        </div>}

        {selectedSection === "offerings" && <div className="space-y-4">
          <label className="block text-sm font-medium">Offering titles (up to 6)
            <textarea value={values.offerings.join("\n")} rows={5} maxLength={605} onChange={event => update("offerings", lines(event.target.value))} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" />
            <span className="mt-1 block text-xs text-slate-500">Website text only; these do not create bookable services.</span>
          </label>
          {imageControls("offerings")}
        </div>}

        {selectedSection === "contact" && <div className="space-y-4">
          <p className="text-sm text-slate-600">These are public contact details. Published changes also appear in the owner&apos;s portal; the owner&apos;s login email is unchanged.</p>
          <label className="block text-sm font-medium">Public contact email
            <input type="email" value={values.email} maxLength={254} onChange={event => update("email", event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" />
          </label>
          <label className="block text-sm font-medium">Public phone
            <input type="tel" value={values.phone_number} minLength={7} maxLength={30} onChange={event => update("phone_number", event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" />
          </label>
          <label className="block text-sm font-medium">Public address
            <input value={values.publicAddress} maxLength={300} onChange={event => update("publicAddress", event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" />
          </label>
          <label className="block text-sm font-medium">Opening hours
            <textarea value={values.openingHours} maxLength={500} rows={3} onChange={event => update("openingHours", event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" />
          </label>
          {imageControls("contact")}
        </div>}

        {selectedCustomSection && <div className="space-y-4">
          <label className="block text-sm font-medium">Section heading
            <input required value={selectedCustomSection.heading} maxLength={100} onChange={event => {
              const heading = event.target.value;
              edited();
              setValues(current => ({ ...current, additionalSections: current.additionalSections.map((section, index) => index === customIndex ? { ...section, heading } : section) }));
            }} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" />
          </label>
          <label className="block text-sm font-medium">Section text
            <textarea required value={selectedCustomSection.body} maxLength={2000} rows={5} onChange={event => {
              const body = event.target.value;
              edited();
              setValues(current => ({ ...current, additionalSections: current.additionalSections.map((section, index) => index === customIndex ? { ...section, body } : section) }));
            }} className="mt-2 block w-full rounded-lg border border-slate-300 p-3" />
          </label>
          {imageControls(selectedSection as ImageSection)}
          <div className="flex flex-wrap gap-4">
            <button type="button" disabled={customIndex === 0} onClick={() => {
              edited();
              setValues(current => {
                const sections = [...current.additionalSections];
                [sections[customIndex - 1], sections[customIndex]] = [sections[customIndex], sections[customIndex - 1]];
                return { ...current, additionalSections: sections };
              });
              setSelectedSection(`custom-${customIndex - 1}`);
            }} className="text-sm text-indigo-700 underline disabled:opacity-40">Move up</button>
            <button type="button" disabled={customIndex === values.additionalSections.length - 1} onClick={() => {
              edited();
              setValues(current => {
                const sections = [...current.additionalSections];
                [sections[customIndex], sections[customIndex + 1]] = [sections[customIndex + 1], sections[customIndex]];
                return { ...current, additionalSections: sections };
              });
              setSelectedSection(`custom-${customIndex + 1}`);
            }} className="text-sm text-indigo-700 underline disabled:opacity-40">Move down</button>
            <button type="button" onClick={() => {
              if (!window.confirm("Remove this section from the website? Its uploaded images will be retained.")) return;
              edited();
              setValues(current => ({ ...current, additionalSections: current.additionalSections.filter((_, index) => index !== customIndex) }));
              setSelectedSection("about");
            }} className="text-sm text-red-700 underline">Remove section</button>
          </div>
        </div>}

        {selectedSection === "design" && <div className="space-y-4">
          {canChangeTemplate && <label className="block text-sm font-medium">Website template
            <select value={values.websiteTemplate} onChange={event => update("websiteTemplate", event.target.value as PublishWebsiteInput["websiteTemplate"])} className="mt-2 block w-full rounded-lg border border-slate-300 p-3">
              {WEBSITE_TEMPLATE_KEYS.map(key => <option key={key} value={key}>{WEBSITE_TEMPLATES[key].label}</option>)}
            </select>
          </label>}
          <label className="block text-sm font-medium">Font
            <select value={values.fontFamily} onChange={event => update("fontFamily", event.target.value as PublishWebsiteInput["fontFamily"])} className="mt-2 block w-full rounded-lg border border-slate-300 p-3">
              {WEBSITE_FONT_FAMILIES.map(value => <option key={value} value={value}>{value === "SANS" ? "Sans-serif" : "Serif"}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">Text color
            <select value={values.textColor} onChange={event => update("textColor", event.target.value as PublishWebsiteInput["textColor"])} className="mt-2 block w-full rounded-lg border border-slate-300 p-3">
              {WEBSITE_TEXT_COLORS.map(value => <option key={value} value={value}>{value[0] + value.slice(1).toLowerCase()}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">Text size
            <select value={values.textScale} onChange={event => update("textScale", event.target.value as PublishWebsiteInput["textScale"])} className="mt-2 block w-full rounded-lg border border-slate-300 p-3">
              {WEBSITE_TEXT_SCALES.map(value => <option key={value} value={value}>{value[0] + value.slice(1).toLowerCase()}</option>)}
            </select>
          </label>
          <p className="text-xs text-slate-500">These choices apply consistently across the website.</p>
          {canChangeTemplate && <button type="button" onClick={() => {
            if (!window.confirm("Replace customized headings, feature labels, and offerings with this template's text?")) return;
            const defaults = defaultWebsiteContent(values.websiteTemplate);
            edited();
            setValues(current => ({
              ...current,
              eyebrow: defaults.eyebrow,
              headline: defaults.headline,
              sectionTitle: defaults.sectionTitle,
              buttonLabel: defaults.buttonLabel,
              features: defaults.features,
              offerings: defaults.offerings,
            }));
          }} className="text-sm text-indigo-700 underline">Use template text</button>}
        </div>}

        {selectedSection !== "design" && !selectedCustomSection && canAddCustomSections && <button type="button" disabled={values.additionalSections.length >= 6} onClick={() => {
          const index = values.additionalSections.length;
          edited();
          setValues(current => ({ ...current, additionalSections: [...current.additionalSections, { heading: "New section", body: "Add your text here.", images: [] }] }));
          setSelectedSection(`custom-${index}`);
        }} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold disabled:opacity-50">Add text section</button>}
        {selectedSection !== "design" && !selectedCustomSection && !canAddCustomSections && <p className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900">Custom sections are available on Plus and Premium plans.</p>}
        </fieldset>
        </form>
      </aside>
    </div>
    {canSubmitFeatureRequests && <WebsiteFeatureRequestForm
      businessId={businessId}
      initialCount={featureRequestCount}
      limit={featureRequestLimit}
    />}
  </div>;
}
