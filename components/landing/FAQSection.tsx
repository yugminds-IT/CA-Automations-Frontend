import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "How does the 7-day free trial work?",
    a: "Sign up and get instant access to all Basic plan features for 7 days — no credit card required. After the trial, you can upgrade to continue using the platform.",
  },
  {
    q: "Are there any email sending limits?",
    a: "The Basic plan includes generous email limits suitable for most small to mid-sized firms. Pro and Premium plans offer higher limits and priority delivery. Contact us for exact numbers.",
  },
  {
    q: "Is my data secure?",
    a: "Absolutely. We use industry-standard encryption (AES-256) for data at rest and TLS for data in transit. Your client data is stored securely and never shared with third parties.",
  },
  {
    q: "Can I import my existing client list?",
    a: "Yes! You can import clients via CSV upload or add them manually. Our onboarding wizard guides you through the entire process.",
  },
  {
    q: "When will Pro and Premium plans be available?",
    a: "We're working hard to launch Pro and Premium plans soon. Join the waitlist to get early access and exclusive pricing.",
  },
  {
    q: "Do you offer custom integrations?",
    a: "Custom integrations are available on the Premium plan. For specific requirements, reach out to our team and we'll find the best solution for you.",
  },
];

export default function FAQSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeItem, setActiveItem] = useState<string | undefined>(undefined);

  return (
    <section id="faq" className="py-24 bg-secondary/50">
      <div className="container mx-auto px-4 max-w-3xl" ref={ref}>
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            className="text-sm font-semibold text-primary uppercase tracking-wider"
          >
            FAQ
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold text-foreground mt-3"
          >
            Frequently asked <span className="text-gradient">questions</span>
          </motion.h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
        >
          <Accordion 
            type="single" 
            collapsible 
            className="space-y-3"
            value={activeItem}
            onValueChange={setActiveItem}
            onMouseLeave={() => setActiveItem(undefined)}
          >
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="bg-card border border-border rounded-xl px-6 transition-all"
                onMouseEnter={() => setActiveItem(`faq-${i}`)}
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
