// Pure mapping between the API client shape and the client list/form shapes.
// Kept free of React so it can be unit-tested (see client-transforms.test.ts).

import type {
  Client as ApiClient,
  OnboardClientRequest,
  UpdateClientRequest,
  Service,
} from '@/lib/api/types'

export interface ClientDirector {
  name: string
  email?: string
  phone?: string
  designation?: string
  din?: string
  pan?: string
  aadhar?: string
}

export interface Client {
  id: string | number
  name: string
  email: string
  phone: string | null
  companyName: string
  directories: string[] | string
  followUpDate: string | Date | null
  onboardDate: string | Date | null
  lastContactedDate: string | Date | null
  status?: string
  // Additional fields for full client data
  panNumber?: string
  gstNumber?: string
  businessType?: string
  address?: string
  city?: string
  state?: string
  country?: string
  pincode?: string
  notes?: string
  tags?: string[]
  directors?: ClientDirector[]
}

export type NewClient = Omit<Client, 'id' | 'lastContactedDate'>

// Filter clients by search query and status (client-side; backend only supports organizationId)
export function filterClients(clientsList: Client[], query: string, status: string): Client[] {
  let filtered = clientsList
  if (status !== 'all') {
    filtered = filtered.filter((c) => (c.status ?? '').toLowerCase() === status.toLowerCase())
  }
  if (query.trim()) {
    const lowerQuery = query.toLowerCase()
    filtered = filtered.filter(
      (c) =>
        (c.name ?? '').toLowerCase().includes(lowerQuery) ||
        (c.email ?? '').toLowerCase().includes(lowerQuery) ||
        (c.phone ?? '').toLowerCase().includes(lowerQuery) ||
        (c.companyName ?? '').toLowerCase().includes(lowerQuery) ||
        (c.tags ?? []).some((t) => t.toLowerCase().includes(lowerQuery)) ||
        (Array.isArray(c.directories)
          ? c.directories.some((d) => String(d).toLowerCase().includes(lowerQuery))
          : String(c.directories ?? '').toLowerCase().includes(lowerQuery)),
    )
  }
  return filtered
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return '—'
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(dateObj)
  } catch {
    return '—'
  }
}

export function formatDirectories(directories: string[] | string | null | undefined): string {
  if (!directories) return '—'
  if (Array.isArray(directories)) return directories.length > 0 ? directories.join(', ') : '—'
  return directories
}

function serviceNamesOf(apiClient: ApiClient): string[] {
  return Array.isArray(apiClient.services)
    ? (apiClient.services as { name?: string }[])
        .map((s) => s.name)
        .filter((n): n is string => n != null && n !== '')
    : []
}

/** API may return the business type as a relation `{ id, name }` or a plain string. */
function businessTypeNameOf(bt: unknown): string | undefined {
  if (typeof bt === 'object' && bt !== null && 'name' in bt) return (bt as { name: string }).name
  return typeof bt === 'string' ? bt : undefined
}

// Backend returns camelCase (name, companyName, followupDate, onboardDate, phone) and businessType relation { id, name }
export function transformApiClientToComponent(apiClient: ApiClient & Record<string, unknown>): Client {
  const c = apiClient as any
  const serviceNames = serviceNamesOf(apiClient)
  return {
    id: apiClient.id,
    name: c.name ?? apiClient.client_name ?? '',
    email: apiClient.email ?? '',
    phone: c.phone ?? apiClient.phone_number ?? null,
    companyName: c.companyName ?? apiClient.company_name ?? '',
    directories: serviceNames.length > 0 ? serviceNames : '—',
    followUpDate: c.followupDate ?? apiClient.follow_date ?? null,
    onboardDate: c.onboardDate ?? apiClient.onboard_date ?? null,
    lastContactedDate: null, // API doesn't provide this field
    status: apiClient.status ?? undefined,
    businessType: businessTypeNameOf(c.businessType ?? c.business_type),
    tags: Array.isArray(c.tags) ? c.tags : [],
  }
}

/** Map selected service names to ids; unknown names are dropped. */
function serviceIdsFor(directories: Client['directories'], services: Service[]): number[] {
  if (!Array.isArray(directories)) return []
  return directories
    .map((dir) => services.find((s) => s.name === dir)?.id)
    .filter((id): id is number => id !== undefined)
}

/** Date-only ISO string (YYYY-MM-DD); strings are passed through unchanged. */
function toDateOnly(date: string | Date | null | undefined): string | undefined {
  if (!date) return undefined
  return typeof date === 'string' ? date : new Date(date).toISOString().split('T')[0]
}

/** Directors with a name, trimmed, with empty optional fields omitted. */
function toDirectorPayload(directors: ClientDirector[] | undefined) {
  return (directors ?? [])
    .filter((d) => d?.name?.trim())
    .map((d) => ({
      directorName: d.name.trim(),
      ...(d.email?.trim() ? { email: d.email.trim() } : {}),
      ...(d.phone?.trim() ? { phone: d.phone.trim() } : {}),
      ...(d.designation?.trim() ? { designation: d.designation.trim() } : {}),
      ...(d.din?.trim() ? { din: d.din.trim() } : {}),
      ...(d.pan?.trim() ? { pan: d.pan.trim() } : {}),
      ...(d.aadhar?.trim() ? { aadharNumber: d.aadhar.trim() } : {}),
    }))
}

