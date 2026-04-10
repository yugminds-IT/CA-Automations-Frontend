import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";

const plans = [
  {
    name: "Basic",
    price: "₹499",
    period: "/month",
    badge: "Most Popular",
    trial: "7-day Free Trial",
    description: "Perfect for individual CAs and small firms getting started.",
    buttonText: "Start Free Trial",
    popular: true,
    features: [
      "Client Onboarding System",
      "Bulk Email Scheduler",
      "5 Custom Email Templates",
      "Pre-built Templates Library",
      "Organization Login",
      "Client Document Submission",
      "Basic Dashboard",
    ],
  },
  {
    name: "Pro",
    price: "₹699",
    period: "/month",
    badge: "Coming Soon",
    description: "For growing firms that need advanced automation and analytics.",
    buttonText: "Join Waitlist",
    popular: false,
    features: [
      "Everything in Basic, plus:",
      "Unlimited Custom Templates",
      "Advanced Email Analytics",
      "Priority Email Delivery",
      "Client Portal Login",
      "Team Collaboration",
      "API Access",
    ],
  },
  {
    name: "Premium",
    price: "₹999",
    period: "/month",
    badge: "Coming Soon",
    description: "Enterprise-grade features for large organizations.",
    buttonText: "Join Waitlist",
    popular: false,
    features: [
      "Everything in Pro, plus:",
      "White-label Branding",
      "Dedicated Account Manager",
      "Custom Integrations",
      "SLA Guarantee",
      "Advanced Security",
      "Unlimited Users",
    ],
  },
];

export default function PricingSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.15 * i, duration: 0.5 }}
              className={`relative rounded-2xl p-8 flex flex-col ${
                plan.popular
                  ? "bg-foreground text-background border-2 border-foreground shadow-elevated scale-105"
                  : "bg-card border border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-primary text-primary-foreground text-xs font-semibold">
                    <Star className="w-3 h-3" /> {plan.badge}
                  </span>
                </div>
              )}
              {plan.trial && (
                <span className={`inline-flex self-start px-3 py-1 rounded-full text-xs font-semibold mb-4 ${
                  plan.popular ? "bg-background/20 text-background" : "bg-accent text-accent-foreground"
                }`}>
                  {plan.trial}
                </span>
              )}
              {!plan.trial && plan.badge === "Coming Soon" && (
                <span className="inline-flex self-start px-3 py-1 rounded-full text-xs font-semibold mb-4 bg-muted text-muted-foreground">
                  {plan.badge}
                </span>
              )}
              <h3 className={`text-xl font-bold ${plan.popular ? "text-background" : "text-foreground"}`}>
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1 mt-3">
                <span className={`text-4xl font-extrabold ${plan.popular ? "text-background" : "text-foreground"}`}>
                  {plan.price}
                </span>
                <span className={`text-sm ${plan.popular ? "text-background/60" : "text-muted-foreground"}`}>
                  {plan.period}
                </span>
              </div>
              <p className={`text-sm mt-3 mb-6 ${plan.popular ? "text-background/70" : "text-muted-foreground"}`}>
                {plan.description}
              </p>
              <Button
                className={`w-full mb-6 ${
                  plan.popular
                    ? "bg-background text-foreground hover:bg-background/90"
                    : "bg-gradient-primary text-primary-foreground"
                }`}
                size="lg"
              >
                {plan.buttonText}
              </Button>
              <ul className="space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.popular ? "text-background/60" : "text-primary"}`} />
                    <span className={plan.popular ? "text-background/80" : "text-muted-foreground"}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
