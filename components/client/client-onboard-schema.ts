import * as z from 'zod'

/** Validation for the client onboarding / edit form (see client-onboard-schema.test.ts). */
export const clientOnboardSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional().or(z.literal('')).refine(
    (val) => !val || val === '' || val.length >= 10,
    'Please enter a valid phone number (at least 10 digits)'
  ),
  companyName: z.string().optional().or(z.literal('')),
  panNumber: z.string().max(50).optional().or(z.literal('')),
  gstNumber: z.string().max(50).optional().or(z.literal('')),
  businessType: z.string().min(1, 'Please select an option'),
  customBusinessType: z.string().optional(),
  status: z.string().optional(),
  addressLine1: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  pincode: z.string().optional().or(z.literal('')).refine(
    (val) => !val || val === '' || /^[0-9]{6}$/.test(val),
    'Pincode must be 6 digits'
  ),
  directories: z.array(z.string()).optional().default([]),
  onboardDate: z.date().optional().nullable(),
  followUpDate: z.date().optional().nullable(),
  notes: z.string().optional(),
  directors: z.array(z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    designation: z.string().optional().or(z.literal('')),
    din: z.string().optional().or(z.literal('')),
    pan: z.string().optional().or(z.literal('')),
    aadhar: z.string().optional().or(z.literal('')),
  })).optional().default([]),
})

export type ClientOnboardFormValues = z.infer<typeof clientOnboardSchema>