function commonPayload(clientData: NewClient, businessTypeId?: number | null) {
  return {
    name: clientData.name,
    email: clientData.email,
    phone: clientData.phone || undefined,
    companyName: clientData.companyName,
    businessTypeId: businessTypeId ?? undefined,
    panNumber: clientData.panNumber,
    gstNumber: clientData.gstNumber,
    address: clientData.address,
    city: clientData.city,
    state: clientData.state,
    country: clientData.country,
    pincode: clientData.pincode,
    onboardDate: toDateOnly(clientData.onboardDate),
    followupDate: toDateOnly(clientData.followUpDate),
    additionalNotes: clientData.notes,
    // only sent when the form had tags, so other callers never wipe them
    ...(clientData.tags ? { tags: clientData.tags } : {}),
  }
}

export function transformComponentToOnboardRequest(
  clientData: NewClient,
  services: Service[],
  organizationId?: number,
  businessTypeId?: number | null,
): OnboardClientRequest {
  const serviceIds = serviceIdsFor(clientData.directories, services)
  const directors = toDirectorPayload(clientData.directors)
  return {
    ...commonPayload(clientData, businessTypeId),
    status: (clientData.status as OnboardClientRequest['status']) || 'active',
    serviceIds: serviceIds.length > 0 ? serviceIds : undefined,
    organizationId,
    ...(directors.length > 0 ? { directors } : {}),
  }
}

export function transformComponentToUpdateRequest(
  clientData: NewClient,
  services: Service[],
  businessTypeId?: number | null,
): UpdateClientRequest {
  return {
    ...commonPayload(clientData, businessTypeId),
    status: clientData.status as UpdateClientRequest['status'],
    // Always sent, even when empty, so an update can clear services/directors.
    serviceIds: serviceIdsFor(clientData.directories, services),
    directors: toDirectorPayload(clientData.directors),
  }
}

export interface ClientFormValues {
  name: string
  email: string
  phone: string
  companyName: string
  panNumber?: string
  gstNumber?: string
  businessType: string
  customBusinessType?: string
  status: string
  addressLine1: string
  city: string
  state: string
  country: string
  pincode: string
  directories: string[]
  onboardDate: Date
  followUpDate: Date | null
  notes?: string
  tags?: string[]
  directors?: ClientDirector[]
}

// Backend returns camelCase (companyName, followupDate, onboardDate, additionalNotes, etc.)
export function transformApiClientToFormValues(apiClient: ApiClient & Record<string, unknown>): ClientFormValues {
  const c = apiClient as any
  // Backend returns directorName / aadharNumber (camelCase); older payloads use snake_case.
  const directorsList = Array.isArray(apiClient.directors) ? (apiClient.directors as Record<string, unknown>[]) : []
  const directors = directorsList.map((dir) => ({
    name: (dir.directorName ?? dir.name ?? dir.director_name ?? '') as string,
    email: (dir.email ?? '') as string,
    phone: (dir.phone ?? dir.phone_number ?? '') as string,
    designation: (dir.designation ?? '') as string,
    din: (dir.din ?? '') as string,
    pan: (dir.pan ?? '') as string,
    aadhar: (dir.aadharNumber ?? dir.aadhaar ?? dir.aadhar ?? '') as string,
  }))
  const onboard = c.onboardDate ?? apiClient.onboard_date
  const followup = c.followupDate ?? apiClient.follow_date

  return {
    name: c.name ?? apiClient.client_name ?? '',
    email: apiClient.email ?? '',
    phone: c.phone ?? apiClient.phone_number ?? '',
    companyName: c.companyName ?? apiClient.company_name ?? '',
    panNumber: c.panNumber ?? apiClient.pan_number ?? undefined,
    gstNumber: c.gstNumber ?? apiClient.gst_number ?? undefined,
    businessType: businessTypeNameOf(c.businessType ?? apiClient.business_type) ?? '',
    customBusinessType: undefined, // Will be set if businessType is "Other"
    status: c.status ?? apiClient.status ?? 'active',
    // API returns address as a single string; the form expects addressLine1
    addressLine1: c.address ?? apiClient.address ?? '',
    city: c.city ?? apiClient.city ?? '',
    state: c.state ?? apiClient.state ?? '',
    country: c.country ?? apiClient.country ?? '',
    pincode: c.pincode ?? apiClient.pin_code ?? '',
    directories: serviceNamesOf(apiClient),
    onboardDate: onboard ? new Date(onboard) : new Date(),
    followUpDate: followup ? new Date(followup) : null,
    notes: c.additionalNotes ?? apiClient.additional_notes ?? undefined,
    tags: Array.isArray(c.tags) ? c.tags : [],
    directors,
  }
}
