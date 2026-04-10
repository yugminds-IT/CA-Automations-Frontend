import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { StaggerTestimonials } from "@/components/ui/stagger-testimonials";

export default function TestimonialsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4" ref={ref}>
        <div className="text-center mb-16 relative z-20">
          <motion.span
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            className="text-sm font-semibold text-primary uppercase tracking-wider"
          >
            Testimonials
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold text-foreground mt-3"
          >
            Loved by <span className="text-gradient">professionals</span>
          </motion.h2>
        </div>

        <motion.div
           initial={{ opacity: 0, y: 40 }}
           animate={isInView ? { opacity: 1, y: 0 } : {}}
           transition={{ delay: 0.2, duration: 0.6 }}
        >
          <StaggerTestimonials />
        </motion.div>
      </div>
    </section>
  );
}
