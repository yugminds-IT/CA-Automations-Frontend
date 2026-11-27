import { describe, expect, it } from "vitest";
import {
  allowsManyBrands,
  allowsManyUnits,
  assignmentSummary,
  brandLabel,
  groupBrandsByUnit,
  normalizeStructure,
  pickerLabel,
} from "./unit-structure";

const units = [
  { id: 1, name: "Shamshabad", isDefault: true, isActive: true },
  { id: 2, name: "Hyderabad", isDefault: false, isActive: true },
];
const brands = [
  { id: 10, name: "Rice mills", unitId: 1, isActive: true },
  { id: 11, name: "Flour mills", unitId: 1, isActive: true },
  { id: 12, name: "Rice mills", unitId: 2, isActive: true },
  { id: 13, name: "Flour mills", unitId: 2, isActive: true },
];

describe("structure rules", () => {
  it("knows which layouts allow several units and brands", () => {
    expect(allowsManyUnits("multi_unit")).toBe(true);
    expect(allowsManyUnits("one_unit_multi_brand")).toBe(false);
    expect(allowsManyBrands("one_unit_multi_brand")).toBe(true);
    expect(allowsManyBrands("one_unit_one_brand")).toBe(false);
    expect(allowsManyBrands("one_unit_no_brand")).toBe(false);
  });

  it("treats anything unknown as the most open layout", () => {
    expect(normalizeStructure(undefined)).toBe("multi_unit");
    expect(normalizeStructure("junk")).toBe("multi_unit");
    expect(normalizeStructure("one_unit_no_brand")).toBe("one_unit_no_brand");
  });
});

describe("groupBrandsByUnit", () => {
  it("lists each unit with its own brands, default unit first", () => {
    const groups = groupBrandsByUnit([units[1], units[0]], brands);
    expect(groups.map((g) => g.unit.name)).toEqual(["Shamshabad", "Hyderabad"]);
    expect(groups[0].brands.map((b) => b.id)).toEqual([10, 11]);
    expect(groups[1].brands.map((b) => b.id)).toEqual([12, 13]);
  });

  it("puts a brand with no unit under the default unit", () => {
    const groups = groupBrandsByUnit(units, [{ id: 20, name: "Old brand", unitId: null, isActive: true }]);
    expect(groups[0].brands.map((b) => b.id)).toEqual([20]);
    expect(groups[1].brands).toEqual([]);
  });
});

describe("brandLabel", () => {
  it("prefixes the unit so repeated brand names stay distinct", () => {
    expect(brandLabel(brands[0], units)).toBe("Shamshabad · Rice mills");
    expect(brandLabel(brands[2], units)).toBe("Hyderabad · Rice mills");
  });

  it("shows the plain name when there is only one active unit", () => {
    expect(brandLabel(brands[0], [units[0]])).toBe("Rice mills");
    expect(brandLabel(brands[0], [units[0], { ...units[1], isActive: false }])).toBe("Rice mills");
  });
});

describe("assignmentSummary", () => {
  it("names whole units and single brands", () => {
    expect(assignmentSummary([1], [12], units, brands)).toBe("All of Shamshabad, Hyderabad · Rice mills");
  });

  it("skips a brand that a whole unit already covers", () => {
    expect(assignmentSummary([1], [10, 12], units, brands)).toBe("All of Shamshabad, Hyderabad · Rice mills");
  });

  it("says None when nothing is assigned", () => {
    expect(assignmentSummary([], [], units, brands)).toBe("None");
  });
});

describe("pickerLabel", () => {
  const list = [
    { name: "Rice mills", unitId: 1, unitName: "Shamshabad" },
    { name: "Rice mills", unitId: 2, unitName: "Hyderabad" },
  ];

  it("prefixes the unit when the brands span several units", () => {
    expect(pickerLabel(list[0], list)).toBe("Shamshabad · Rice mills");
    expect(pickerLabel(list[1], list)).toBe("Hyderabad · Rice mills");
  });

  it("shows the plain name when every brand is in one unit", () => {
    const one = [list[0], { name: "Flour mills", unitId: 1, unitName: "Shamshabad" }];
    expect(pickerLabel(one[0], one)).toBe("Rice mills");
  });

  it("falls back to the plain name when the unit name is unknown", () => {
    expect(pickerLabel({ name: "Old", unitId: null, unitName: null }, list)).toBe("Old");
  });
});
