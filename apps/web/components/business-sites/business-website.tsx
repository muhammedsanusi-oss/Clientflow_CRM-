/*
 * Code guide: apps/web/components/business-sites/business-website.tsx
 * Renders the template-specific decorative SVG locally. These illustrations require no image download,
 * database query, or external asset service.
 */
/*
 * Import connection: ../../../../packages/domain/src/website-templates ->
 * packages/domain/src/website-templates.ts.
 * WEBSITE_TEMPLATES: Catalogue of standard layouts, display copy, fictional sample contact details, and
 * template metadata.
 * Type WebsiteTemplateKey: Type restricting template selection to the supported catalogue keys.
 */
import { WEBSITE_TEMPLATES, type WebsiteTemplateKey } from "../../../../packages/domain/src/website-templates";
import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
/*
 * Import connection: ./contact-form -> apps/web/components/business-sites/contact-form.tsx.
 * ContactForm: Public contact form. Sends JSON to /api/sites/[businessId]/contact; the server saves it in the
 * correct owner inbox. Preview mode disables sending. No email or booking is created.
 */
import { ContactForm } from "./contact-form";
/*
 * Import connection: ../../../../packages/domain/src/website-content ->
 * packages/domain/src/website-content.ts.
 * defaultWebsiteContent: Copies the selected template default headings, button text, feature labels, and
 * offerings into an editable content object. Does not read or write the database.
 * Type WebsiteContent: Type for editable website headings, button text, feature labels, and offering titles.
 */
import { defaultWebsiteContent, type WebsiteContent } from "../../../../packages/domain/src/website-content";
/*
 * Import connection: ./website.css -> apps/web/components/business-sites/website.css.
 * Loads this stylesheet for the component/page; it supplies styles only.
 */
import "./website.css";

// Type contract: PublicSiteDetails. Describes values accepted/returned by the code below; TypeScript removes
// this declaration from the runtime bundle.
export type PublicSiteDetails = {
  id?: string; name: string; description: string; websiteTemplate: WebsiteTemplateKey;
  email: string; phone_number: string; publicAddress: string; openingHours: string;
  websiteContent?: WebsiteContent | null;
};
type EditableSection = string;

const textColorValues: Record<WebsiteContent["textColor"], string> = {
  INK: "",
  OCEAN: "#1e3a8a",
  FOREST: "#14532d",
  TERRACOTTA: "#9a3412",
  PLUM: "#6b21a8",
};
const darkTextColorValues: Record<Exclude<WebsiteContent["textColor"], "INK">, string> = {
  OCEAN: "#93c5fd",
  FOREST: "#86efac",
  TERRACOTTA: "#fdba74",
  PLUM: "#d8b4fe",
};

/*
 * Renders the template-specific decorative SVG locally. These illustrations require no image download,
 * database query, or external asset service.
 */
