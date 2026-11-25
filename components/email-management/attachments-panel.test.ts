import { describe, expect, it } from 'vitest'
import { NO_ATTACHMENTS, attachmentIssues, filesFor } from './attachments-panel'
import { isEmptyDraft } from './send-mails-draft'

const f = (name: string, size = 1000) => ({ key: `mail-attachments/10/u/${name}`, name, size, contentType: 'application/pdf' })

describe('per-client attachments', () => {
  const state = {
    ...NO_ATTACHMENTS,
    perClient: [f('INV-1.pdf'), f('INV-2.pdf'), f('spare.pdf')],
    mapping: { 'a@x.in': ['inv-1.pdf'], 'b@x.in': ['INV-2.pdf', 'missing.pdf'] },
    mappingName: 'files.csv',
  }

  it('matches files by name, ignoring case, per recipient email', () => {
    expect(filesFor(state, 'A@x.in').map((x) => x.name)).toEqual(['INV-1.pdf'])
    expect(filesFor(state, 'b@x.in').map((x) => x.name)).toEqual(['INV-2.pdf'])
    expect(filesFor(state, 'c@x.in')).toEqual([])
  })

  it('reports missing files, recipients without a file and unused uploads', () => {
    const issues = attachmentIssues(state, ['a@x.in', 'b@x.in', 'c@x.in'])
    expect(issues).toEqual([
      '1 file named in the CSV is not uploaded: missing.pdf',
      '1 of 3 recipients has no file of their own and will get the email without one.',
      '1 uploaded client file is not matched to anyone being sent to.',
    ])
  })

  it('flags emails over 20 MB', () => {
    expect(attachmentIssues({ ...NO_ATTACHMENTS, shared: [f('a', 15e6), f('b', 6e6)] }, ['a@x.in'])[0]).toContain('over 20 MB')
  })
})

describe('draft', () => {
  const base = { audience: null, categories: [], services: [], pickedIds: [], customRecipients: '', cc: '', bcc: '', templateId: null, subject: '', body: 'Dear {{client_name}},<br><br>', sendValues: {}, attachments: NO_ATTACHMENTS }
  it('treats the untouched page as empty and anything typed or attached as worth keeping', () => {
    expect(isEmptyDraft(base)).toBe(true)
    expect(isEmptyDraft({ ...base, body: 'Dear {{client_name}},<br><br>Your GST is due' })).toBe(false)
    expect(isEmptyDraft({ ...base, attachments: { ...NO_ATTACHMENTS, shared: [f('x.pdf')] } })).toBe(false)
    expect(isEmptyDraft({ ...base, audience: 'all' })).toBe(false)
  })
})
