"use client"

import { useParams } from "next/navigation"
import { ClientDetails } from "@/components/client/client_details"

export default function ClientDetailsPage() {
  const clientId = useParams()?.id as string
  return clientId ? <ClientDetails clientId={clientId} /> : null
}
