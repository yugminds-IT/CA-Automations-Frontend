import React from "react";

interface JsonLdProps {
  data: Record<string, any> | Record<string, any>[];
}

/**
 * Reusable JSON-LD structured data component for SEO and AI Engine Optimization (AEO/GEO).
 * Injects Google & Schema.org compliant structured data into the HTML head.
 */
export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
