import { describe, expect, it } from "vitest"
import { toImportRow } from "./import-leads-dialog"
import { csvRecords } from "@/lib/csv"

describe("toImportRow", () => {
  it("maps common spreadsheet header names onto lead fields", () => {
    const [row] = csvRecords("Full Name,E-mail,Mobile,Organisation,Lead Source,Amount\nAsha,asha@example.com,98765 43210,Acme,Website,\"1,500\"").map(toImportRow)
    expect(row).toEqual({
      name: "Asha",
      email: "asha@example.com",
      phone: "98765 43210",
      company: "Acme",
      source: "Website",
      value: "1,500",
    })
  })

  it("leaves missing columns empty instead of failing", () => {
    const [row] = csvRecords("name\nRavi").map(toImportRow)
    expect(row).toEqual({ name: "Ravi", email: "", phone: "", company: "", source: "", value: "" })
  })
})
