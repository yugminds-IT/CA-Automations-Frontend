"use client"

import { Plus_Jakarta_Sans } from "next/font/google"
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

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-landing",
})

export default function LandingPage() {
  return (
    <div
      className={`landing-page min-h-screen ${plusJakarta.className} ${plusJakarta.variable}`}
      style={{ fontFamily: plusJakarta.style.fontFamily }}
    >
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
