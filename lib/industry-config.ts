export interface IndustryMailConfig {
  key: string
  pageTitle: string
  pageSubtitle: string
  recipientListTitle: string
  recipientSingular: string
  recipientPlural: string
  searchPlaceholder: string
  breadcrumbLabel: string
  groupLabel: string
  categoryFilterLabel: string
  serviceFilterLabel: string
  variables: { label: string; value: string }[]
  resolveClientVars: (client: any, user: any) => Record<string, string>
}

export const INDUSTRY_MAIL_CONFIGS: Record<string, IndustryMailConfig> = {
  website_developer: {
    key: 'website_developer',
    pageTitle: 'Broadcast Mailer',
    pageSubtitle: 'Select client websites, contacts, or subscribers to broadcast transactional updates, inquiries, or maintenance notices.',
    recipientListTitle: 'Select Contacts & Clients',
    recipientSingular: 'Contact',
    recipientPlural: 'Contacts',
    searchPlaceholder: 'Search by contact name, website or company...',
    breadcrumbLabel: 'Broadcast Mailer',
    groupLabel: 'Email & Templates',
    categoryFilterLabel: 'Client Type',
    serviceFilterLabel: 'Service',
    variables: [
      { label: 'Sender Name', value: '{{sender_name}}' },
      { label: 'Sender Email', value: '{{sender_email}}' },
      { label: 'Sender Phone', value: '{{sender_phone}}' },
      { label: 'Company / Org', value: '{{company}}' },
      { label: 'Origin Page URL', value: '{{page_url}}' },
      { label: 'Message Body', value: '{{message}}' },
    ],
    resolveClientVars: (c, u) => ({
      sender_name: c.name || '',
      sender_email: c.email || '',
      sender_phone: c.phone || '',
      company: c.companyName || '',
      page_url: c.address || c.city || '',
      message: c.additionalNotes || '',
    }),
  },

  school: {
    key: 'school',
    pageTitle: 'Send Fees, Circulars & Student Notices',
    pageSubtitle: 'Select students, parents, or faculty batches to dispatch exam schedules, circulars, and fee due alerts.',
    recipientListTitle: 'Select Students, Parents & Faculty',
    recipientSingular: 'Student / Parent',
    recipientPlural: 'Students & Parents',
    searchPlaceholder: 'Search by student name, roll number, or department...',
    breadcrumbLabel: 'Send Fees & Exam Notices',
    groupLabel: 'Students & Parents',
    categoryFilterLabel: 'Batch / Class',
    serviceFilterLabel: 'Notice Type',
    variables: [
      { label: 'Student Name', value: '{{student_name}}' },
      { label: 'Parent Name', value: '{{parent_name}}' },
      { label: 'Class / Batch', value: '{{grade_class}}' },
      { label: 'Roll Number', value: '{{roll_number}}' },
      { label: 'Fee Amount', value: '{{fee_amount}}' },
      { label: 'Due Date', value: '{{due_date}}' },
      { label: 'Institution Name', value: '{{institution_name}}' },
      { label: 'Recipient Name', value: '{{recipient_name}}' },
      { label: 'Department', value: '{{department}}' },
      { label: 'Designation', value: '{{designation}}' },
      { label: 'Meeting Date & Time', value: '{{meeting_datetime}}' },
      { label: 'Meeting Venue', value: '{{meeting_venue}}' },
      { label: 'Campus Portal URL', value: '{{portal_url}}' },
    ],
    resolveClientVars: (c, u) => {
      const orgName = u?.organization?.name || u?.org_name || ''
      return {
        student_name: c.name || '',
        parent_name: (c.directors && c.directors[0]?.name) || (c.name ? `Parent of ${c.name}` : ''),
        grade_class: c.businessType || '',
        roll_number: c.panNumber || (c.id ? String(c.id) : ''),
        fee_amount: c.additionalNotes || '',
        due_date: c.followUpDate || '',
        institution_name: orgName,
        recipient_name: c.name || '',
        department: c.city || '',
        designation: (c.directors && c.directors[0]?.designation) || '',
        meeting_datetime: c.followUpDate || '',
        meeting_venue: u?.organization?.address || '',
        portal_url: typeof window !== 'undefined' ? window.location.origin : '',
      }
    },
  },

  education: {
    key: 'education',
    pageTitle: 'Send Fees, Circulars & Student Notices',
    pageSubtitle: 'Select students, parents, or faculty batches to dispatch exam schedules, circulars, and fee due alerts.',
    recipientListTitle: 'Select Students, Parents & Faculty',
    recipientSingular: 'Student / Parent',
    recipientPlural: 'Students & Parents',
    searchPlaceholder: 'Search by student name, roll number, or department...',
    breadcrumbLabel: 'Send Fees & Exam Notices',
    groupLabel: 'Students & Parents',
    categoryFilterLabel: 'Batch / Class',
    serviceFilterLabel: 'Notice Type',
    variables: [
      { label: 'Student Name', value: '{{student_name}}' },
      { label: 'Parent Name', value: '{{parent_name}}' },
      { label: 'Class / Batch', value: '{{grade_class}}' },
      { label: 'Roll Number', value: '{{roll_number}}' },
      { label: 'Fee Amount', value: '{{fee_amount}}' },
      { label: 'Due Date', value: '{{due_date}}' },
      { label: 'Institution Name', value: '{{institution_name}}' },
      { label: 'Recipient Name', value: '{{recipient_name}}' },
      { label: 'Department', value: '{{department}}' },
      { label: 'Designation', value: '{{designation}}' },
      { label: 'Meeting Date & Time', value: '{{meeting_datetime}}' },
      { label: 'Meeting Venue', value: '{{meeting_venue}}' },
      { label: 'Campus Portal URL', value: '{{portal_url}}' },
    ],
    resolveClientVars: (c, u) => {
      const orgName = u?.organization?.name || u?.org_name || ''
      return {
        student_name: c.name || '',
        parent_name: (c.directors && c.directors[0]?.name) || (c.name ? `Parent of ${c.name}` : ''),
        grade_class: c.businessType || '',
        roll_number: c.panNumber || (c.id ? String(c.id) : ''),
        fee_amount: c.additionalNotes || '',
        due_date: c.followUpDate || '',
        institution_name: orgName,
        recipient_name: c.name || '',
        department: c.city || '',
        designation: (c.directors && c.directors[0]?.designation) || '',
        meeting_datetime: c.followUpDate || '',
        meeting_venue: u?.organization?.address || '',
        portal_url: typeof window !== 'undefined' ? window.location.origin : '',
      }
    },
  },

  ecommerce: {
    key: 'ecommerce',
    pageTitle: 'Order Notifications & Customer Broadcast',
    pageSubtitle: 'Select customers to send shipment updates, order receipts, or promotional offers.',
    recipientListTitle: 'Select Customers',
    recipientSingular: 'Customer',
    recipientPlural: 'Customers',
    searchPlaceholder: 'Search by customer name, order ID, or email...',
    breadcrumbLabel: 'Order Notifications',
    groupLabel: 'Commerce & Orders',
    categoryFilterLabel: 'Customer Tier',
    serviceFilterLabel: 'Category',
    variables: [
      { label: 'Customer Name', value: '{{customer_name}}' },
      { label: 'Order ID', value: '{{order_id}}' },
      { label: 'Order Total', value: '{{order_total}}' },
      { label: 'Tracking URL', value: '{{tracking_url}}' },
      { label: 'Items Summary', value: '{{items_summary}}' },
    ],
    resolveClientVars: (c, u) => ({
      customer_name: c.name || '',
      order_id: c.panNumber || (c.id ? String(c.id) : ''),
      order_total: c.additionalNotes || '',
      tracking_url: '',
      items_summary: (c.services && c.services.map((s: any) => s.name).join(', ')) || '',
    }),
  },

  healthcare: {
    key: 'healthcare',
    pageTitle: 'Patient Notifications & Reminders',
    pageSubtitle: 'Select patients to send appointment alerts, clinic notices, or report availability.',
    recipientListTitle: 'Select Patients',
    recipientSingular: 'Patient',
    recipientPlural: 'Patients',
    searchPlaceholder: 'Search by patient name, record number, or phone...',
    breadcrumbLabel: 'Appointment Reminders',
    groupLabel: 'Clinic & Patients',
    categoryFilterLabel: 'Department',
    serviceFilterLabel: 'Treatment',
    variables: [
      { label: 'Patient Name', value: '{{patient_name}}' },
      { label: 'Doctor Name', value: '{{doctor_name}}' },
      { label: 'Appointment Date', value: '{{appointment_date}}' },
      { label: 'Appointment Time', value: '{{appointment_time}}' },
      { label: 'Clinic Address', value: '{{clinic_address}}' },
      { label: 'Report Link', value: '{{report_link}}' },
    ],
    resolveClientVars: (c, u) => ({
      patient_name: c.name || '',
      doctor_name: (c.directors && c.directors[0]?.name) || u?.name || '',
      appointment_date: c.followUpDate || '',
      appointment_time: '',
      clinic_address: u?.organization?.address || '',
      report_link: '',
    }),
  },

  saas: {
    key: 'saas',
    pageTitle: 'User Broadcast & Lifecycle Campaigns',
    pageSubtitle: 'Select user accounts to broadcast product updates, trial alerts, or onboarding drips.',
    recipientListTitle: 'Select Users & Accounts',
    recipientSingular: 'User',
    recipientPlural: 'Users',
    searchPlaceholder: 'Search by user name, workspace, or email...',
    breadcrumbLabel: 'Broadcast Mailer',
    groupLabel: 'Email Campaigns',
    categoryFilterLabel: 'Plan Tier',
    serviceFilterLabel: 'Feature Area',
    variables: [
      { label: 'User Name', value: '{{user_name}}' },
      { label: 'App Name', value: '{{app_name}}' },
      { label: 'Days Left in Trial', value: '{{trial_days_left}}' },
      { label: 'Login URL', value: '{{login_url}}' },
      { label: 'Plan Name', value: '{{plan_name}}' },
    ],
    resolveClientVars: (c, u) => ({
      user_name: c.name || '',
      app_name: u?.organization?.name || '',
      trial_days_left: '',
      login_url: typeof window !== 'undefined' ? `${window.location.origin}/login` : '',
      plan_name: c.businessType || '',
    }),
  },

  financial_services: {
    key: 'financial_services',
    pageTitle: 'Send Mails & Tax Filing Notices',
    pageSubtitle: 'Select clients and compose GST, TDS, or Audit compliance emails.',
    recipientListTitle: 'Select Clients',
    recipientSingular: 'Client',
    recipientPlural: 'Clients',
    searchPlaceholder: 'Search by client or company...',
    breadcrumbLabel: 'Send Mails',
    groupLabel: 'Email Management',
    categoryFilterLabel: 'Entity Type',
    serviceFilterLabel: 'Tax Service',
    variables: [
      { label: 'Client Name', value: '{{client_name}}' },
      { label: 'Company Name', value: '{{company_name}}' },
      { label: 'Financial Year', value: '{{financial_year}}' },
      { label: 'Assessment Year', value: '{{assessment_year}}' },
      { label: 'Due Date', value: '{{due_date}}' },
      { label: 'Service Name', value: '{{service_name}}' },
    ],
    resolveClientVars: (c, u) => ({
      client_name: c.name || '',
      company_name: c.companyName || '',
      financial_year: '',
      assessment_year: '',
      due_date: c.followUpDate || '',
      service_name: (c.services && c.services[0]?.name) || '',
    }),
  },
}

