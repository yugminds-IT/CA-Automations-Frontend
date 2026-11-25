import { describe, expect, it } from "vitest"
import { activePageId, pagesFor, toIndustry } from "./nav"

describe("sidebar pages", () => {
  it("swaps the word for clients and hides pages an industry doesn't use", () => {
    const edu = pagesFor("education")
    expect(edu.find((p) => p.id === "clients")?.label).toBe("Students")
    expect(edu.some((p) => p.section === "developers")).toBe(false)
    expect(pagesFor("financial_services").find((p) => p.id === "clients")?.label).toBe("Clients")
  })

  it("maps old and unknown industries", () => {
    expect(toIndustry("school")).toBe("education")
    expect(toIndustry(undefined)).toBe("financial_services")
  })

  it("gives clients only their uploads", () => {
    expect(pagesFor("saas", "CLIENT").map((p) => p.id)).toEqual(["uploads"])
  })

  it("picks the closest page for a sub-route, not a shorter one", () => {
    const pages = pagesFor("financial_services")
    expect(activePageId(pages, "/settings/domains")).toBe("domains")
    expect(activePageId(pages, "/settings")).toBe("settings")
    expect(activePageId(pages, "/client-management/12")).toBe("clients")
    expect(activePageId(pages, "/nowhere")).toBeNull()
  })
})
