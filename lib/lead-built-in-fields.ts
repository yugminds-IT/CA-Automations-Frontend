// The fields every lead has, whatever the business unit. They are columns on the lead itself, so they
// cannot be removed or change type; custom fields (lib/api/custom-fields.ts) are added on top of these.
// Keep in step with the Lead entity on the server, the lead form on /leads, the lead page,
// the CSV import dialog and the web-form intake (developer.service convertSubmissionToLead).

/** Where a field is filled in or shown. */
export const LEAD_SURFACES = {
  newLead: 'New lead form',
  leadPage: 'Lead page',
  csvImport: 'CSV import',
  webForms: 'Web forms',
  board: 'Leads board',
  calendar: 'Calendar',
} as const;

export interface BuiltInLeadField {
  key: string;
  label: string;
  /** Plain-words type, shown as a badge. */
  type: string;
  /** What the field is for, or any rule the server enforces on it. */
  note: string;
  /** The forms and screens that fill in or show this field. */
  where: readonly string[];
  required?: boolean;
}

const { newLead, leadPage, csvImport, webForms, board, calendar } = LEAD_SURFACES;

export const BUILT_IN_LEAD_FIELDS: readonly BuiltInLeadField[] = [
  { key: 'name', label: 'Name', type: 'Short text', note: 'Who the lead is. Web forms use the form\'s name field.', where: [newLead, leadPage, csvImport, webForms], required: true },
  { key: 'email', label: 'Email', type: 'Email', note: 'Needs an email or a phone number. Used to spot duplicates.', where: [newLead, leadPage, csvImport, webForms] },
  { key: 'phone', label: 'Phone', type: 'Phone', note: 'Needs an email or a phone number. Used to spot duplicates.', where: [newLead, leadPage, csvImport, webForms] },
  { key: 'company', label: 'Company', type: 'Short text', note: 'Their business or organisation. A web form fills it only if the form has a field with the key "company".', where: [newLead, leadPage, csvImport, webForms] },
  { key: 'source', label: 'Source', type: 'Short text', note: 'Where the lead came from. Web forms set it to "Form: <form name>" for you.', where: [newLead, leadPage, csvImport, webForms] },
  { key: 'value', label: 'Value (₹)', type: 'Number', note: 'What the lead may be worth.', where: [newLead, leadPage, csvImport] },
  { key: 'owner', label: 'Owner', type: 'Dropdown (choose one)', note: 'The staff member handling the lead. Web-form leads get an owner from your assignment rules, if you have any.', where: [newLead, leadPage] },
  { key: 'stage', label: 'Stage', type: 'Dropdown (choose one)', note: 'The choices are your pipeline stages, edited in Pipeline stages above. They are the columns on the leads board and this dropdown. Web-form leads start in the first stage that is on.', where: [leadPage, board] },
  { key: 'status', label: 'Status', type: 'Open, won or lost', note: 'Set by the stage the lead is in.', where: [leadPage, board] },
  { key: 'tags', label: 'Tags', type: 'List of words', note: 'Free-form labels, separated by commas.', where: [leadPage] },
  { key: 'next_follow_up', label: 'Next follow-up', type: 'Date and time', note: 'Shows on the leads calendar.', where: [leadPage, calendar] },
  { key: 'created_at', label: 'Created', type: 'Date', note: 'Filled in automatically.', where: [leadPage] },
];
