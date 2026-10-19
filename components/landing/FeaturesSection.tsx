"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Code2,
  Globe,
  Layers,
  Server,
  Webhook,
  Clock,
  ShieldCheck,
  FileCheck,
  Users,
} from "lucide-react";
import { CircularTestimonials } from "@/components/ui/circular-testimonials";

const features = [
  {
    icon: Code2,
    badge: "Developer API",
    title: "Transactional Email API",
    description:
      "Send transactional emails with a simple REST call (POST /api/v1/emails). Uses secret API keys, dynamic HTML, custom variables, and sub-100ms dispatch.",
  },
  {
    icon: Globe,
    badge: "Zero Backend",
    title: "Website Form Submissions",
    description:
      "Drop-in EmailJS alternative. Connect frontend contact forms with origin CORS domain protection, public keys, and automatic visitor confirmations.",
  },
  {
    icon: Layers,
    badge: "Multi-Industry",
    title: "Industry Workflow Presets",
    description:
      "Out-of-the-box automation engines for Education, Healthcare, CA Firms, E-Commerce, SaaS, and Agencies with tailored dynamic variables.",
  },
  {
    icon: Server,
    badge: "Deliverability",
    title: "Bring-Your-Own SMTP",
    description:
      "Zero lock-in. Connect Gmail, Microsoft 365, Hostinger, GoDaddy, Zoho, or cPanel with AES-256 encrypted storage and live test verification.",
  },
  {
    icon: Webhook,
    badge: "Real-Time",
    title: "Webhooks & Event Streaming",
    description:
      "Stream live delivery statuses to your webhooks. Monitor sent, delivered, opened, and bounced events with transparent 1x1 pixel tracking.",
  },
  {
    icon: Clock,
    badge: "Smart Queue",
    title: "Enterprise Dispatch & Scheduler",
    description:
      "Distributed message queue with intelligent rate-limiting, automated retry policies, and flexible recurring intervals (daily, weekly, monthly).",
  },
  {
    icon: ShieldCheck,
    badge: "Compliance",
    title: "RFC 8058 One-Click Unsubscribe",
    description:
      "Built-in compliance headers, automated suppression lists, and bounce protection to ensure maximum inbox deliverability and zero spam.",
  },
  {
    icon: FileCheck,
    badge: "Tax & Compliance",
    title: "GST & TDS Filing Wizards",
    description:
      "Guided compliance filing workflows for GST & TDS return preparation, ITNS 281 challan collection, and automated statutory deadline alerts.",
  },
  {
    icon: Users,
    badge: "Multi-Tenant",
    title: "Client Portal & Role Security",
    description:
      "Multi-tenant workspaces with role-based access for Master Admins, Firm Owners, Employees, and Clients with detailed audit logs.",
  },
];

const featureShowcase = [
  {
    name: "Developer API & Transactional Engine",
    designation: "Modern Resend Alternative",
    quote:
      "Send transactional emails via clean REST endpoints (POST /api/v1/emails). Authenticate with API keys, inject dynamic variables, and stream delivery webhooks with sub-100ms latency.",
    src: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "Website Contact Form API",
    designation: "EmailJS Alternative (Zero Backend)",
    quote:
      "Connect HTML, React, Next.js, or Vue forms directly to Lekvya. Enforced with origin CORS domain protection, rate limiting, and instant auto-responder emails to visitors.",
    src: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "Multi-Industry Automation Workflows",
    designation: "Ready-Made Industry Presets",
    quote:
      "Out-of-the-box workflows for Educational Institutions (tuition & hall tickets), Healthcare (appointment reminders), E-Commerce (tracking & receipts), SaaS, and Financial firms.",
    src: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "Bring-Your-Own Custom SMTP",
    designation: "Zero Vendor Lock-In",
    quote:
      "Connect your verified domain via Gmail App Passwords, Microsoft 365, Hostinger, GoDaddy, or Zoho with military-grade AES-256 encryption and live connectivity tests.",
    src: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "Statutory Filing & Document Vault",
    designation: "GST & TDS Compliance Automation",
    quote:
      "Guided filing wizards, automated statutory deadline triggers, and secure AWS S3 document exchange for client salary sheets, challans, and audit reports.",
    src: "https://images.unsplash.com/photo-1450133064473-71024230f91b?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "Enterprise Dispatch & Workflow Scheduler",
    designation: "High-Velocity Architecture & Reliability",
    quote:
      "Engineered on fault-tolerant distributed message queues with adaptive throughput throttling, automated failure recovery, and multi-interval calendar automation. Dispatch time-critical client communications with full delivery telemetry.",
    src: "https://images.unsplash.com/photo-1596526131083-e8c633c948d2?q=80&w=800&auto=format&fit=crop",
  },
];

export default function FeaturesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" className="py-24 bg-background">
      <div className="container mx-auto px-4" ref={ref}>
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            className="text-sm font-semibold text-primary uppercase tracking-wider"
          >
            Backend-Powered Features
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold text-foreground mt-3"
          >
            Everything you need to <span className="text-gradient">Automate & Scale</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground mt-4 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed"
          >
            From transactional developer APIs and website form endpoints to automated compliance filing and multi-industry communication workflows.
          </motion.p>
        </div>

        {/* Feature Showcase Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mb-20"
        >
          <CircularTestimonials
            testimonials={featureShowcase}
            autoplay={true}
            colors={{
              name: "var(--foreground)",
              designation: "var(--primary)",
              testimony: "var(--muted-foreground)",
              arrowBackground: "var(--primary)",
              arrowForeground: "var(--primary-foreground)",
              arrowHoverBackground: "color-mix(in oklch, var(--primary) 80%, transparent)",
            }}
          />
        </motion.div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              whileHover={{ y: -6, scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              transition={{
                opacity: { duration: 0.4, delay: 0.08 * i },
                y: { duration: 0.4, delay: 0.08 * i, type: "spring", stiffness: 120 },
                scale: { duration: 0.2 },
              }}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-elevated transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <motion.div
                    className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-2xs"
                    whileHover={{ rotate: [0, -8, 8, -4, 4, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <feature.icon className="w-6 h-6 transition-colors" />
                  </motion.div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {feature.badge}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
