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

  it("keeps the generic custom industry instead of falling back to CA navigation", () => {
    expect(toIndustry("custom")).toBe("custom")
    const custom = pagesFor("custom")
    expect(custom.length).toBeGreaterThan(0)
    expect(custom.every((p) => !p.only || p.only.includes("custom"))).toBe(true)
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

describe("permission-driven navigation", () => {
  it("hides pages the user's permissions do not cover", () => {
    const readOnly = pagesFor("saas", "ORG_EMPLOYEE", ["leads.view"]).map((p) => p.id)
    expect(readOnly).toContain("leads")
    expect(readOnly).not.toContain("staff")
    expect(readOnly).not.toContain("keys")
    expect(readOnly).not.toContain("reports")
  })

  it("lists every page while permissions are still loading", () => {
    expect(pagesFor("saas", "ORG_ADMIN", null).some((p) => p.id === "staff")).toBe(true)
  })

  it("hides the brand pages for a single-branch organization, and only those", () => {
    const withPanel = pagesFor("saas", "ORG_ADMIN", null, true).map((p) => p.id)
    const noPanel = pagesFor("saas", "ORG_ADMIN", null, false).map((p) => p.id)
    expect(withPanel).toContain("business-units")
    expect(noPanel).not.toContain("business-units")
    expect(noPanel).toEqual(withPanel.filter((id) => id !== "business-units"))
  })

  it("shows the brand pages by default", () => {
    expect(pagesFor("saas", "ORG_ADMIN", null).some((p) => p.id === "business-units")).toBe(true)
  })

  it("groups pages into CRM, Engage, Automation, Developers and Settings", () => {
    const ids = pagesFor("financial_services", "ORG_ADMIN", null)
    expect(ids.find((p) => p.id === "forms")?.section).toBe("email")
    expect(ids.find((p) => p.id === "automation")?.section).toBe("automation")
    expect(ids.find((p) => p.id === "billing")?.section).toBe("bottom")
  })
})
