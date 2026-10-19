"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Check,
  Star,
  Zap,
  GraduationCap,
  Code,
  Calculator,
  HeartPulse,
  ShoppingCart,
  Rocket,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { planFaqs, industryHighlights, IndustryHighlight } from "@/lib/plan-data";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calculator,
  GraduationCap,
  Code,
  HeartPulse,
  ShoppingCart,
  Rocket,
};

export default function PlanView() {
  const router = useRouter();
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryHighlight>(industryHighlights[0]);
  const SelectedIcon = iconMap[selectedIndustry.iconName] || Star;

  const goToContact = () => {
    router.push("/#contact");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white py-2.5 px-4 text-center text-xs md:text-sm font-medium flex items-center justify-center gap-2">
        <Zap className="w-4 h-4 fill-white" />
        <span>Special Launch Offer: Get instant 7-day free trial on the Basic Plan. No credit card required!</span>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-20 max-w-6xl">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
          <a href="/" className="hover:text-foreground transition-colors">Home</a>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">Plans & Pricing</span>
        </nav>

        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs md:text-sm font-semibold mb-4 border border-orange-500/20">
            <Star className="w-3.5 h-3.5 fill-orange-500" />
            Simple, Transparent Multi-Industry Pricing
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            Transparent Plans Tailored for <span className="text-gradient">Every Industry</span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
            Automate client communications, transactional APIs, and reminder pipelines. Whether you run a CA firm, school, healthcare clinic, or build web apps, choose the plan that scales with your ambition.
          </p>
        </div>

        {/* Industry Focus Switcher */}
        <div className="mb-14">
          <div className="text-center mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select your industry to see tailored capabilities:
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 max-w-4xl mx-auto">
            {industryHighlights.map((ind) => {
              const Icon = iconMap[ind.iconName] || Star;
              const isSelected = selectedIndustry.id === ind.id;
              return (
                <button
                  key={ind.id}
                  onClick={() => setSelectedIndustry(ind)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    isSelected
                      ? "bg-orange-500 text-white border-orange-600 shadow-md scale-105"
                      : "bg-card hover:bg-accent border-border text-foreground"
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? "text-white" : "text-orange-500"}`} />
                  <span className="text-xs font-semibold">{ind.name}</span>
                </button>
              );
            })}
          </div>

          {/* Dynamic Industry Insight Card */}
          <div className="mt-6 p-4 rounded-xl bg-orange-500/5 border border-orange-500/20 max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <p className="text-sm font-semibold text-foreground">
                For {selectedIndustry.name}:
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedIndustry.tagline}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-background px-2.5 py-1 rounded-md border border-border">
                <Check className="w-3 h-3 text-green-500" /> {selectedIndustry.basicPerk}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-20 items-stretch">
          {/* Basic Plan */}
          <div className="relative rounded-2xl p-8 flex flex-col bg-foreground text-background border-2 border-foreground shadow-2xl scale-105 transition-transform">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold shadow-md">
                <Star className="w-3 h-3 fill-white" /> Most Popular
              </span>
            </div>

            <div className="mb-6">
              <h3 className="text-2xl font-bold">Basic</h3>
              <p className="text-xs text-background/80 mt-1">
                Ideal for individual CAs, schools, clinics, and developers starting out.
              </p>
            </div>

            <div className="mb-6 flex items-baseline gap-2">
              <span className="text-4xl md:text-5xl font-extrabold">₹499</span>
              <span className="text-sm text-background/70 font-medium">/ month</span>
            </div>

            <div className="mb-6 inline-flex self-start px-3 py-1 rounded-full text-xs font-semibold bg-background/20 text-background">
              ⚡ 7-day Free Trial Included
            </div>

            <Button
              size="lg"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-6 rounded-xl shadow-lg mb-8"
              onClick={() => router.push("/login")}
            >
              Start 7-Day Free Trial
            </Button>

            <div className="space-y-3.5 text-sm flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-background/70">
                What&apos;s Included:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                  <span><strong>All 6 Industry Starters</strong> (Education, Healthcare, CA, E-Com, SaaS, Dev)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                  <span><strong>Contact Form API</strong> (EmailJS style website auto-responders)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                  <span><strong>Client Onboarding System</strong> & Intake forms</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                  <span><strong>Bulk Email Scheduler</strong> (Daily, Weekly, Monthly)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                  <span>5 Custom Email Templates with Dynamic Variables</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                  <span>Client Document Submission Portal</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                  <span>Centralized Activity & Real-time Dashboard</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Pro Plan */}
          <div className="relative rounded-2xl p-8 flex flex-col bg-card border border-border shadow-sm">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-bold text-foreground">Pro</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent text-accent-foreground border border-border">
                  Coming Soon
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                For growing institutions, agencies, clinics, and multi-member firms.
              </p>
            </div>

            <div className="mb-6 flex items-baseline gap-2">
              <span className="text-4xl md:text-5xl font-extrabold text-foreground">₹699</span>
              <span className="text-sm text-muted-foreground font-medium">/ month</span>
            </div>

            <div className="mb-6 text-xs text-muted-foreground">
              Billed monthly • Early access waitlist
            </div>

            <Button
              size="lg"
              variant="outline"
              className="w-full py-6 rounded-xl font-semibold mb-8 border-orange-500/40 text-orange-600 hover:bg-orange-500/10"
              onClick={goToContact}
            >
              Join Pro Waitlist
            </Button>

            <div className="space-y-3.5 text-sm flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Everything in Basic, plus:
              </p>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <span className="text-foreground"><strong>Unlimited Custom Templates</strong> & Custom Merge Tags</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <span className="text-foreground"><strong>Developer Webhooks</strong> & Custom Trigger Events</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <span><strong>Open & Click Tracking Analytics</strong> (1x1 GIF & redirects)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <span><strong>Priority Delivery Queues</strong> with high inbox placement</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <span>Dedicated Client Portal Logins</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <span>Team Collaboration & Role Management</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <span>REST API Access with Bearer Authentication</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Premium Plan */}
          <div className="relative rounded-2xl p-8 flex flex-col bg-card border border-border shadow-sm">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-2xl font-bold text-foreground">Premium</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent text-accent-foreground border border-border">
                  Coming Soon
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Enterprise infrastructure for universities, hospital chains, and large firms.
              </p>
            </div>

            <div className="mb-6 flex items-baseline gap-2">
              <span className="text-4xl md:text-5xl font-extrabold text-foreground">₹999</span>
              <span className="text-sm text-muted-foreground font-medium">/ month</span>
            </div>

            <div className="mb-6 text-xs text-muted-foreground">
              Enterprise SLA • Custom setup assistance
            </div>

            <Button
              size="lg"
              variant="outline"
              className="w-full py-6 rounded-xl font-semibold mb-8 hover:bg-accent"
              onClick={goToContact}
            >
              Contact Enterprise Sales
            </Button>

            <div className="space-y-3.5 text-sm flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Everything in Pro, plus:
              </p>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <span className="text-foreground"><strong>Custom Sending Domain</strong> (SPF, DKIM, DMARC)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <span className="text-foreground"><strong>100% White-label Branding</strong> & Custom Subdomains</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <span>Dedicated Account Manager & 24/7 SLA</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <span>Custom ERP / SIS / CRM Integrations</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <span>Advanced Security & Audit Logs (AES-256)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                  <span>Unlimited Organization Users & Workspaces</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="mb-20">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Compare Plan Features
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Detailed breakdown of features across all tiers.
            </p>
          </div>

          <div className="overflow-x-auto border border-border rounded-2xl bg-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="p-4 font-semibold text-foreground">Feature</th>
                  <th className="p-4 font-semibold text-foreground text-center">Basic (₹499)</th>
                  <th className="p-4 font-semibold text-foreground text-center">Pro (₹699)</th>
                  <th className="p-4 font-semibold text-foreground text-center">Premium (₹999)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="p-4 font-medium text-foreground">Free Trial Period</td>
                  <td className="p-4 text-center text-green-600 font-semibold">7 Days</td>
                  <td className="p-4 text-center text-muted-foreground">-</td>
                  <td className="p-4 text-center text-muted-foreground">-</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-foreground">Multi-Industry Starter Presets</td>
                  <td className="p-4 text-center text-green-600 font-semibold">All 6 Verticals</td>
                  <td className="p-4 text-center text-green-600 font-semibold">All 6 Verticals</td>
                  <td className="p-4 text-center text-green-600 font-semibold">All 6 + Custom</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-foreground">Custom Email Templates</td>
                  <td className="p-4 text-center">5 Templates</td>
                  <td className="p-4 text-center text-green-600 font-semibold">Unlimited</td>
                  <td className="p-4 text-center text-green-600 font-semibold">Unlimited</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-foreground">Developer Contact Form API</td>
                  <td className="p-4 text-center text-green-600 font-semibold">Included</td>
                  <td className="p-4 text-center text-green-600 font-semibold">Included</td>
                  <td className="p-4 text-center text-green-600 font-semibold">Included + High Throughput</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-foreground">Developer Webhooks</td>
                  <td className="p-4 text-center text-muted-foreground">-</td>
                  <td className="p-4 text-center text-green-600 font-semibold">Included</td>
                  <td className="p-4 text-center text-green-600 font-semibold">Included</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-foreground">Open & Click Tracking Analytics</td>
                  <td className="p-4 text-center text-muted-foreground">Basic</td>
                  <td className="p-4 text-center text-green-600 font-semibold">Advanced Real-time</td>
                  <td className="p-4 text-center text-green-600 font-semibold">Advanced Real-time</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-foreground">Custom Domain (SPF / DKIM / DMARC)</td>
                  <td className="p-4 text-center text-muted-foreground">-</td>
                  <td className="p-4 text-center text-muted-foreground">-</td>
                  <td className="p-4 text-center text-green-600 font-semibold">Included</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-foreground">White-Label Branding</td>
                  <td className="p-4 text-center text-muted-foreground">-</td>
                  <td className="p-4 text-center text-muted-foreground">-</td>
                  <td className="p-4 text-center text-green-600 font-semibold">Included</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-foreground">Security Encryption</td>
                  <td className="p-4 text-center">AES-256 & TLS</td>
                  <td className="p-4 text-center">AES-256 & TLS</td>
                  <td className="p-4 text-center text-green-600 font-semibold">AES-256 + Dedicated SLA</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Multi-Industry FAQ Accordion */}
        <div className="max-w-3xl mx-auto mb-20">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-orange-600">
              Got Questions?
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-2">
              Frequently Asked Questions About Lekvya Plans
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {planFaqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="bg-card border border-border rounded-xl px-5"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-sm">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Bottom CTA Banner */}
        <div className="rounded-2xl p-8 md:p-12 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-background border border-orange-500/30 text-center max-w-4xl mx-auto">
          <ShieldCheck className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Start Automating Your Communications Today
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto text-sm md:text-base">
            Join hundreds of CAs, educators, developers, clinics, and businesses saving 15+ hours each week with Lekvya.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
            <Button
              size="lg"
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-6 rounded-xl shadow-lg"
              onClick={() => router.push("/login")}
            >
              Start 7-Day Free Trial <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="py-6 px-8 rounded-xl font-semibold border-border hover:bg-accent"
              onClick={goToContact}
            >
              Book a Personalized Demo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
