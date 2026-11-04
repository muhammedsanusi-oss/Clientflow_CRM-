// Presentation-safe catalogue: no database, credentials, or request dependencies.
export const WEBSITE_TEMPLATES = {
  BAKERY: {
    label: "Bakery", businessType: "BAKERY", name: "Golden Crumb Bakery", eyebrow: "Made with care. Shared with joy.",
    headline: "A little warmth,\nfresh from the oven.", sectionTitle: "Good things start here.",
    description: "A neighborhood bakery bringing people together over handmade bread, pastries, and something sweet.",
    features: ["Fresh bread", "Pastries & sweets", "Special occasions"],
    offerings: ["Artisan loaves", "Morning pastries", "Celebration bakes"],
    note: "A warm, welcoming home for your bakery, its story, and the things you make.",
    email: "hello@goldencrumb.example", phone: "2125550142", address: "123 Example Street", hours: "Tuesday–Sunday · 7am–4pm",
  },
  BARBERSHOP: {
    label: "Barbershop", businessType: "BARBERSHOP", name: "The Corner Chair", eyebrow: "Your neighborhood. Your chair.",
    headline: "Sharp cuts.\nGood company.", sectionTitle: "Find your signature.",
    description: "A neighborhood barbershop for considered cuts, fresh starts, and a little time for yourself.",
    features: ["Haircuts", "Beard care", "Personal service"],
    offerings: ["Classic cuts", "Beard shaping", "Fresh finishes"],
    note: "A confident home for your shop, your craft, and your next conversation.",
    email: "hello@cornerchair.example", phone: "2125550143", address: "45 Example Avenue", hours: "Tuesday–Saturday · 9am–6pm",
  },
  SALON: {
    label: "Salon", businessType: "SALON", name: "Bloom & Co. Salon", eyebrow: "A moment that's yours.",
    headline: "Feel like you.\nBeautifully.", sectionTitle: "Care, from the first hello.",
    description: "A welcoming salon for thoughtful styling, a fresh perspective, and time dedicated to you.",
    features: ["Thoughtful styling", "Personal attention", "A fresh perspective"],
    offerings: ["Cuts & styling", "Color consultations", "Finishing touches"],
    note: "An airy, thoughtful home for your salon and the care behind every visit.",
    email: "hello@bloomandco.example", phone: "2125550144", address: "8 Example Lane", hours: "Monday–Saturday · 10am–7pm",
  },
  CONTACT: {
    label: "Contact", businessType: "OTHER", name: "Northside Studio", eyebrow: "A good connection starts here.",
    headline: "Have something\nin mind? Let's talk.", sectionTitle: "Room for your next idea.",
    description: "An independent business focused on thoughtful work, personal service, and making your next idea happen.",
    features: ["Tell your story", "Share your details", "Start a conversation"],
    offerings: [],
    note: "A simple, polished introduction with everything someone needs to get in touch.",
    email: "hello@northside.example", phone: "2125550145", address: "By appointment", hours: "Monday–Friday · 9am–5pm",
  },
} as const;
export type WebsiteTemplateKey = keyof typeof WEBSITE_TEMPLATES;
export const WEBSITE_TEMPLATE_KEYS = ["BAKERY", "BARBERSHOP", "SALON", "CONTACT"] as const;

export function sampleBusinessDetails(template: WebsiteTemplateKey, unique: string) {
  const sample = WEBSITE_TEMPLATES[template];
  return { name: sample.name, description: sample.description, business_type: sample.businessType,
    email: sample.email, phone_number: sample.phone, public_address: sample.address, opening_hours: sample.hours,
    first_name: "Test", last_name: "Owner", owner_email: `${template.toLowerCase()}-${unique}@example.test`, website_template: template,
  };
}
