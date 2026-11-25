import { describe, expect, it } from 'vitest'
import { isEdited, toPayload } from './message-composer'
import type { EmailTemplate } from '@/lib/api/types'

const tpl = { id: 5, name: 'GST', subject: 'Hi {{client_name}}', body: '<p>Due</p>', category: 'service', type: 'x' } as EmailTemplate

describe('message composer payload', () => {
  it('sends an untouched template by id', () => {
    const m = { template: tpl, subject: tpl.subject, body: tpl.body }
    expect(isEdited(m)).toBe(false)
    expect(toPayload(m)).toEqual({ templateId: 5 })
  })

  it('sends the edited text once the subject or message changes', () => {
    expect(toPayload({ template: tpl, subject: tpl.subject, body: '<p>Due today</p>' })).toEqual({ subject: tpl.subject, body: '<p>Due today</p>' })
    expect(isEdited({ template: tpl, subject: 'Other', body: tpl.body })).toBe(true)
  })

  it('sends a blank email as text', () => {
    expect(toPayload({ template: null, subject: ' Hello ', body: '<p>x</p>' })).toEqual({ subject: 'Hello', body: '<p>x</p>' })
  })
})
