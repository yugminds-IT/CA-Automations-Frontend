import { describe, expect, it } from 'vitest'
import { csvRecords, parseCsv, toCsv } from './csv'

describe('csv', () => {
  it('reads quoted cells, escaped quotes, commas, CRLF and the Excel BOM', () => {
    expect(parseCsv('﻿email,file\r\n"a@x.in","Inv, ""Mar"".pdf"\r\nb@x.in,b.pdf\r\n\r\n')).toEqual([
      ['email', 'file'],
      ['a@x.in', 'Inv, "Mar".pdf'],
      ['b@x.in', 'b.pdf'],
    ])
  })

  it('keys rows by lower-cased header', () => {
    expect(csvRecords(' Email , File\nA@x.in, a.pdf')).toEqual([{ email: 'A@x.in', file: 'a.pdf' }])
  })

  it('round-trips through toCsv', () => {
    const rows = [['email', 'file'], ['a@x.in', 'x, "y".pdf']]
    expect(parseCsv(toCsv(rows))).toEqual(rows)
  })
})
