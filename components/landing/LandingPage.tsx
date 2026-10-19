"use client"

import Navbar from "@/components/landing/Navbar"
import HeroSection from "@/components/landing/HeroSection"
import FeaturesSection from "@/components/landing/FeaturesSection"
import HowItWorksSection from "@/components/landing/HowItWorksSection"
import PricingSection from "@/components/landing/PricingSection"
import UseCasesSection from "@/components/landing/UseCasesSection"
import TestimonialsSection from "@/components/landing/TestimonialsSection"
import CTASection from "@/components/landing/CTASection"
import FAQSection from "@/components/landing/FAQSection"
import ContactSection from "@/components/landing/ContactSection"
import Footer from "@/components/landing/Footer"

export default function LandingPage() {
  return (
    <div className="landing-page min-h-screen">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <UseCasesSection />
      <TestimonialsSection />
      <CTASection />
      <FAQSection />
      <ContactSection />
      <Footer />
    </div>
  )
}
