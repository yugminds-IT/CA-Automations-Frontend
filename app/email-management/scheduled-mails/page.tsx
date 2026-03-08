"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { ScheduledMails } from "@/components/email-management/scheduled-mails"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getUserData, isAuthenticated } from "@/lib/api/index"

export default function ScheduledMailsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [isDesktop, setIsDesktop] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const user = getUserData()
    if (user?.role === 'client') router.replace('/uploads')
  }, [router])

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login')
      return
    }
  }, [router])

  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed')
    setSidebarCollapsed(savedState !== null ? savedState === 'true' : true)
  }, [])

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString())
  }, [sidebarCollapsed])

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden w-full">
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        collapsed={sidebarCollapsed}
      />
      <div
        className="flex flex-col flex-1 transition-all duration-300 overflow-hidden min-w-0"
        style={{
          marginLeft: isDesktop ? (sidebarCollapsed ? '60px' : '240px') : '0',
          width: isDesktop ? (sidebarCollapsed ? 'calc(100% - 60px)' : 'calc(100% - 240px)') : '100%',
        }}
      >
        <Header
          onMenuClick={() => setMobileMenuOpen(true)}
          onSidebarToggle={() => setSidebarCollapsed((v) => !v)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <div
          className="overflow-y-auto overflow-x-hidden w-full"
          style={{ height: 'calc(100vh - 54px)', marginTop: '54px' }}
        >
          <ScheduledMails />
        </div>
      </div>
    </div>
  )
}