export function getIndustryMailConfig(industry?: string | null): IndustryMailConfig {
  const normalized = (industry || 'financial_services').toLowerCase().trim()
  return INDUSTRY_MAIL_CONFIGS[normalized] || INDUSTRY_MAIL_CONFIGS.financial_services
}

export interface IndustryClientConfig {
  key: string
  clientSingular: string
  clientPlural: string
  onboardButtonLabel: string
  onboardTitle: string
  onboardSubtitle: string
  editTitle: string
  editSubtitle: string

  // Basic Information
  nameLabel: string
  namePlaceholder: string

  companyLabel: string
  companyPlaceholder: string
  companyRequired: boolean
  companyHelpText?: string

  businessTypeLabel: string
  businessTypePlaceholder: string

  // Services
  servicesSectionTitle: string
  servicesHelpText?: string
  otherServicePlaceholder: string

  // Tax / Identification
  taxSectionTitle: string
  panLabel: string
  panPlaceholder: string
  panHelpText?: string
  gstLabel: string
  gstPlaceholder: string
  gstHelpText?: string
  showTaxSection: boolean

  // Dates
  datesSectionTitle: string
  onboardDateLabel: string
  followUpDateLabel: string

  // Notes
  notesLabel: string
  notesPlaceholder: string

  // Stakeholders / Directors / Contacts
  stakeholdersSectionTitle: string
  stakeholdersAddButtonLabel: string
  stakeholdersSingular: string
  showDinField: boolean
  showPanAadharFields: boolean
  designationLabel: string
  designationPlaceholder: string
}

