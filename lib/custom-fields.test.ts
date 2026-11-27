import { describe, expect, it } from "vitest"
import { changedValues, convertibleTypes, groupBySection, isBlank, isFieldShown, keyFromLabel } from "./custom-fields"
import { BUILT_IN_LEAD_FIELDS } from "./lead-built-in-fields"
import type { CustomField } from "./api/custom-fields"

const field = (partial: Partial<CustomField> & { key: string }): CustomField =>
  ({
    id: 1,
    organizationId: 1,
    businessUnitId: 1,
    label: partial.key,
    fieldType: "text",
    options: [],
    required: false,
    position: 0,
    section: "Details",
    helpText: null,
    showIfKey: null,
    showIfValue: null,
    visibleToRoles: [],
    editableByRoles: [],
    isActive: true,
    canSee: true,
    canEdit: true,
    ...partial,
  }) as CustomField

describe("keyFromLabel", () => {
  it("produces keys the server accepts", () => {
    expect(keyFromLabel("Trip date (Dec)")).toBe("trip_date_dec")
    expect(keyFromLabel("Café")).toBe("cafe")
    expect(keyFromLabel("2024 budget")).toBe("v_2024_budget")
    expect(keyFromLabel("???")).toBe("field")
  })
})

describe("isFieldShown", () => {
  it("shows unconditional fields and matches the controlling value", () => {
    expect(isFieldShown(field({ key: "a" }), {})).toBe(true)
    const dependent = field({ key: "b", showIfKey: "trip", showIfValue: "Yes" })
    expect(isFieldShown(dependent, { trip: "Yes" })).toBe(true)
    expect(isFieldShown(dependent, { trip: "No" })).toBe(false)
    expect(isFieldShown(dependent, {})).toBe(false)
  })

  it("matches a multiselect that contains the value, and a boolean", () => {
    expect(isFieldShown(field({ key: "b", showIfKey: "m", showIfValue: "Hotel" }), { m: ["Flight", "Hotel"] })).toBe(true)
    expect(isFieldShown(field({ key: "b", showIfKey: "ok", showIfValue: "true" }), { ok: true })).toBe(true)
  })
})

describe("isBlank", () => {
  it("treats null, undefined, whitespace and empty arrays as blank", () => {
    expect(isBlank(null)).toBe(true)
    expect(isBlank("  ")).toBe(true)
    expect(isBlank([])).toBe(true)
    expect(isBlank(false)).toBe(false)
    expect(isBlank(0)).toBe(false)
  })
})

describe("changedValues", () => {
  it("returns only keys whose value differs, with empty strings for cleared fields", () => {
    const original = { a: "1", b: "x", c: ["Hotel"] }
    const draft = { a: "1", b: "", c: ["Hotel"], d: "new" }
    expect(changedValues(original, draft)).toEqual({ b: "", d: "new" })
  })
})

describe("groupBySection", () => {
  it("groups by section in layout order", () => {
    const groups = groupBySection([
      field({ key: "z", position: 2, section: "Travel" }),
      field({ key: "a", position: 0, section: "Details" }),
      field({ key: "b", position: 1, section: "Travel" }),
    ])
    expect(groups.map((g) => g.section)).toEqual(["Details", "Travel"])
    expect(groups[1].fields.map((f) => f.key)).toEqual(["b", "z"])
  })
})

describe("convertibleTypes", () => {
  it("lets text and long text swap, and dropdown and radio swap", () => {
    expect([...convertibleTypes("text")].sort()).toEqual(["text", "textarea"])
    expect([...convertibleTypes("select")].sort()).toEqual(["radio", "select"])
    expect([...convertibleTypes("radio")].sort()).toEqual(["radio", "select"])
  })

  it("keeps every other type fixed, matching the server", () => {
    expect(convertibleTypes("number")).toEqual(["number"])
    expect(convertibleTypes("multiselect")).toEqual(["multiselect"])
    expect(convertibleTypes("boolean")).toEqual(["boolean"])
  })
})

describe("built-in lead fields", () => {
  it("lists each field once, with the required name first", () => {
    const keys = BUILT_IN_LEAD_FIELDS.map((f) => f.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(BUILT_IN_LEAD_FIELDS[0]).toMatchObject({ key: "name", required: true })
  })
})
