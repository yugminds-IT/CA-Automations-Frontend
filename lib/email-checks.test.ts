import { describe, expect, it } from 'vitest'
import { badLink, checkEmail } from './email-checks'

describe('badLink', () => {
  it('accepts working and per-recipient links', () => {
    for (const ok of ['https://gst.gov.in', 'http://a.co/x?y=1', 'mailto:ca@firm.in', 'tel:+919999', '{{login_url}}']) expect(badLink(ok)).toBeNull()
  })
  it('flags links that will not work', () => {
    expect(badLink('')).toBe('empty link')
    expect(badLink('#')).toBe('empty link')
    expect(badLink('www.gst.gov.in')).toBe('missing https://')
    expect(badLink('https://localhost')).toBe('incomplete address')
    expect(badLink('mailto:nobody')).toBe('bad email address')
  })
})

describe('checkEmail', () => {
  const r = (email: string, client_name = '') => ({ email, variables: { client_name } })

  it('says nothing for a clean message', () => {
    expect(checkEmail({ subject: 'Hi {{client_name}}', body: '<a href="https://x.in">x</a>', recipients: [r('a@x.in', 'Asha')] })).toEqual([])
  })

  it('flags broken links, missing names and big pasted images', () => {
    const img = `<img src="data:image/png;base64,${'A'.repeat(400_000)}">`
    const out = checkEmail({
      subject: 'Hi',
      body: `Dear {{client_name}} <a href="www.x.in">x</a> ${img}`,
      recipients: [r('a@x.in', 'Asha'), r('ravi.k@x.in', 'ravi.k'), r('z@x.in')],
    })
    expect(out[0]).toContain('1 link looks broken')
    expect(out[1]).toContain('2 of 3 recipients have no name')
    expect(out[2]).toContain('pasted into the message is 293 KB')
    expect(out[3]).toContain('Gmail cuts off')
  })

  it('ignores names when the message does not use them', () => {
    expect(checkEmail({ subject: 'Notice', body: 'Hello', recipients: [r('z@x.in')] })).toEqual([])
  })
})
