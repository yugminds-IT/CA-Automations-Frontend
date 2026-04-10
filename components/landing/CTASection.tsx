"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const router = useRouter();
  const goToContact = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative max-w-4xl mx-auto rounded-3xl bg-gradient-primary p-12 md:p-16 text-center overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_60%)]" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Ready to automate your workflow?
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
              Join hundreds of professionals who save 10+ hours every week with Lekvya AI Automation.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="bg-background text-foreground hover:bg-background/90 gap-2 text-base px-8 h-12" onClick={() => router.push("/login")}>
                Start Free Trial <ArrowRight className="w-4 h-4" />
              </Button>
              <Button size="lg" className="bg-background text-foreground hover:bg-background/90 border-0 text-base px-8 h-12" onClick={goToContact}>
                Book a Demo
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
