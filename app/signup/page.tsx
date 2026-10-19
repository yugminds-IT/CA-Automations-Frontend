"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  Globe,
  ShoppingCart,
  HeartPulse,
  Rocket,
  Calculator,
  Mail,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Lock,
  Building,
  User,
  Phone,
  Eye,
  EyeOff,
  Sparkles,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { signupOrganization } from "@/lib/api/auth";
import { getPublicWorkspaceFeatures } from "@/lib/api/workspace-features";

const ICON_LOOKUP: Record<string, React.ElementType> = {
  Globe,
  GraduationCap,
  ShoppingCart,
  HeartPulse,
  Rocket,
  Calculator,
  Mail,
  Sparkles,
};

interface IndustryOption {
  key: string;
  name: string;
  badge: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  colSpan?: string;
  priority?: number;
  isLocked?: boolean;
  lockReason?: string | null;
}

const INDUSTRIES: IndustryOption[] = [
  {
    key: "school",
    name: "Educational Institutes",
    badge: "Campuses & Unis",
    description: "Student notices, fee alerts & internal circulars for faculty, lecturers & HODs.",
    icon: GraduationCap,
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    key: "website_developer",
    name: "Websites & Developers",
    badge: "API & Webhooks",
    description: "Embeddable contact forms, CORS domain whitelist & transactional email API.",
    icon: Globe,
    gradient: "from-orange-500 to-amber-500",
  },
  {
    key: "ecommerce",
    name: "E-Commerce & Retail",
    badge: "High Conversion",
    description: "Order confirmations, shipment tracking updates & abandoned cart email drips.",
    icon: ShoppingCart,
    gradient: "from-amber-500 to-orange-600",
  },
  {
    key: "healthcare",
    name: "Healthcare & Clinics",
    badge: "HIPAA-Friendly",
    description: "Patient appointment reminders, lab reports & doctor follow-up communications.",
    icon: HeartPulse,
    gradient: "from-rose-500 to-pink-600",
  },
  {
    key: "saas",
    name: "SaaS & Tech Startups",
    badge: "Developer First",
    description: "Product onboarding drips, magic login alerts & automated subscription notices.",
    icon: Rocket,
    gradient: "from-violet-500 to-purple-600",
  },
  {
    key: "financial_services",
    name: "CA & Financial Firms",
    badge: "Compliance Ready",
    description: "TDS challans, tax filing deadlines, GST reconciliation & document collection.",
    icon: Calculator,
    gradient: "from-teal-500 to-emerald-600",
  },
  {
    key: "custom",
    name: "Universal Business",
    badge: "All Industries",
    description: "Full-suite email automations, contact book management, scheduled broadcasts & custom templates for any enterprise.",
    icon: Mail,
    gradient: "from-slate-700 to-slate-900",
    colSpan: "lg:col-span-2",
  },
];

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="relative rounded-xl border border-slate-200 bg-slate-50/60 shadow-2xs transition-all duration-200 focus-within:border-orange-400 focus-within:bg-white focus-within:ring-3 focus-within:ring-orange-500/10 hover:border-slate-300">
    {children}
  </div>
);

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedIndustry, setSelectedIndustry] = useState<string>("website_developer");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [industryCards, setIndustryCards] = useState<IndustryOption[]>(INDUSTRIES);

  useEffect(() => {
    async function loadCards() {
      try {
        const data = await getPublicWorkspaceFeatures();
        if (data && data.length > 0) {
          const mapped: IndustryOption[] = data.map((d) => ({
            key: d.key,
            name: d.name,
            badge: d.badge,
            description: d.description,
            icon: ICON_LOOKUP[d.icon] || Mail,
            gradient: d.gradient || "from-orange-500 to-amber-500",
            colSpan: d.colSpan || undefined,
            priority: d.priority,
            isLocked: d.isLocked,
            lockReason: d.lockReason,
          }));
          mapped.sort((a, b) => (a.priority || 0) - (b.priority || 0));
          setIndustryCards(mapped);

          // Default to first unlocked workflow
          const firstUnlocked = mapped.find((m) => !m.isLocked);
          if (firstUnlocked) {
            setSelectedIndustry(firstUnlocked.key);
          }
        }
      } catch {
        /* fallback to default INDUSTRIES */
      }
    }
    loadCards();
  }, []);

  // Form Fields
  const [orgName, setOrgName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [allowedDomain, setAllowedDomain] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const handleSelectIndustry = (item: IndustryOption) => {
    if (item.isLocked) {
      toast({
        title: "Feature Locked",
        description:
          item.lockReason ||
          `The "${item.name}" workflow is currently locked by platform administration. Please choose another active workflow.`,
        variant: "destructive",
      });
      return;
    }
    setSelectedIndustry(item.key);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !adminName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (adminPassword.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const allowedOrigins = allowedDomain.trim() ? [allowedDomain.trim()] : [];

      await signupOrganization({
        organization: {
          name: orgName.trim(),
          industry: selectedIndustry,
          allowedOrigins,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
        },
        admin: {
          name: adminName.trim(),
          email: adminEmail.trim().toLowerCase(),
          password: adminPassword,
          phone: adminPhone.trim() || undefined,
        },
      });

      toast({
        title: "Workspace Created!",
        description: "Your workspace has been provisioned with starter templates and API keys. You can now log in.",
        variant: "success",
      });

      router.push("/login");
    } catch (err: any) {
      toast({
        title: "Signup Failed",
        description: err?.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentIndustryObj =
    industryCards.find((i) => i.key === selectedIndustry) ||
    industryCards[0] ||
    INDUSTRIES[0];

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col justify-between">
      {/* Ambient background blur elements matching login */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-orange-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[45%] h-[45%] rounded-full bg-amber-500/10 blur-[140px] pointer-events-none" />

      {/* Header bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-white/85 backdrop-blur-md border-b border-border/80">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            router.push("/");
          }}
          className="flex items-center"
        >
          <img
            src="/landing-assets/lekvya-logo-new.png"
            alt="Lekvya"
            className="h-9 w-auto object-contain"
          />
        </a>

        <div className="flex items-center gap-1 bg-secondary rounded-xl p-0.5">
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-all duration-200"
          >
            Sign In
          </button>
          <button
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white text-orange-600 shadow-2xs transition-all duration-200"
          >
            Create Account
          </button>
        </div>

        <button
          onClick={() => router.push("/")}
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          ← Back to home
        </button>
      </header>

      {/* Main Content Area - Naturally Proportioned */}
      <main className="pt-24 pb-8 px-4 sm:px-6 lg:px-8 relative z-10 max-w-7xl mx-auto w-full flex-1 flex flex-col">
        {/* Header Title Section */}
        <div className="text-center mb-5">

          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 leading-tight">
            Create your{" "}
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent font-bold">
              Lekvya Workspace
            </span>
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 max-w-xl mx-auto">
            {step === 1
              ? "Select an industry to preconfigure automated workflows, email templates & API defaults."
              : `Configure credentials and company details for your ${currentIndustryObj.name} workspace.`}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 transition-all cursor-pointer ${step === 1 ? "text-orange-600 font-semibold" : "text-slate-500 hover:text-slate-800"
              }`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 1
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs ring-4 ring-orange-500/15"
                : "bg-orange-100 text-orange-700 font-bold"
                }`}
            >
              1
            </span>
            <span className="text-sm">Select Industry</span>
          </button>

          <div
            className={`w-12 h-[2px] rounded-full transition-colors ${step === 2 ? "bg-orange-400" : "bg-slate-200"
              }`}
          />

          <div
            className={`flex items-center gap-2 transition-all ${step === 2 ? "text-orange-600 font-semibold" : "text-slate-400"
              }`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === 2
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs ring-4 ring-orange-500/15"
                : "bg-slate-100 text-slate-400 border border-slate-200"
                }`}
            >
              2
            </span>
            <span className="text-sm">Workspace Details</span>
          </div>
        </div>

        {/* Step 1: Industry Selection Grid (4-Column Layout, Balanced & Spacious) */}
        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-element">
            {industryCards.map((ind) => {
              const Icon = ind.icon;
              const isSelected = selectedIndustry === ind.key;
              const isLocked = !!ind.isLocked;

              return (
                <div
                  key={ind.key}
                  onClick={() => handleSelectIndustry(ind)}
                  className={`group relative border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 min-h-[170px] ${ind.colSpan || ""
                    } ${isLocked
                      ? "bg-slate-50/70 border-slate-200/90 opacity-85 hover:border-slate-300 cursor-not-allowed"
                      : isSelected
                        ? "cursor-pointer border-orange-500 ring-2 ring-orange-500/25 bg-orange-50/20 shadow-[0_12px_28px_-6px_rgba(249,115,22,0.18)] hover:-translate-y-1"
                        : "cursor-pointer bg-white border-slate-200/80 shadow-xs hover:border-orange-300 hover:shadow-[0_12px_28px_-6px_rgba(249,115,22,0.10)] hover:-translate-y-1"
                    }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${isLocked ? "from-slate-400 to-slate-500" : ind.gradient
                          } flex items-center justify-center text-white shadow-xs shrink-0`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      {isLocked ? (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 flex items-center gap-1 shadow-2xs">
                          <Lock className="w-2.5 h-2.5 text-rose-600" />
                          Locked
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60">
                          {ind.badge}
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-slate-900 text-[15px] mb-1 flex items-center justify-between">
                      <span className={isLocked ? "text-slate-700" : ""}>{ind.name}</span>
                      {isSelected && !isLocked && (
                        <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0 ml-1.5" />
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {isLocked && ind.lockReason ? ind.lockReason : ind.description}
                    </p>
                  </div>

                  {isLocked ? (
                    <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between text-xs font-medium text-slate-400">
                      <span className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                        <Lock className="w-3 h-3 text-slate-400" /> Locked by Admin
                      </span>
                      <span className="text-[10px] font-semibold text-rose-600 bg-rose-50/80 px-2 py-0.5 rounded-md">
                        Unavailable
                      </span>
                    </div>
                  ) : (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-orange-500 group-hover:text-orange-600 transition-colors">
                      <span>Choose this workflow</span>
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Step 2: Workspace & Account Form (Clean 2-Column Form Card) */}
        {step === 2 && (
          <div className="max-w-4xl mx-auto w-full animate-element my-auto">
            <div className="bg-white border border-slate-100 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.06),0_0_20px_rgba(0,0,0,0.02)] rounded-[32px] p-6 sm:p-9 relative overflow-hidden">
              {/* Selected Workflow Banner */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-orange-50/60 border border-orange-200/60 mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentIndustryObj.gradient} flex items-center justify-center text-white shadow-2xs shrink-0`}
                  >
                    <currentIndustryObj.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-orange-600 block leading-tight">
                      Selected Industry
                    </span>
                    <span className="text-sm font-bold text-slate-900">{currentIndustryObj.name}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 bg-white px-3 py-1.5 rounded-xl border border-orange-200 shadow-2xs hover:bg-orange-50/50 transition-colors cursor-pointer"
                >
                  Change Industry
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 2-Column Grid for Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {/* Left Column: Organization Details */}
                  <div className="space-y-3.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Company & Domain
                    </p>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        {selectedIndustry === "school"
                          ? "Institute / College Name *"
                          : selectedIndustry === "website_developer"
                            ? "Website / Agency Name *"
                            : "Organization / Company Name *"}
                      </label>
                      <GlassInputWrapper>
                        <div className="flex items-center pl-3.5">
                          <Building className="w-4 h-4 text-slate-400 shrink-0" />
                          <input
                            required
                            type="text"
                            placeholder={
                              selectedIndustry === "school"
                                ? "Apex Institute of Technology"
                                : selectedIndustry === "website_developer"
                                  ? "Acme Web Studio"
                                  : "NewAge & Co."
                            }
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 p-3 pl-2.5 rounded-xl focus:outline-none"
                          />
                        </div>
                      </GlassInputWrapper>
                    </div>

                    {selectedIndustry === "website_developer" ? (
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                          Website Domain
                        </label>
                        <GlassInputWrapper>
                          <div className="flex items-center pl-3.5">
                            <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                            <input
                              type="text"
                              placeholder="e.g. https://mywebsite.com "
                              value={allowedDomain}
                              onChange={(e) => setAllowedDomain(e.target.value)}
                              className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 p-3 pl-2.5 rounded-xl focus:outline-none"
                            />
                          </div>
                        </GlassInputWrapper>
                        <p className="text-[11px] text-slate-400 mt-1 pl-1">
                          Contact forms via Public API key will only accept requests from this origin.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                            City (Optional)
                          </label>
                          <GlassInputWrapper>
                            <div className="flex items-center pl-3.5">
                              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                              <input
                                type="text"
                                placeholder="Hyderabad"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 p-3 pl-2.5 rounded-xl focus:outline-none"
                              />
                            </div>
                          </GlassInputWrapper>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                            State (Optional)
                          </label>
                          <GlassInputWrapper>
                            <input
                              type="text"
                              placeholder="Telangana"
                              value={state}
                              onChange={(e) => setState(e.target.value)}
                              className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 p-3 px-3.5 rounded-xl focus:outline-none"
                            />
                          </GlassInputWrapper>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Administrator Account */}
                  <div className="space-y-3.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Administrator Access
                    </p>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Full Name *
                      </label>
                      <GlassInputWrapper>
                        <div className="flex items-center pl-3.5">
                          <User className="w-4 h-4 text-slate-400 shrink-0" />
                          <input
                            required
                            type="text"
                            placeholder="John Doe"
                            value={adminName}
                            onChange={(e) => setAdminName(e.target.value)}
                            className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 p-3 pl-2.5 rounded-xl focus:outline-none"
                          />
                        </div>
                      </GlassInputWrapper>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                          Email Address *
                        </label>
                        <GlassInputWrapper>
                          <div className="flex items-center pl-3.5">
                            <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                            <input
                              required
                              type="email"
                              placeholder="admin@domain.com"
                              value={adminEmail}
                              onChange={(e) => setAdminEmail(e.target.value)}
                              className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 p-3 pl-2.5 rounded-xl focus:outline-none"
                            />
                          </div>
                        </GlassInputWrapper>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                          Phone (Optional)
                        </label>
                        <GlassInputWrapper>
                          <div className="flex items-center pl-3.5">
                            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                            <input
                              type="tel"
                              placeholder="+91 98765 43210"
                              value={adminPhone}
                              onChange={(e) => setAdminPhone(e.target.value)}
                              className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 p-3 pl-2.5 rounded-xl focus:outline-none"
                            />
                          </div>
                        </GlassInputWrapper>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Password (min 6 chars) *
                      </label>
                      <GlassInputWrapper>
                        <div className="flex items-center pl-3.5 relative">
                          <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                          <input
                            required
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 p-3 pl-2.5 pr-10 rounded-xl focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 text-slate-400 hover:text-orange-500 transition-colors cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </GlassInputWrapper>
                    </div>
                  </div>
                </div>

                {/* Bottom Bar: Terms + Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                    <input
                      type="checkbox"
                      required
                      className="rounded border-slate-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
                    />
                    <span>
                      I agree to the{" "}
                      <span className="text-orange-600 font-semibold hover:underline">Terms</span> &amp;{" "}
                      <span className="text-orange-600 font-semibold hover:underline">Privacy Policy</span>.
                    </span>
                  </label>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 sm:flex-initial px-7 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 font-bold text-white shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 text-xs disabled:opacity-60 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Creating Workspace…</span>
                        </>
                      ) : (
                        <>
                          <span>Create My Workspace</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Footer Link */}
        <div className="text-center mt-6 text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-orange-500 hover:text-orange-600 hover:underline">
            Sign In
          </Link>
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-slate-400 border-t border-border/80 bg-white/40">
        © {new Date().getFullYear()} Lekvya Automations. All rights reserved.
      </footer>
    </div>
  );
}
