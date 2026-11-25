import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import PricingCards, { usePricingPlans } from "./PricingCards";

export default function PricingSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const plans = usePricingPlans();

  return (
    <section id="pricing" className="py-24 bg-background">
      <div className="container mx-auto px-4" ref={ref}>
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            className="text-sm font-semibold text-primary uppercase tracking-wider"
          >
            Pricing
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold text-foreground mt-3"
          >
            Simple, transparent <span className="text-gradient">pricing</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground mt-4 max-w-xl mx-auto"
          >
            Start free and scale as your business grows. No hidden fees.
          </motion.p>
        </div>

        <PricingCards plans={plans} show={isInView} />

        <div className="text-center mt-12">
          <a
            href="/plan"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            Looking for multi-industry presets & deep feature comparison? View Full Plans & Pricing Details →
          </a>
        </div>
      </div>
    </section>
  );
}
