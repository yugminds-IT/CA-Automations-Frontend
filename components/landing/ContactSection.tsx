"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { submitContact, ApiError } from "@/lib/api/index";
import { useToast } from "@/components/ui/use-toast";

export default function ContactSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const firstName = String(fd.get("first-name") ?? "").trim();
    const lastName = String(fd.get("last-name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const company = String(fd.get("company") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();

    if (!firstName || !lastName || !email || !message) {
      toast({
        title: "Missing fields",
        description: "Please fill in your name, email, and message.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitContact({
        firstName,
        lastName,
        email,
        company: company || undefined,
        message,
      });
      toast({
        title: "Message sent",
        description: res.message,
        variant: "success",
      });
      form.reset();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.detail
          : err instanceof Error
            ? err.message
            : "Could not send your message. Please try again.";
      toast({
        title: "Could not send",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-24 bg-background">
      <div className="container mx-auto px-4" ref={ref}>
        <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={isInView ? { opacity: 1, y: 0 } : {}}
           transition={{ duration: 0.6 }}
           className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Get in Touch
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Ready to automate your smart client interactions? Reach out to our team to request a personalized demo or ask any questions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Contact Information */}
            <div className="flex flex-col gap-8">
              <div className="bg-card rounded-2xl p-8 border hover:border-primary/50 transition-colors">
                <h3 className="text-xl font-semibold mb-6">Contact Information</h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <Mail className="w-6 h-6 text-primary mt-1" />
                    <div>
                      <p className="font-medium">Email Us</p>
                      <p className="text-muted-foreground">contact@navedhana.com</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Phone className="w-6 h-6 text-primary mt-1" />
                    <div>
                      <p className="font-medium">Call Us</p>
                      <p className="text-muted-foreground">+91 8885026092</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <MapPin className="w-6 h-6 text-primary mt-1" />
                    <div>
                      <p className="font-medium">Visit Us</p>
                      <p className="text-muted-foreground">
                        Shyamlal Buildings,Begumpet,<br />
                         Hyderabad,Telangana,India
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-card rounded-2xl p-8 border">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First name</Label>
                    <Input id="first-name" name="first-name" placeholder="John" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Last name</Label>
                    <Input id="last-name" name="last-name" placeholder="Doe" required />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="john@company.com" required />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" name="company" placeholder="Acme Inc." />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea 
                    id="message" 
                    name="message"
                    placeholder="Tell us about your automation needs..." 
                    className="min-h-[120px]" 
                    required
                  />
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full gap-2 h-12 text-base">
                  {isSubmitting ? "Sending…" : "Send Message"} <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
