import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import {
  ShoppingCart,
  Landmark,
  GraduationCap,
  HeartPulse,
  Building2,
  Plane,
  Newspaper,
  Home,
  HandHeart,
  Monitor,
} from "lucide-react";
import { InteractiveImageAccordion } from "@/components/ui/interactive-image-accordion";

const industries = [
  {
    icon: ShoppingCart,
    title: "Marketing & E-commerce",
    points: [
      "Promotions, discounts, and product launches",
      "Abandoned cart reminders",
      "Examples: Online stores, marketplaces",
    ],
    images: [
      { id: 1, title: "Product Launches", imageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=800&auto=format&fit=crop" },
      { id: 2, title: "Discount Campaigns", imageUrl: "https://images.unsplash.com/photo-1607082349566-187342175e2f?q=80&w=800&auto=format&fit=crop" },
      { id: 3, title: "Cart Reminders", imageUrl: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=800&auto=format&fit=crop" },
      { id: 4, title: "Marketplace Emails", imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop" },
    ],
  },
  {
    icon: Landmark,
    title: "Banking & Finance",
    points: [
      "Transaction alerts, statements",
      "Policy updates, fraud alerts",
      "Loan or credit card offers",
    ],
    images: [
      { id: 1, title: "Transaction Alerts", imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop" },
      { id: 2, title: "Financial Statements", imageUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=800&auto=format&fit=crop" },
      { id: 3, title: "Fraud Detection", imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f2?q=80&w=800&auto=format&fit=crop" },
      { id: 4, title: "Credit Offers", imageUrl: "https://images.unsplash.com/photo-1559526324-593bc073d938?q=80&w=800&auto=format&fit=crop" },
    ],
  },
  {
    icon: GraduationCap,
    title: "Education",
    points: [
      "Announcements to students and parents",
      "Admission campaigns",
      "Exam schedules and results",
    ],
    images: [
      { id: 1, title: "Student Announcements", imageUrl: "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?q=80&w=800&auto=format&fit=crop" },
      { id: 2, title: "Admissions", imageUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop" },
      { id: 3, title: "Exam Schedules", imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=800&auto=format&fit=crop" },
      { id: 4, title: "Results & Reports", imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800&auto=format&fit=crop" },
    ],
  },
  {
    icon: HeartPulse,
    title: "Healthcare",
    points: [
      "Appointment reminders",
      "Health tips, vaccination drives",
      "Patient follow-ups",
    ],
    images: [
      { id: 1, title: "Appointments", imageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=800&auto=format&fit=crop" },
      { id: 2, title: "Health Tips", imageUrl: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=80&w=800&auto=format&fit=crop" },
      { id: 3, title: "Vaccination Drives", imageUrl: "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?q=80&w=800&auto=format&fit=crop" },
      { id: 4, title: "Patient Follow-ups", imageUrl: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=800&auto=format&fit=crop" },
    ],
  },
  {
    icon: Building2,
    title: "Corporate / HR",
    points: [
      "Employee announcements",
      "Policy updates",
      "Payroll and attendance reports",
    ],
    images: [
      { id: 1, title: "Announcements", imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800&auto=format&fit=crop" },
      { id: 2, title: "HR Policies", imageUrl: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=800&auto=format&fit=crop" },
      { id: 3, title: "Payroll Reports", imageUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=800&auto=format&fit=crop" },
      { id: 4, title: "Attendance", imageUrl: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=800&auto=format&fit=crop" },
    ],
  },
  {
    icon: Plane,
    title: "Travel & Hospitality",
    points: [
      "Booking confirmations",
      "Offers and travel deals",
      "Itinerary updates",
    ],
    images: [
      { id: 1, title: "Booking Alerts", imageUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=800&auto=format&fit=crop" },
      { id: 2, title: "Travel Deals", imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop" },
      { id: 3, title: "Itinerary Updates", imageUrl: "https://images.unsplash.com/photo-1436491865332-7a61a109db05?q=80&w=800&auto=format&fit=crop" },
      { id: 4, title: "Hospitality", imageUrl: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=800&auto=format&fit=crop" },
    ],
  },
  {
    icon: Newspaper,
    title: "Media & Publishing",
    points: [
      "Newsletters",
      "Daily/weekly updates",
      "Subscription content",
    ],
    images: [
      { id: 1, title: "Newsletters", imageUrl: "https://images.unsplash.com/photo-1504711434969-e33886168d0c?q=80&w=800&auto=format&fit=crop" },
      { id: 2, title: "Daily Updates", imageUrl: "https://images.unsplash.com/photo-1495020689067-958852a7765e?q=80&w=800&auto=format&fit=crop" },
      { id: 3, title: "Subscriptions", imageUrl: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?q=80&w=800&auto=format&fit=crop" },
      { id: 4, title: "Publishing", imageUrl: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?q=80&w=800&auto=format&fit=crop" },
    ],
  },
  {
    icon: Home,
    title: "Real Estate",
    points: [
      "Property listings",
      "New project launches",
      "Client follow-ups",
    ],
    images: [
      { id: 1, title: "Property Listings", imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=800&auto=format&fit=crop" },
      { id: 2, title: "New Projects", imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800&auto=format&fit=crop" },
      { id: 3, title: "Client Follow-ups", imageUrl: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?q=80&w=800&auto=format&fit=crop" },
      { id: 4, title: "Open Houses", imageUrl: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=800&auto=format&fit=crop" },
    ],
  },
  {
    icon: HandHeart,
    title: "Nonprofits / NGOs",
    points: [
      "Fundraising campaigns",
      "Event invitations",
      "Awareness programs",
    ],
    images: [
      { id: 1, title: "Fundraising", imageUrl: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=800&auto=format&fit=crop" },
      { id: 2, title: "Events", imageUrl: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=800&auto=format&fit=crop" },
      { id: 3, title: "Awareness", imageUrl: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?q=80&w=800&auto=format&fit=crop" },
      { id: 4, title: "Community", imageUrl: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?q=80&w=800&auto=format&fit=crop" },
    ],
  },
  {
    icon: Monitor,
    title: "SaaS & Technology",
    points: [
      "Product updates",
      "User onboarding emails",
      "Security alerts",
    ],
    images: [
      { id: 1, title: "Product Updates", imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop" },
      { id: 2, title: "User Onboarding", imageUrl: "https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=800&auto=format&fit=crop" },
      { id: 3, title: "Security Alerts", imageUrl: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?q=80&w=800&auto=format&fit=crop" },
      { id: 4, title: "Tech Updates", imageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=800&auto=format&fit=crop" },
    ],
  },
];

export default function UseCasesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeIndustry, setActiveIndustry] = useState(0);

  return (
    <section id="use-cases" className="py-16 bg-secondary/30" ref={ref}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.span
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            className="text-sm font-semibold text-primary uppercase tracking-wider"
          >
            Use Cases
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold text-foreground mt-3"
          >
            Built for <span className="text-gradient">professionals</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground mt-4 max-w-2xl mx-auto"
          >
            From finance to healthcare, Lekvya powers email automation across every industry.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="max-w-6xl mx-auto"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 items-stretch">

            {/* Industry Tabs — internal scroll, fixed height on desktop */}
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:overflow-x-hidden pb-2 lg:pb-0 lg:pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {industries.map((industry, i) => {
                const Icon = industry.icon;
                return (
                  <button
                    key={industry.title}
                    onClick={() => setActiveIndustry(i)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left whitespace-nowrap transition-all duration-300 shrink-0 w-full ${
                      activeIndustry === i
                        ? "bg-primary text-primary-foreground shadow-elevated"
                        : "bg-card border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        activeIndustry === i ? "text-primary-foreground" : "text-primary"
                      }`}
                    />
                    <span className="text-sm font-medium">{industry.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Content Area */}
            <div className="bg-card rounded-2xl border border-border px-6 pt-4 pb-6 md:px-8 md:pt-5 md:pb-8 flex flex-col">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndustry}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col flex-1 min-h-0 gap-4"
                >
                  {(() => {
                    const industry = industries[activeIndustry];
                    return (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <industry.icon className="w-4 h-4 text-primary" />
                          </div>
                          <h3 className="text-lg font-bold text-foreground">{industry.title}</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {industry.points.map((point, j) => (
                            <motion.div
                              key={j}
                              initial={{ opacity: 0, y: 16 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 * j + 0.05, duration: 0.35, ease: "easeOut" }}
                              whileHover={{ y: -4, scale: 1.02 }}
                              className="group relative flex flex-col gap-2 p-3 rounded-xl border border-border bg-background hover:border-primary/40 hover:shadow-md transition-all duration-300 cursor-default overflow-hidden"
                            >
                              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-gradient-to-r from-orange-400 to-amber-500 opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
                              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-primary">
                                  {String(j + 1).padStart(2, "00")}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-foreground/80 leading-snug">{point}</p>
                            </motion.div>
                          ))}
                        </div>

                        {/* Image Accordion — grows to fill remaining space */}
                        <div className="flex-1 min-h-0">
                          <InteractiveImageAccordion
                            items={industry.images}
                            defaultActiveIndex={0}
                          />
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
              </AnimatePresence>
            </div>

          </div>
        </motion.div>
      </div>
    </section>
  );
}

