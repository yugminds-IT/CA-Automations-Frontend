"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Users,
  Mail,
  FileText,
  LayoutTemplate,
  Shield,
  BarChart3,
} from "lucide-react";
import { CircularTestimonials } from "@/components/ui/circular-testimonials";

const features = [
  {
    icon: Users,
    title: "Client Onboarding System",
    description: "Smooth and structured onboarding flow to get clients started quickly.",
  },
  {
    icon: Mail,
    title: "Bulk Email Scheduler",
    description: "Send instant emails or schedule them daily, weekly, or monthly with ease.",
  },
  {
    icon: FileText,
    title: "Custom Email Templates",
    description: "Create personalized templates that match your brand and communication style.",
  },
  {
    icon: LayoutTemplate,
    title: "Pre-built Templates Library",
    description: "Ready-to-use professional email formats for common business scenarios.",
  },
  {
    icon: Shield,
    title: "Organization & Client Login",
    description: "Secure multi-user access with separate organization and client portals.",
  },
  {
    icon: BarChart3,
    title: "Automation Dashboard",
    description: "Centralized control for all activities with real-time insights and analytics.",
  },
];

const featureShowcase = [
  {
    name: "Client Onboarding System",
    designation: "Seamless Client Management",
    quote:
      "Automate your entire onboarding workflow — from sign-up forms to document collection. Get clients started in minutes, not days.",
    src: "https://images.unsplash.com/photo-1553877522-43269d4ea984?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "Bulk Email Scheduler",
    designation: "Smart Email Automation",
    quote:
      "Send instant emails or schedule campaigns daily, weekly, or monthly. Reach thousands of clients with a single click using AI-powered scheduling.",
    src: "https://images.unsplash.com/photo-1596526131083-e8c633c948d2?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "Custom Email Templates",
    designation: "Brand-Consistent Communication",
    quote:
      "Design personalized templates that reflect your brand identity. Drag-and-drop editor makes it easy to create professional emails in minutes.",
    src: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "Pre-built Templates Library",
    designation: "Ready-to-Use Formats",
    quote:
      "Choose from a curated library of professional email templates for ITR reminders, onboarding emails, payment alerts, and more.",
    src: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "Automation Dashboard",
    designation: "Centralized Control Center",
    quote:
      "Monitor all your activities from one powerful dashboard. Track email performance, client status, and document submissions with real-time analytics.",
    src: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop",
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
            Features
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold text-foreground mt-3"
          >
            Everything you need to{" "}
            <span className="text-gradient">Automate</span>

          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground mt-4 max-w-xl mx-auto"
          >
            Powerful tools designed to save you hours every week and delight your clients.
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
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{
                opacity: { duration: 0.5, delay: 0.1 * i },
                y: { duration: 0.5, delay: 0.1 * i, type: "spring", stiffness: 100 },
                scale: { duration: 0.2 },
              }}
              className="group p-6 rounded-2xl bg-card border border-border hover:shadow-elevated transition-all duration-300"
            >
              <motion.div
                className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4 group-hover:bg-gradient-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm"
                whileHover={{ rotate: [0, -10, 10, -5, 5, 0] }}
                transition={{ duration: 0.5 }}
              >
                <feature.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
              </motion.div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
