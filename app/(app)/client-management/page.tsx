"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ClientManagement } from "@/components/pages/client_management"
import { getClientStatusEnum } from "@/lib/api/clients"
import { listBusinessTypes } from "@/lib/api/business-types"
import { listServices } from "@/lib/api/services"
import { ApiError } from "@/lib/api/index"

type Named = { id: number; name: string }

const withTimeout = <T,>(promise: Promise<T>, ms = 10000) =>
  Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Request timeout")), ms))])

export default function ClientManagementPage() {
  const router = useRouter()
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [businessTypes, setBusinessTypes] = useState<Named[]>([])
  const [services, setServices] = useState<Named[]>([])

  // Dropdown options for the client forms. The page renders right away; options fill in when loaded.
  useEffect(() => {
    let alive = true
    Promise.all([withTimeout(getClientStatusEnum()), withTimeout(listBusinessTypes()), withTimeout(listServices())])
      .then(([status, types, svcs]) => {
        if (!alive) return
        setStatusOptions(status.values || [])
        setBusinessTypes(Array.isArray(types) ? types : [])
        setServices(Array.isArray(svcs) ? svcs : [])
      })
      .catch((error) => {
        console.error("Error fetching client form options:", error)
        if (alive && error instanceof ApiError && error.status === 401) router.replace("/login")
      })
    return () => {
      alive = false
    }
  }, [router])

  return (
    <ClientManagement
      statusOptions={statusOptions}
      businessTypes={businessTypes.map((t) => t.name)}
      businessTypesWithIds={businessTypes}
      services={services.map((s) => s.name)}
      servicesWithIds={services}
    />
  )
}
