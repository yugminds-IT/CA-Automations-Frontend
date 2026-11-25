"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface OrganizationFormValues {
  name: string
  city: string
  state: string
  country: string
  pincode: string
}

const LOCATION_FIELDS: { key: Exclude<keyof OrganizationFormValues, "name">; label: string; placeholder: string }[] = [
  { key: "city", label: "City", placeholder: "Mumbai" },
  { key: "state", label: "State", placeholder: "Maharashtra" },
  { key: "country", label: "Country", placeholder: "India" },
  { key: "pincode", label: "Pincode", placeholder: "400001" },
]

/** Shared fields for the Add and Edit organization dialogs. */
export function OrganizationFormFields({
  values,
  onChange,
  idPrefix = "",
  nameRequired = false,
}: {
  values: OrganizationFormValues
  onChange: (values: OrganizationFormValues) => void
  /** Keeps element ids unique when both dialogs are mounted. */
  idPrefix?: string
  nameRequired?: boolean
}) {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}org-name`}>Organization Name{nameRequired ? " *" : ""}</Label>
        <Input
          id={`${idPrefix}org-name`}
          type="text"
          placeholder="ABC Chartered Accountants"
          value={values.name}
          onChange={(e) => onChange({ ...values, name: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LOCATION_FIELDS.map((f) => (
          <div key={f.key} className="space-y-2">
            <Label htmlFor={`${idPrefix}${f.key}`}>{f.label}</Label>
            <Input
              id={`${idPrefix}${f.key}`}
              type="text"
              placeholder={f.placeholder}
              value={values[f.key]}
              onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
