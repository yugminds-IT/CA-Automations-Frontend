"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Play, Zap } from "lucide-react";

const DASHBOARD_IMG = "/landing-assets/dashboard-screenshot.png";
const POINTS = ["7-day free trial", "No credit card needed", "Set up in minutes"];

/** Static hero: headline + CTAs on the left, product screenshot on the right. */
export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-orange-50/70 to-background pt-28 pb-16 md:pt-36 md:pb-24">
      <div className="container mx-auto grid max-w-7xl items-center gap-12 px-4 lg:grid-cols-[1fr_1.1fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-6"
        >
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-4 py-1.5 text-sm font-semibold text-orange-600">
            <Zap className="h-4 w-4 fill-orange-500 stroke-none" /> Now with 7-day Free Trial
          </span>

          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Automate your client <span className="text-orange-500">communication</span>
          </h1>

          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            AI-powered workflows for CAs, financial firms, and marketing teams. Save hours every week with smart email
            scheduling, client management, and document handling.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 text-base font-semibold text-white shadow-md transition-colors hover:bg-orange-600"
            >
              Start Free Trial <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#contact"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background px-7 text-base font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <Play className="h-5 w-5" /> Book a Demo
            </a>
          </div>

          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {p}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative"
        >
          <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-orange-200/30 blur-3xl" aria-hidden />
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <img src={DASHBOARD_IMG} alt="Lekvya dashboard" className="w-full object-cover object-left-top" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