export const INDUSTRY_CLIENT_CONFIGS: Record<string, IndustryClientConfig> = {
  website_developer: {
    key: 'website_developer',
    clientSingular: 'Client / Contact',
    clientPlural: 'Clients & Contacts',
    onboardButtonLabel: 'Add Client',
    onboardTitle: 'Onboard Client / Contact',
    onboardSubtitle: 'Add a new client, business owner, or contact person for website development projects.',
    editTitle: 'Update Client Details',
    editSubtitle: 'Modify client information, deliverables, or contact details.',
    nameLabel: 'Client / Contact Name',
    namePlaceholder: 'e.g. Alex Rivera',
    companyLabel: 'Website / Business Name',
    companyPlaceholder: 'e.g. Acme Studio / acmestudio.com',
    companyRequired: false,
    companyHelpText: 'Brand, website URL, or business name (optional for individuals)',
    businessTypeLabel: 'Client / Project Type',
    businessTypePlaceholder: 'Select project or client type',
    servicesSectionTitle: 'Deliverables & Tech Stack',
    servicesHelpText: 'Select website deliverables or services required',
    otherServicePlaceholder: 'Enter custom deliverable or feature',
    taxSectionTitle: 'Invoicing & Tax Details (Optional)',
    panLabel: 'PAN / Tax ID',
    panPlaceholder: 'ABCDE1234F',
    gstLabel: 'GST / VAT Number',
    gstPlaceholder: '22ABCDE1234F1Z5',
    showTaxSection: true,
    datesSectionTitle: 'Project Timeline',
    onboardDateLabel: 'Project Kickoff Date',
    followUpDateLabel: 'Next Milestone / Review Date',
    notesLabel: 'Project Requirements & Notes',
    notesPlaceholder: 'Wireframe links, repo URLs, hosting preferences, or project requirements...',
    stakeholdersSectionTitle: 'Key Stakeholders & Contacts',
    stakeholdersAddButtonLabel: '+ Add Stakeholder / Contact',
    stakeholdersSingular: 'Contact Person',
    showDinField: false,
    showPanAadharFields: false,
    designationLabel: 'Role / Designation',
    designationPlaceholder: 'e.g. Project Lead, CTO, Founder, Designer',
  },

  school: {
    key: 'school',
    clientSingular: 'Student',
    clientPlural: 'Students',
    onboardButtonLabel: 'Register Student',
    onboardTitle: 'Register New Student',
    onboardSubtitle: 'Enroll a student and record parent/guardian emergency contact details.',
    editTitle: 'Update Student Information',
    editSubtitle: 'Modify student records, batch enrollment, or guardian details.',
    nameLabel: 'Student Full Name',
    namePlaceholder: 'e.g. Rahul Sharma',
    companyLabel: 'School / Campus / Branch',
    companyPlaceholder: 'e.g. North Campus / High School Section',
    companyRequired: false,
    companyHelpText: 'Branch or campus name (optional)',
    businessTypeLabel: 'Grade / Class / Batch',
    businessTypePlaceholder: 'Select class or batch',
    servicesSectionTitle: 'Enrolled Programs, Subjects & Facilities',
    servicesHelpText: 'Select elective subjects, sports, transport, or hostel',
    otherServicePlaceholder: 'Enter custom subject or facility',
    taxSectionTitle: 'Student Identification & IDs (Optional)',
    panLabel: 'Student Roll No / Enrollment ID',
    panPlaceholder: 'e.g. STU-2026-042',
    gstLabel: 'Admission / Registration Number',
    gstPlaceholder: 'e.g. ADM-89210',
    showTaxSection: true,
    datesSectionTitle: 'Academic Dates',
    onboardDateLabel: 'Admission / Enrollment Date',
    followUpDateLabel: 'Fee Due Date / Exam Date',
    notesLabel: 'Academic Notes & Remarks',
    notesPlaceholder: 'Scholarship info, medical notes, previous school records...',
    stakeholdersSectionTitle: 'Parents & Guardians',
    stakeholdersAddButtonLabel: '+ Add Parent / Guardian',
    stakeholdersSingular: 'Parent / Guardian',
    showDinField: false,
    showPanAadharFields: false,
    designationLabel: 'Relationship to Student',
    designationPlaceholder: 'e.g. Father, Mother, Legal Guardian',
  },

  education: {
    key: 'education',
    clientSingular: 'Student',
    clientPlural: 'Students',
    onboardButtonLabel: 'Register Student',
    onboardTitle: 'Register New Student',
    onboardSubtitle: 'Enroll a student and record parent/guardian emergency contact details.',
    editTitle: 'Update Student Information',
    editSubtitle: 'Modify student records, batch enrollment, or guardian details.',
    nameLabel: 'Student Full Name',
    namePlaceholder: 'e.g. Rahul Sharma',
    companyLabel: 'School / Campus / Branch',
    companyPlaceholder: 'e.g. North Campus / High School Section',
    companyRequired: false,
    companyHelpText: 'Branch or campus name (optional)',
    businessTypeLabel: 'Grade / Class / Batch',
    businessTypePlaceholder: 'Select class or batch',
    servicesSectionTitle: 'Enrolled Programs, Subjects & Facilities',
    servicesHelpText: 'Select elective subjects, sports, transport, or hostel',
    otherServicePlaceholder: 'Enter custom subject or facility',
    taxSectionTitle: 'Student Identification & IDs (Optional)',
    panLabel: 'Student Roll No / Enrollment ID',
    panPlaceholder: 'e.g. STU-2026-042',
    gstLabel: 'Admission / Registration Number',
    gstPlaceholder: 'e.g. ADM-89210',
    showTaxSection: true,
    datesSectionTitle: 'Academic Dates',
    onboardDateLabel: 'Admission / Enrollment Date',
    followUpDateLabel: 'Fee Due Date / Exam Date',
    notesLabel: 'Academic Notes & Remarks',
    notesPlaceholder: 'Scholarship info, medical notes, previous school records...',
    stakeholdersSectionTitle: 'Parents & Guardians',
    stakeholdersAddButtonLabel: '+ Add Parent / Guardian',
    stakeholdersSingular: 'Parent / Guardian',
    showDinField: false,
    showPanAadharFields: false,
    designationLabel: 'Relationship to Student',
    designationPlaceholder: 'e.g. Father, Mother, Legal Guardian',
  },

  ecommerce: {
    key: 'ecommerce',
    clientSingular: 'Customer',
    clientPlural: 'Customers',
    onboardButtonLabel: 'Add Customer',
    onboardTitle: 'Add New Customer',
    onboardSubtitle: 'Register a retail or wholesale customer with shipping and communication preferences.',
    editTitle: 'Update Customer Profile',
    editSubtitle: 'Modify customer contact details, tier, or shipping addresses.',
    nameLabel: 'Customer Name',
    namePlaceholder: 'e.g. Sarah Jenkins',
    companyLabel: 'Company / Store (Optional)',
    companyPlaceholder: 'e.g. Jenkins Boutique',
    companyRequired: false,
    companyHelpText: 'Wholesale or corporate business name if applicable',
    businessTypeLabel: 'Customer Tier / Segment',
    businessTypePlaceholder: 'Select tier (e.g. VIP, Wholesale, Retail)',
    servicesSectionTitle: 'Subscribed Lines & Interests',
    servicesHelpText: 'Select purchased product categories or subscription tiers',
    otherServicePlaceholder: 'Enter custom interest or category',
    taxSectionTitle: 'Commercial & Tax Details (B2B / Optional)',
    panLabel: 'PAN / Tax ID (Optional)',
    panPlaceholder: 'ABCDE1234F',
    gstLabel: 'GST / VAT Number (Optional)',
    gstPlaceholder: '27ABCDE1234F1Z5',
    showTaxSection: true,
    datesSectionTitle: 'Customer Dates',
    onboardDateLabel: 'Customer Since',
    followUpDateLabel: 'Next Follow-up / Reorder Date',
    notesLabel: 'Customer Preferences & Notes',
    notesPlaceholder: 'Delivery preferences, VIP notes, special sizing, discounts...',
    stakeholdersSectionTitle: 'Secondary Contacts & Buyers',
    stakeholdersAddButtonLabel: '+ Add Secondary Contact',
    stakeholdersSingular: 'Authorized Contact',
    showDinField: false,
    showPanAadharFields: false,
    designationLabel: 'Role / Relation',
    designationPlaceholder: 'e.g. Purchasing Manager, Spouse, Store Manager',
  },

  healthcare: {
    key: 'healthcare',
    clientSingular: 'Patient',
    clientPlural: 'Patients',
    onboardButtonLabel: 'Register Patient',
    onboardTitle: 'Register New Patient',
    onboardSubtitle: 'Create a patient clinical record, emergency contact, and consultation details.',
    editTitle: 'Update Patient Record',
    editSubtitle: 'Modify patient personal details, attending doctor, or emergency contact.',
    nameLabel: 'Patient Full Name',
    namePlaceholder: 'e.g. Priya Nair',
    companyLabel: 'Insurance Provider / Employer',
    companyPlaceholder: 'e.g. Star Health / Self',
    companyRequired: false,
    companyHelpText: 'Insurance provider, sponsor, or employer (optional)',
    businessTypeLabel: 'Department / Patient Type',
    businessTypePlaceholder: 'Select department or ward',
    servicesSectionTitle: 'Treatments & Care Packages',
    servicesHelpText: 'Select ongoing treatments, consultations, or therapy packages',
    otherServicePlaceholder: 'Enter custom treatment or procedure',
    taxSectionTitle: 'Medical ID & Insurance Details (Optional)',
    panLabel: 'Patient MRN / Hospital Record ID',
    panPlaceholder: 'e.g. MRN-2026-904',
    gstLabel: 'Insurance Policy / Card Number',
    gstPlaceholder: 'e.g. POL-554219',
    showTaxSection: true,
    datesSectionTitle: 'Care Timeline',
    onboardDateLabel: 'First Visit / Registration Date',
    followUpDateLabel: 'Next Appointment / Follow-up',
    notesLabel: 'Medical History & Allergies',
    notesPlaceholder: 'Allergies, chronic conditions, regular medications, emergency notes...',
    stakeholdersSectionTitle: 'Emergency Contacts & Attendants',
    stakeholdersAddButtonLabel: '+ Add Emergency Contact',
    stakeholdersSingular: 'Emergency Contact',
    showDinField: false,
    showPanAadharFields: false,
    designationLabel: 'Relationship to Patient',
    designationPlaceholder: 'e.g. Spouse, Mother, Guardian, Attendant',
  },

  saas: {
    key: 'saas',
    clientSingular: 'Account',
    clientPlural: 'Accounts & Users',
    onboardButtonLabel: 'Add Account',
    onboardTitle: 'Onboard New Account / User',
    onboardSubtitle: 'Register a new tenant, organization workspace, or primary user.',
    editTitle: 'Update Account Details',
    editSubtitle: 'Modify workspace tier, primary administrator, or enabled features.',
    nameLabel: 'Account Administrator Name',
    namePlaceholder: 'e.g. Jordan Lee',
    companyLabel: 'Workspace / Organization Name',
    companyPlaceholder: 'e.g. CloudScale Inc',
    companyRequired: false,
    companyHelpText: 'Workspace, organization, or team name',
    businessTypeLabel: 'Plan / Subscription Tier',
    businessTypePlaceholder: 'Select plan tier',
    servicesSectionTitle: 'Enabled Features & Add-ons',
    servicesHelpText: 'Select workspace features, enterprise add-ons, or integrations',
    otherServicePlaceholder: 'Enter custom feature or add-on',
    taxSectionTitle: 'Billing & Tax Details (Optional)',
    panLabel: 'Corporate Tax ID / PAN',
    panPlaceholder: 'ABCDE1234F',
    gstLabel: 'GST / VAT Number',
    gstPlaceholder: '27ABCDE1234F1Z5',
    showTaxSection: true,
    datesSectionTitle: 'Subscription Dates',
    onboardDateLabel: 'Workspace Provisioned Date',
    followUpDateLabel: 'Renewal / Trial Expiry Date',
    notesLabel: 'Account Notes & SLA Requirements',
    notesPlaceholder: 'SLA terms, SSO config notes, custom seat limits...',
    stakeholdersSectionTitle: 'Workspace Admins & Team Leads',
    stakeholdersAddButtonLabel: '+ Add Admin / Contact',
    stakeholdersSingular: 'Admin / Team Lead',
    showDinField: false,
    showPanAadharFields: false,
    designationLabel: 'Role in Workspace',
    designationPlaceholder: 'e.g. Billing Owner, Security Admin, DevOps Lead',
  },

  financial_services: {
    key: 'financial_services',
    clientSingular: 'Client',
    clientPlural: 'Clients',
    onboardButtonLabel: 'Onboard Client',
    onboardTitle: 'Onboard New Client',
    onboardSubtitle: 'Fill in the client details, business entity type, and tax compliance services.',
    editTitle: 'Update Client',
    editSubtitle: 'Update client registration, tax IDs, and director information.',
    nameLabel: 'Client Name',
    namePlaceholder: 'e.g. John Doe',
    companyLabel: 'Company Name',
    companyPlaceholder: 'e.g. Acme Corporation Pvt Ltd',
    companyRequired: true,
    companyHelpText: 'Official registered company or entity name',
    businessTypeLabel: 'Business Entity Type',
    businessTypePlaceholder: 'Select business type',
    servicesSectionTitle: 'Compliance & Tax Services',
    servicesHelpText: 'Select tax filings, audit, or accounting services required',
    otherServicePlaceholder: 'Enter custom service',
    taxSectionTitle: 'Tax & Legal Registration (PAN / GST)',
    panLabel: 'PAN Number',
    panPlaceholder: 'ABCDE1234F',
    gstLabel: 'GST Number',
    gstPlaceholder: '22ABCDE1234F1Z5',
    showTaxSection: true,
    datesSectionTitle: 'Engagement Dates',
    onboardDateLabel: 'Onboard Date',
    followUpDateLabel: 'Follow-up Date',
    notesLabel: 'Notes & Observations',
    notesPlaceholder: 'Any additional information about this client...',
    stakeholdersSectionTitle: 'Directors & Partners',
    stakeholdersAddButtonLabel: '+ Add Director / Partner',
    stakeholdersSingular: 'Director',
    showDinField: true,
    showPanAadharFields: true,
    designationLabel: 'Designation',
    designationPlaceholder: 'e.g. Managing Director, Partner, Director',
  },
}

export function getIndustryClientConfig(industry?: string | null): IndustryClientConfig {
  const normalized = (industry || 'financial_services').toLowerCase().trim()
  return INDUSTRY_CLIENT_CONFIGS[normalized] || INDUSTRY_CLIENT_CONFIGS.financial_services
}
