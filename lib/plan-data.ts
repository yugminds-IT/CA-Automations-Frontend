export interface IndustryHighlight {
  id: string;
  name: string;
  iconName: string;
  tagline: string;
  basicPerk: string;
  proPerk: string;
}

export interface PlanFaq {
  q: string;
  a: string;
}

export const planFaqs: PlanFaq[] = [
  {
    q: "How does the 7-day free trial work for the Basic plan?",
    a: "You get instant, full access to all Basic plan features for 7 days with zero credit card required. You can test client onboarding, bulk email scheduling, and industry starter templates immediately. When the trial ends, you can choose to activate your subscription for ₹499/month.",
  },
  {
    q: "Can I use Lekvya for more than one industry?",
    a: "Yes! Lekvya provides industry-specific starter templates for Education, Developers, CAs, Healthcare, E-Commerce, and SaaS out of the box. You can configure multiple contact lists, templates, and workflows in the same organization.",
  },
  {
    q: "How does the Developer Contact Form API work?",
    a: "Lekvya works as a modern alternative to EmailJS or Resend. You get a public API endpoint to connect your website contact forms without needing a custom backend server. We handle form submission capture, spam filtering, visitor auto-responders, and admin notification emails.",
  },
  {
    q: "Is my client and financial data secure?",
    a: "Yes. All data stored in Lekvya is protected with industry-standard AES-256 encryption at rest, and all web traffic and API calls use TLS encryption in transit. Your client documents and contact databases are never shared or used for third-party model training.",
  },
  {
    q: "What happens when Pro and Premium plans launch?",
    a: "Users who join the waitlist will get early-bird discounted pricing, priority onboarding, and free migration assistance. If you are already on the Basic plan, you can seamlessly upgrade with one click.",
  },
  {
    q: "Do you support custom domains and white-labeling?",
    a: "Yes, custom sending domains (with SPF, DKIM, and DMARC verification) and full white-label client portals are included in the upcoming Premium tier.",
  },
];

export const industryHighlights: IndustryHighlight[] = [
  {
    id: "financial_services",
    name: "CAs & Tax Firms",
    iconName: "Calculator",
    tagline: "Automate GST/TDS deadlines, client document collection, and ITR reminders.",
    basicPerk: "Pre-built GST & TDS deadline reminder templates",
    proPerk: "Client document submission portal with follow-up tracking",
  },
  {
    id: "education",
    name: "Education & Academies",
    iconName: "GraduationCap",
    tagline: "Tuition fee reminders, exam schedules, hall tickets, and faculty council circulars.",
    basicPerk: "Semester fee due alerts & hall ticket notifications",
    proPerk: "Invigilation duty roster allocation & placement drive alerts",
  },
  {
    id: "website_developer",
    name: "Websites & Developers",
    iconName: "Code",
    tagline: "EmailJS & Resend alternative: Contact form API, auto-responders, and webhooks.",
    basicPerk: "Public contact form API endpoint with spam protection",
    proPerk: "Event webhooks, open tracking pixel, and transactional API keys",
  },
  {
    id: "healthcare",
    name: "Healthcare & Clinics",
    iconName: "HeartPulse",
    tagline: "24-hour appointment reminders, doctor consultations, and lab report readiness.",
    basicPerk: "Automated 24h patient appointment notifications",
    proPerk: "Secure lab report portal download links & follow-up care",
  },
  {
    id: "ecommerce",
    name: "E-Commerce & Retail",
    iconName: "ShoppingCart",
    tagline: "Order confirmations, shipment tracking updates, and abandoned cart nudges.",
    basicPerk: "Instant order confirmation receipts and tracking alerts",
    proPerk: "Abandoned cart re-engagement and customer review drips",
  },
  {
    id: "saas",
    name: "SaaS & Startups",
    iconName: "Rocket",
    tagline: "User onboarding drips, magic login links, trial expirations, and billing notices.",
    basicPerk: "Automated 3-step onboarding drip campaign",
    proPerk: "Expiring trial alert triggers and subscription renewal notices",
  },
];
