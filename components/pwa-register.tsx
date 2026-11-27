"use client";

import { useEffect } from "react";

/** Registers the service worker in production builds. Local development keeps no offline cache. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is optional. The app works normally without it.
    });
  }, []);
  return null;
}
