import { WEBSITE_TEMPLATES, type WebsiteTemplateKey } from "../../../../packages/domain/src/website-templates";
import { ContactForm } from "./contact-form";
import "./website.css";

export type PublicSiteDetails = {
  id?: string; name: string; description: string; websiteTemplate: WebsiteTemplateKey;
  email: string; phone_number: string; publicAddress: string; openingHours: string;
};

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

export function BusinessWebsite({ site, preview = false }: { site: PublicSiteDetails; preview?: boolean }) {
  const template = WEBSITE_TEMPLATES[site.websiteTemplate];
  return <div className={`business-site site-theme-${site.websiteTemplate.toLowerCase()}`}>
    {preview && <div className="site-preview-banner">Template preview · your saved business details replace this sample content.</div>}
    <div className="site-shell">
      <header className="site-nav"><a href="#home" className="site-brand"><span className="site-brand-mark" aria-hidden="true">{site.name.slice(0,1)}</span>{site.name}</a>
        <nav aria-label="Business website"><a href="#about">Our story</a><a href="#contact" className="site-nav-contact">Get in touch <span aria-hidden="true">↗</span></a></nav>
      </header>
      <main>
        <section id="home" className="site-hero">
          <div className="site-hero-copy"><p className="site-eyebrow">{template.eyebrow}</p><h1>{template.headline}</h1><p className="site-description">{site.description}</p>
            <a href="#contact" className="site-button">{site.websiteTemplate === "CONTACT" ? "Start a conversation" : "Say hello"}<span aria-hidden="true">↗</span></a>
            <div className="site-hero-footnote"><span className="site-tiny-line" />{site.name} · {template.label === "Contact" ? "Independent & approachable" : "Your neighborhood, thoughtfully served"}</div>
          </div>
          <BrandArtwork template={site.websiteTemplate} />
        </section>
        <div className="site-feature-strip">{template.features.map(feature => <span key={feature}><span aria-hidden="true">✳</span>{feature}</span>)}</div>
        <section id="about" className="site-about"><div><p className="site-eyebrow">A little about us</p><h2>{template.sectionTitle}</h2></div><p>{site.description}</p></section>
        {template.offerings.length > 0 && <section className="site-offerings" aria-label="Example offerings">
          <div className="site-section-heading"><h2>A taste of what&apos;s possible.</h2><p>Example offerings · contact the business for its current services.</p></div>
          <div className="site-offering-grid">{template.offerings.map((offering,index) => <article key={offering}><span className="site-offering-number">0{index+1}</span><h3>{offering}</h3><p>Made personal. Get in touch to learn more.</p><a href="#contact" aria-label={`Ask about ${offering}`}>Let&apos;s talk <span aria-hidden="true">↗</span></a></article>)}</div>
        </section>}
        <section id="contact" className="site-contact"><div className="site-contact-copy"><p className="site-eyebrow">We&apos;d love to hear from you</p><h2>Good things start<br />with a hello.</h2><p>Questions, ideas, or just getting to know us? Send a note and start a conversation.</p>
          <dl><div><dt>Email</dt><dd><a href={`mailto:${site.email}`}>{site.email}</a></dd></div><div><dt>Phone</dt><dd><a href={`tel:${site.phone_number.replace(/[^+\d]/g, "")}`}>{site.phone_number}</a></dd></div>
            {site.publicAddress && <div><dt>Find us</dt><dd>{site.publicAddress}</dd></div>}{site.openingHours && <div><dt>Hours</dt><dd>{site.openingHours}</dd></div>}</dl>
        </div><div className="site-form-card"><h3>Leave us a note.</h3><ContactForm businessId={site.id} preview={preview} /></div></section>
      </main>
      <footer className="site-footer"><a href="#home" className="site-brand">{site.name}</a><p>Thoughtfully connected with Clientflow.</p><a href="#contact">Let&apos;s connect ↗</a></footer>
    </div>
  </div>;
}
