"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublicPricingPlans, type PricingPlan } from "@/lib/api/pricing-plans";

/** Active plans from the backend; null while loading. Falls back to defaults if the API is down. */
export function usePricingPlans() {
  const [plans, setPlans] = useState<PricingPlan[] | null>(null);
  useEffect(() => {
    let alive = true;
    getPublicPricingPlans().then((p) => alive && setPlans(p));
    return () => {
      alive = false;
    };
  }, []);
  return plans;
}

export function PricingCard({ plan }: { plan: PricingPlan }) {
  const hi = plan.isHighlighted;
  return (
    <div
      className={`relative rounded-2xl p-8 flex flex-col h-full ${
        hi
          ? "bg-foreground text-background border-2 border-foreground shadow-2xl md:scale-105"
          : "bg-card border border-border"
      }`}
    >
      {hi && plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-semibold whitespace-nowrap">
            <Star className="w-3 h-3" /> {plan.badge}
          </span>
        </div>
      )}
      {plan.trialText ? (
        <span
          className={`inline-flex self-start px-3 py-1 rounded-full text-xs font-semibold mb-4 ${
            hi ? "bg-background/20 text-background" : "bg-accent text-accent-foreground"
          }`}
        >
          {plan.trialText}
        </span>
      ) : (
        !hi &&
        plan.badge && (
          <span className="inline-flex self-start px-3 py-1 rounded-full text-xs font-semibold mb-4 bg-muted text-muted-foreground">
            {plan.badge}
          </span>
        )
      )}
      <h3 className={`text-xl font-bold ${hi ? "text-background" : "text-foreground"}`}>{plan.name}</h3>
      <div className="flex items-baseline gap-1 mt-3">
        <span className={`text-4xl font-extrabold ${hi ? "text-background" : "text-foreground"}`}>
          {plan.price}
        </span>
        <span className={`text-sm ${hi ? "text-background/60" : "text-muted-foreground"}`}>{plan.period}</span>
      </div>
      <p className={`text-sm mt-3 mb-6 ${hi ? "text-background/70" : "text-muted-foreground"}`}>
        {plan.description}
      </p>
      <Button
        asChild
        size="lg"
        className={`w-full mb-6 ${
          hi ? "bg-background text-foreground hover:bg-background/90" : "bg-gradient-to-r from-orange-500 to-amber-500 text-white"
        }`}
      >
        <Link href={plan.buttonLink}>{plan.buttonText}</Link>
      </Button>
      <ul className="space-y-3 flex-1">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${hi ? "text-background/60" : "text-primary"}`} />
            <span className={hi ? "text-background/80" : "text-muted-foreground"}>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Pricing card grid. `plans` null renders an empty placeholder of the same height while loading. */
export default function PricingCards({
  plans,
  show = true,
  className = "",
}: {
  plans: PricingPlan[] | null;
  /** Animate cards in when true (e.g. once scrolled into view). */
  show?: boolean;
  className?: string;
}) {
  if (!plans) return <div className={`min-h-[560px] ${className}`} aria-busy="true" />;
  const cols = plans.length >= 3 ? "md:grid-cols-3" : plans.length === 2 ? "md:grid-cols-2" : "";
  return (
    <div className={`grid grid-cols-1 ${cols} gap-6 max-w-5xl mx-auto items-stretch ${className}`}>
      {plans.map((plan, i) => (
        <motion.div
          key={plan.id}
          initial={{ opacity: 0, y: 30 }}
          animate={show ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.15 * i, duration: 0.5 }}
        >
          <PricingCard plan={plan} />
        </motion.div>
      ))}
    </div>
  );
}