function BrandArtwork({ template }: { template: WebsiteTemplateKey }) {
  return <div className={`site-art site-art-${template.toLowerCase()}`} aria-hidden="true">
    <svg viewBox="0 0 480 440" fill="none" className="site-art-svg">
      {template === "BAKERY" ? <>
        <ellipse cx="240" cy="351" rx="157" ry="30" fill="#b5723d" opacity=".18" />
        <path d="M83 287c-14-83 42-171 130-186 89-14 175 47 183 129 4 50-47 101-122 111-80 11-177-3-191-54Z" fill="#bd7037" />
        <path d="M102 265c-9-69 41-139 117-151 78-12 151 37 159 108 3 41-40 83-106 92-69 9-157-5-170-49Z" fill="#e8af68" />
        <path d="m158 167 33 105m25-143 30 137m34-123 23 105m37-78 10 57" stroke="#99532c" strokeWidth="13" strokeLinecap="round" />
        <path d="m144 182 32 90m26-128 30 128m35-116 21 96m35-68 10 44" stroke="#fff0cd" strokeWidth="7" strokeLinecap="round" />
        <path d="M74 100c39 18 53 36 64 67M392 68c-36 18-58 43-70 76" stroke="#937a42" strokeWidth="3" />
        {[0,1,2,3].map(i => <g key={i} transform={`translate(${i*8} ${i*11})`}><ellipse cx="82" cy="100" rx="5" ry="13" transform="rotate(-40 82 100)" fill="#a28b50" /><ellipse cx="98" cy="99" rx="5" ry="13" transform="rotate(45 98 99)" fill="#a28b50" /></g>)}
      </> : template === "BARBERSHOP" ? <>
        <circle cx="240" cy="208" r="151" stroke="#c9a36b" strokeWidth="2" opacity=".5" />
        <circle cx="240" cy="208" r="136" stroke="#c9a36b" strokeWidth="1" opacity=".3" />
        <path d="m175 284 130-162M300 285 177 120" stroke="#d9b77f" strokeWidth="12" strokeLinecap="round" />
        <circle cx="156" cy="302" r="30" stroke="#d9b77f" strokeWidth="11" /><circle cx="318" cy="302" r="30" stroke="#d9b77f" strokeWidth="11" />
        <circle cx="239" cy="204" r="10" fill="#151c1b" stroke="#d9b77f" strokeWidth="5" />
        <path d="M159 90h162M201 70h78M166 354h147" stroke="#c9a36b" strokeWidth="2" />
        <text x="240" y="395" textAnchor="middle" fill="#c9a36b" fontSize="12" letterSpacing="7">THE EVERYDAY RITUAL</text>
      </> : template === "SALON" ? <>
        <path d="M114 350V178a126 126 0 0 1 252 0v172Z" fill="#d7b4a6" />
        <path d="M135 350V181a105 105 0 0 1 210 0v169Z" stroke="#f5e9dd" strokeWidth="2" />
        <path d="M237 341c-8-58 7-148 51-217M236 300c-41-22-75-65-80-110M244 252c37-8 68-37 79-80" stroke="#67735c" strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="275" cy="145" rx="17" ry="37" transform="rotate(27 275 145)" fill="#f7eee2" />
        <ellipse cx="304" cy="180" rx="16" ry="33" transform="rotate(58 304 180)" fill="#f7eee2" />
        <ellipse cx="176" cy="213" rx="15" ry="36" transform="rotate(-35 176 213)" fill="#f7eee2" />
        <ellipse cx="220" cy="220" rx="15" ry="36" transform="rotate(24 220 220)" fill="#ebe0cf" />
        <ellipse cx="269" cy="263" rx="16" ry="33" transform="rotate(63 269 263)" fill="#ebe0cf" />
        <path d="M70 350h340" stroke="#ab887b" strokeWidth="2" />
      </> : <>
        <rect x="88" y="103" width="304" height="236" rx="22" fill="#ede8db" transform="rotate(-8 88 103)" />
        <rect x="98" y="114" width="296" height="222" rx="18" fill="#fbfaf4" stroke="#cfccb8" strokeWidth="2" />
        <path d="m125 146 122 96 117-96M125 300l85-81m153 81-84-82" stroke="#52634e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="359" cy="107" r="46" fill="#d6e1bd" /><path d="m340 121 37-28m-29-4 30 3-2 29" stroke="#52634e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </>}
    </svg>
    <span className="site-art-caption">{WEBSITE_TEMPLATES[template].label === "Contact" ? "A note can start something good." : "A place for your story."}</span>
  </div>;
}

/*
 * Shared rendering for live sites, creation previews, editor previews, and owner previews. Combines public
 * business fields with saved content or template defaults and includes ContactForm.
 */
export function BusinessWebsite({ site, preview = false, draftImagePreviews = {}, onSelectSection, selectedSection }: {
  site: PublicSiteDetails;
  preview?: boolean;
  draftImagePreviews?: Record<string, string>;
  onSelectSection?: (section: EditableSection) => void;
  selectedSection?: string;
}) {
  const template = WEBSITE_TEMPLATES[site.websiteTemplate];
  const defaults = defaultWebsiteContent(site.websiteTemplate, site.description);
  const content = site.websiteContent ?? defaults;
  const customized = Boolean(site.websiteContent) && JSON.stringify(content.offerings) !== JSON.stringify(defaults.offerings);
  const isDark = site.websiteTemplate === "BARBERSHOP";
  const chosenTextColor = content.textColor === "INK"
    ? undefined
    : isDark
      ? darkTextColorValues[content.textColor]
      : textColorValues[content.textColor];
  const style = {
    "--site-font": content.fontFamily === "SERIF" ? "Georgia, 'Times New Roman', serif" : "Arial, Helvetica, sans-serif",
    "--site-text-scale": content.textScale === "SMALL" ? "0.9" : content.textScale === "LARGE" ? "1.1" : "1",
    ...(chosenTextColor ? { "--site-text": chosenTextColor, "--site-muted": chosenTextColor, "--site-accent": chosenTextColor } : {}),
  } as CSSProperties;
  const imageSections = content.sectionImages;
  const imageLocator = (section: string, index: number) => `${section}-${index}`;
  const imageSource = (section: string, index: number) => {
    const locator = imageLocator(section, index);
    return draftImagePreviews[locator] ?? (site.id ? `/api/sites/${encodeURIComponent(site.id)}/image/${locator}` : undefined);
  };
  const imageGallery = (section: string, refs: string[], label: string, className = "", startIndex = 0) => refs.length > 0
    ? <div className={`site-image-gallery ${className}`} aria-label={`${label} images`}>
        {refs.map((_, offset) => {
          const index = startIndex + offset;
          const src = imageSource(section, index);
          return src ? <img key={`${section}-${index}`} src={src} alt={`${site.name} ${label} image ${index + 1}`} /> : null;
        })}
      </div>
    : null;
  const editorClass = (section: string) => onSelectSection
    ? ` site-editable-section${selectedSection === section ? " site-selected-section" : ""}`
    : "";
  const sectionProps = (section: string, label: string) => onSelectSection ? {
    "data-website-editor-section": section,
    "aria-label": `Select ${label} section to edit`,
    role: "group" as const,
    tabIndex: 0,
    onClick: (event: MouseEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onSelectSection(section);
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      onSelectSection(section);
    },
  } : {};
  return <div className={`business-site site-theme-${site.websiteTemplate.toLowerCase()}`} style={style}>
    {preview && <div className="site-preview-banner">Preview · contact messages are disabled.</div>}
    <div className="site-shell">
      <header className={`site-nav${editorClass("header")}`} {...sectionProps("header", "header")}><a href="#home" className="site-brand">{imageSections.header[0] ? <img src={imageSource("header", 0)} alt="" className="site-logo" /> : <span className="site-brand-mark" aria-hidden="true">{site.name.slice(0,1)}</span>}{site.name}</a>
        <nav aria-label="Business website"><a href="#about">Our story</a>{!preview && site.id ? <a href={`/book/${encodeURIComponent(site.id)}`} className="site-nav-contact">Book online <span aria-hidden="true">↗</span></a> : null}<a href="#contact" className="site-nav-contact">Get in touch <span aria-hidden="true">↗</span></a></nav>
      </header>
      {imageGallery("header", imageSections.header.slice(1), "header", "site-header-gallery", 1)}
      <main>
        <section id="home" className={`site-hero${editorClass("hero")}`} {...sectionProps("hero", "hero")}>
          <div className="site-hero-copy"><p className="site-eyebrow">{content.eyebrow}</p><h1>{content.headline}</h1><p className="site-description">{site.description}</p>
            <a href="#contact" className="site-button">{content.buttonLabel}<span aria-hidden="true">↗</span></a>
            <div className="site-hero-footnote"><span className="site-tiny-line" />{site.name} · {template.label === "Contact" ? "Independent & approachable" : "Your neighborhood, thoughtfully served"}</div>
          </div>
          {imageSections.hero.length > 0 ? imageGallery("hero", imageSections.hero, "hero", "site-hero-gallery") : <BrandArtwork template={site.websiteTemplate} />}
        </section>
        {(content.features.length > 0 || imageSections.features.length > 0) && <div className={`site-feature-strip${editorClass("features")}`} {...sectionProps("features", "features")}>{content.features.map((feature,index) => <span key={index}><span aria-hidden="true">✳</span>{feature}</span>)}{imageGallery("features", imageSections.features, "features")}</div>}
        <section id="about" className={`site-about${editorClass("about")}`} {...sectionProps("about", "about")}><div><p className="site-eyebrow">A little about us</p><h2>{content.sectionTitle}</h2>{imageGallery("about", imageSections.about, "about")}</div><p>{content.aboutText}</p></section>
        {(content.offerings.length > 0 || imageSections.offerings.length > 0) && <section className={`site-offerings${editorClass("offerings")}`} aria-label={customized ? "Our offerings" : "Example offerings"} {...sectionProps("offerings", "offerings")}>
          <div className="site-section-heading"><h2>{customized ? "What we offer." : "A taste of what's possible."}</h2><p>{customized ? "Contact us to learn more." : "Example offerings · contact the business for its current services."}</p></div>
          {imageGallery("offerings", imageSections.offerings, "offerings")}
          <div className="site-offering-grid">{content.offerings.map((offering,index) => <article key={index}><span className="site-offering-number">0{index+1}</span><h3>{offering}</h3><p>{customized ? "Get in touch to learn more." : "Made personal. Get in touch to learn more."}</p><a href="#contact" aria-label={`Ask about ${offering}`}>Let&apos;s talk <span aria-hidden="true">↗</span></a></article>)}</div>
        </section>}
        {content.additionalSections.map((section, index) => <section key={`${section.heading}-${index}`} className={`site-custom-section${editorClass(`custom-${index}`)}`} {...sectionProps(`custom-${index}`, `custom section ${index + 1}`)}>
          <h2>{section.heading}</h2><p>{section.body}</p>{imageGallery(`custom-${index}`, section.images, section.heading)}
        </section>)}
        <section id="contact" className={`site-contact${editorClass("contact")}`} {...sectionProps("contact", "contact")}><div className="site-contact-copy"><p className="site-eyebrow">We&apos;d love to hear from you</p><h2>Good things start<br />with a hello.</h2><p>Questions, ideas, or just getting to know us? Send a note and start a conversation.</p>{imageGallery("contact", imageSections.contact, "contact")}
          <dl><div><dt>Email</dt><dd><a href={`mailto:${site.email}`}>{site.email}</a></dd></div><div><dt>Phone</dt><dd><a href={`tel:${site.phone_number.replace(/[^+\d]/g, "")}`}>{site.phone_number}</a></dd></div>
            {site.publicAddress && <div><dt>Find us</dt><dd>{site.publicAddress}</dd></div>}{site.openingHours && <div><dt>Hours</dt><dd>{site.openingHours}</dd></div>}</dl>
        </div><div className="site-form-card"><h3>Leave us a note.</h3><ContactForm businessId={site.id} preview={preview} /></div></section>
      </main>
      <footer className="site-footer"><a href="#home" className="site-brand">{site.name}</a><p>Thoughtfully connected with Clientflow.</p><a href="#contact">Let&apos;s connect ↗</a></footer>
    </div>
  </div>;
}
