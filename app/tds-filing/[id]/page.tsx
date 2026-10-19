'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TdsSessionRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/client-management') }, [router])
  return null
}
