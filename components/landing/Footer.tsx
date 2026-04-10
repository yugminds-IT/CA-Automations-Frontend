import { Mail, Phone, MapPin } from "lucide-react";

const LOGO_SRC = "/landing-assets/lekvya-logo-new.png";

export default function Footer() {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <img src={LOGO_SRC} alt="Lekvya" className="h-14 w-auto object-contain mb-6" style={{ mixBlendMode: 'screen' }} />
            <p className="text-background/60 text-sm leading-relaxed max-w-md">
              Automate your client communication and onboarding with AI-powered
              workflows. Built for CAs, financial firms, and marketing teams.
            </p>
            <div className="flex gap-4 mt-6">
              <a href="#" className="w-9 h-9 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors text-background/60 hover:text-background text-sm">in</a>
              <a href="#" className="w-9 h-9 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors text-background/60 hover:text-background text-sm">𝕏</a>
              <a href="#" className="w-9 h-9 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors text-background/60 hover:text-background text-sm">fb</a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-background mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-background/60">
              <li><a href="#features" className="hover:text-background transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-background transition-colors">Pricing</a></li>
              <li><a href="#use-cases" className="hover:text-background transition-colors">Use Cases</a></li>
              <li><a href="#faq" className="hover:text-background transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-background mb-4">Contact</h4>
            <ul className="space-y-3 text-sm text-background/60">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" /> contact@navedhana.com
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" /> +91 98765 43210
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5" /> India
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-background/40">
            © 2025 Lekvya AI Automation. All rights reserved.
          </p>
          <p className="text-xs text-background/40">
            Built by <a href="https://www.yugminds.org/" target="_blank" rel="noopener noreferrer" className="text-background/60 hover:text-background transition-colors">Yugminds</a> × <a href="https://navedhana.com" target="_blank" rel="noopener noreferrer" className="text-background/60 hover:text-background transition-colors">Navedhana Software Services</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
