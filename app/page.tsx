/**
 * Main Page Layout - FIXED STRUCTURE
 * 
 * Layout structure:
 * - Sidebar: 15% width on desktop, top nav on mobile/tablet
 * - Content area: Adjusts margin/padding based on screen size
 * 
 * DO NOT change the margin-left (15%) or padding-top (16) values
 * as they are synchronized with the sidebar width.
 */

import { Sidebar } from "@/components/sidebar"
import { Dashboard } from "./pages/dashboard"

export default function Home() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      {/* Desktop: margin-left 15% matches sidebar width | Mobile/Tablet: padding-top 16 for top nav */}
      <div className="flex-1 lg:ml-[15%] pt-16 lg:pt-0 h-screen overflow-auto">
        <Dashboard />
      </div>
    </div>
  )
}
