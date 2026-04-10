import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { UserPlus, FolderUp, Send, ArrowRight, CheckCircle2 } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Sign Up & Create Organization",
    description:
      "Create your account in seconds and set up your organization profile to get started.",
    details: [
      "Quick registration with email or Google",
      "Set up your organization profile & branding",
      "Invite team members to collaborate",
    ],
    color: "from-orange-400 to-amber-500",
  },
  {
    icon: FolderUp,
    step: "02",
    title: "Add Clients & Upload Documents",
    description:
      "Import your client list and upload relevant documents for easy access and management.",
    details: [
      "Bulk import clients via CSV or manually",
      "Organize documents by client & category",
      "Secure cloud storage for all files",
    ],
    color: "from-primary to-orange-500",
  },
  {
    icon: Send,
    step: "03",
    title: "Schedule & Send Emails",
    description:
      "Use pre-built or custom templates to schedule and send professional emails at scale.",
    details: [
      "Choose from ready-made email templates",
      "Schedule emails daily, weekly, or monthly",
      "Track delivery & engagement in real-time",
    ],
    color: "from-amber-500 to-primary",
  },
];

export default function HowItWorksSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [isInView]);

  return (
    <section id="how-it-works" className="py-24 bg-secondary/30 overflow-hidden">
      <div className="container mx-auto px-4" ref={ref}>
        {/* Header */}
        <div className="text-center mb-20">
          <motion.span
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            className="text-sm font-semibold text-primary uppercase tracking-wider"
          >
            How It Works
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold text-foreground mt-3"
          >
            Get started in{" "}
            <span className="text-gradient">3 simple steps</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground mt-4 max-w-lg mx-auto"
          >
            From sign-up to sending your first automated email — it only takes
            minutes.
          </motion.p>
        </div>

        {/* Timeline */}
        <div className="max-w-5xl mx-auto">
          {/* Step Selector - Horizontal Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12"
          >
            {steps.map((step, i) => (
              <button
                key={step.step}
                onClick={() => setActiveStep(i)}
                className={`group relative flex items-center gap-3 px-6 py-3 rounded-full transition-all duration-300 ${
                  activeStep === i
                    ? "bg-primary text-primary-foreground shadow-elevated"
                    : "bg-card border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <span
                  className={`text-xs font-bold ${
                    activeStep === i
                      ? "text-primary-foreground/70"
                      : "text-primary"
                  }`}
                >
                  {step.step}
                </span>
                <span className="text-sm font-semibold whitespace-nowrap">
                  {step.title}
                </span>
                {i < steps.length - 1 && (
                  <ArrowRight className="hidden sm:block w-4 h-4 text-border absolute -right-5" />
                )}
              </button>
            ))}
          </motion.div>

          {/* Active Step Content */}
          <div className="relative">
            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                initial={false}
                animate={{
                  opacity: activeStep === i ? 1 : 0,
                  y: activeStep === i ? 0 : 20,
                  scale: activeStep === i ? 1 : 0.95,
                  position: activeStep === i ? "relative" : "absolute",
                }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className={`w-full ${activeStep !== i ? "pointer-events-none top-0 left-0" : ""}`}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-card rounded-3xl border border-border p-8 md:p-12 shadow-soft">
                  {/* Left: Visual */}
                  <div className="flex flex-col items-center justify-center">
                    <div
                      className={`relative w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-elevated`}
                    >
                      <step.icon className="w-14 h-14 md:w-16 md:h-16 text-white" />
                      <div className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-background border-2 border-primary flex items-center justify-center text-sm font-bold text-primary shadow-md">
                        {step.step}
                      </div>
                    </div>

                    {/* Progress Dots */}
                    <div className="flex items-center gap-2 mt-8">
                      {steps.map((_, j) => (
                        <button
                          key={j}
                          onClick={() => setActiveStep(j)}
                          className={`rounded-full transition-all duration-300 ${
                            activeStep === j
                              ? "w-8 h-2.5 bg-primary"
                              : "w-2.5 h-2.5 bg-border hover:bg-primary/40"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Right: Details */}
                  <div className="space-y-5">
                    <h3 className="text-2xl md:text-3xl font-bold text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                    <ul className="space-y-3">
                      {step.details.map((detail, j) => (
                        <motion.li
                          key={j}
                          initial={{ opacity: 0, x: -10 }}
                          animate={
                            activeStep === i
                              ? { opacity: 1, x: 0 }
                              : { opacity: 0, x: -10 }
                          }
                          transition={{ delay: 0.1 * j + 0.2, duration: 0.3 }}
                          className="flex items-start gap-3"
                        >
                          <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                          <span className="text-sm text-foreground/80">
                            {detail}
                          </span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
