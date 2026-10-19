"use client";

import { useState, useEffect } from "react";
import {
  Code2,
  Copy,
  Check,
  Terminal,
  FileCode,
  Globe,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { getApiKeys, ApiKeyItem } from "@/lib/api/developer";

export default function QuickstartPage() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("pk_live_your_public_key");
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getApiKeys();
        setKeys(data);
        const firstPublic = data.find((k) => k.keyType === "public");
        if (firstPublic && firstPublic.publicKey) {
          setSelectedKey(firstPublic.publicKey);
        }
      } catch {
        /* fallback */
      }
    }
    load();
  }, []);

  const handleCopy = (code: string, tab: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTab(tab);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const originUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

  // Code Snippets
  const htmlSnippet = `<!-- 
  Embeddable Contact Form with Custom Fields & Anti-Spam
  Action points to your API with Public Key
-->
<form action="${originUrl}/api/v1/send-form" method="POST">
  <!-- Your Organization Public Key -->
  <input type="hidden" name="publicKey" value="${selectedKey}" />
  <input type="hidden" name="formName" value="Website Main Contact" />

  <!-- Standard Contact Fields -->
  <label for="name">Your Name</label>
  <input type="text" id="name" name="name" required placeholder="John Doe" />

  <label for="email">Your Email</label>
  <input type="email" id="email" name="email" required placeholder="john@example.com" />

  <label for="phone">Phone Number</label>
  <input type="tel" id="phone" name="phone" placeholder="+1 (555) 000-0000" />

  <!-- CUSTOM FIELDS (Add any custom inputs you need — all are automatically captured & emailed!) -->
  <label for="company">Company / Organization</label>
  <input type="text" id="company" name="company" placeholder="Acme Inc." />

  <label for="budget">Project Budget</label>
  <input type="text" id="budget" name="budget" placeholder="$5,000 - $10,000" />

  <label for="timeline">Timeline</label>
  <input type="text" id="timeline" name="timeline" placeholder="1-2 months" />

  <label for="message">Message</label>
  <textarea id="message" name="message" required placeholder="Tell us about your project..."></textarea>

  <!-- Optional: Override notification destination for this form -->
  <!-- <input type="hidden" name="notificationEmail" value="leads@yourdomain.com" /> -->

  <!-- Anti-spam Honeypot (hidden from human visitors, traps spam bots) -->
  <input type="text" name="_honey" style="display:none;" tabindex="-1" autocomplete="off" />

  <button type="submit">Send Message</button>
</form>`;

  const reactSnippet = `// React / Next.js Client-Side Form with Custom Data
import { useState } from 'react';

export function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    // Automatically extracts all inputs including custom fields!
    const formValues = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('${originUrl}/api/v1/send-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: '${selectedKey}',
          formName: 'Request a Quote',
          ...formValues, // Sends name, email, phone, message + all custom fields (company, budget, etc.)
        }),
      });

      if (!res.ok) throw new Error('Submission failed');
      setSubmitted(true);
    } catch (err) {
      alert('Error sending message');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) return <p className="text-emerald-600 font-medium">Thank you! Your inquiry has been received.</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <input type="text" name="name" required placeholder="Your Name" className="w-full border p-2 rounded" />
      <input type="email" name="email" required placeholder="Your Email" className="w-full border p-2 rounded" />
      <input type="text" name="phone" placeholder="Phone Number" className="w-full border p-2 rounded" />
      
      {/* ANY CUSTOM FIELDS YOU NEED: */}
      <input type="text" name="company" placeholder="Company Name" className="w-full border p-2 rounded" />
      <input type="text" name="budget" placeholder="Budget (e.g. $10,000)" className="w-full border p-2 rounded" />
      <input type="text" name="serviceType" placeholder="Service Required" className="w-full border p-2 rounded" />
      
      <textarea name="message" required placeholder="Project details..." className="w-full border p-2 rounded" />
      <input type="text" name="_honey" style={{ display: 'none' }} tabIndex={-1} />
      
      <button type="submit" disabled={loading} className="w-full bg-black text-white p-2 rounded font-medium">
        {loading ? 'Sending...' : 'Submit Inquiry'}
      </button>
    </form>
  );
}`;

  const curlSnippet = `# Send Form Submission with Custom Fields via cURL
curl -X POST "${originUrl}/api/v1/send-form" \\
  -H "Content-Type: application/json" \\
  -d '{
    "publicKey": "${selectedKey}",
    "formName": "Website Quote Form",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+1 (555) 019-2834",
    "message": "Interested in custom enterprise automation.",
    "company": "Acme Global Solutions",
    "budget": "$15,000",
    "timeline": "3 weeks",
    "serviceRequested": "Full-Stack Development"
  }'

# -------------------------------------------------------------
# Or Send Resend-Style Transactional Email (Server-to-Server)
curl -X POST "${originUrl}/api/v1/emails" \\
  -H "Authorization: Bearer sk_live_your_secret_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "Acme Notifications <notices@mysite.com>",
    "to": "client@example.com",
    "subject": "Invoice #1042 Payment Confirmation",
    "html": "<h2>Payment Received</h2><p>Thank you for your business!</p>"
  }'`;

  const nodeSnippet = `// Node.js Backend API Request
async function sendTransactionalEmail() {
  const response = await fetch('${originUrl}/api/v1/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer sk_live_your_secret_key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Acme Notifications <notifications@mysite.com>',
      to: ['user@example.com'],
      subject: 'Welcome to our platform!',
      html: '<h1>Welcome!</h1><p>Your account is ready.</p>',
    }),
  });

  const result = await response.json();
  console.log('Email dispatched, Message ID:', result.id);
}

sendTransactionalEmail();`;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b pb-5">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Code2 className="w-6 h-6 text-orange-500" /> Developer Quickstart &amp; Code Generator
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Copy-paste ready code to integrate website contact forms or send transactional emails from your backend.
        </p>
      </div>

      {/* Public Key Picker */}


      {/* Code Snippets Tabs */}
      <Tabs defaultValue="html" className="w-full">
        <TabsList className="grid grid-cols-4 max-w-md">
          <TabsTrigger value="html" className="text-xs">HTML &lt;form&gt;</TabsTrigger>
          <TabsTrigger value="react" className="text-xs">React / Next.js</TabsTrigger>
          <TabsTrigger value="curl" className="text-xs">cURL (API)</TabsTrigger>
          <TabsTrigger value="node" className="text-xs">Node.js</TabsTrigger>
        </TabsList>

        {/* HTML Form */}
        <TabsContent value="html" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-orange-500" /> Ready-to-Paste HTML Contact Form
                </CardTitle>
                <CardDescription className="text-xs">
                  Copy and paste directly into any static HTML, WordPress, Webflow, or Shopify page.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(htmlSnippet, "html")}
                className="text-xs"
              >
                {copiedTab === "html" ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copiedTab === "html" ? "Copied" : "Copy Code"}
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-slate-950 text-slate-100 rounded-lg text-xs font-mono overflow-auto max-h-[420px] leading-relaxed border border-slate-800">
                {htmlSnippet}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        {/* React / Next.js */}
        <TabsContent value="react" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-500" /> React / Next.js Component Snippet
                </CardTitle>
                <CardDescription className="text-xs">
                  Async JSON submit using fetch with loading and success states.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(reactSnippet, "react")}
                className="text-xs"
              >
                {copiedTab === "react" ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copiedTab === "react" ? "Copied" : "Copy Code"}
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-slate-950 text-slate-100 rounded-lg text-xs font-mono overflow-auto max-h-[420px] leading-relaxed border border-slate-800">
                {reactSnippet}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        {/* cURL */}
        <TabsContent value="curl" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-500" /> Transactional cURL Command
                </CardTitle>
                <CardDescription className="text-xs">
                  Send emails programmatically from your command line or CI/CD runner.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(curlSnippet, "curl")}
                className="text-xs"
              >
                {copiedTab === "curl" ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copiedTab === "curl" ? "Copied" : "Copy Code"}
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-slate-950 text-slate-100 rounded-lg text-xs font-mono overflow-auto max-h-[420px] leading-relaxed border border-slate-800">
                {curlSnippet}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Node.js */}
        <TabsContent value="node" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-indigo-500" /> Node.js Backend API Example
                </CardTitle>
                <CardDescription className="text-xs">
                  Server-side invocation for Express, NestJS, Fastify, or Lambda.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(nodeSnippet, "node")}
                className="text-xs"
              >
                {copiedTab === "node" ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copiedTab === "node" ? "Copied" : "Copy Code"}
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-slate-950 text-slate-100 rounded-lg text-xs font-mono overflow-auto max-h-[420px] leading-relaxed border border-slate-800">
                {nodeSnippet}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
