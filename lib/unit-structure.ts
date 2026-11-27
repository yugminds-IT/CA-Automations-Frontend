// How a business is laid out. A "unit" is a place (a plant, an office, a city). A "brand" is a line of
// business inside a unit. Leads, forms and mail belong to a brand. Mirrors the backend rules in
// ca-backend-nest/src/organizations/unit-structure.ts.

export type UnitStructure = "multi_unit" | "one_unit_multi_brand" | "one_unit_one_brand" | "one_unit_no_brand";

export interface StructureOption {
  value: UnitStructure;
  title: string;
  description: string;
}

export const UNIT_STRUCTURE_OPTIONS: StructureOption[] = [
  {
    value: "multi_unit",
    title: "Multiple units, each with brands",
    description: "Shamshabad and Hyderabad, each with its own Rice mills and Flour mills.",
  },
  {
    value: "one_unit_multi_brand",
    title: "One unit, multiple brands",
    description: "A single place that runs several brands, such as Rice mills and Flour mills.",
  },
  {
    value: "one_unit_one_brand",
    title: "One unit, one brand",
    description: "A single place and a single brand. Everyone sees the data directly.",
  },
  {
    value: "one_unit_no_brand",
    title: "One unit, no brands",
    description: "A single place with nothing to split. Everyone sees the data directly.",
  },
];

const KNOWN: UnitStructure[] = UNIT_STRUCTURE_OPTIONS.map((o) => o.value);

/** Reads a stored value, treating anything unknown as the most open layout. */
export function normalizeStructure(value: unknown): UnitStructure {
  return KNOWN.includes(value as UnitStructure) ? (value as UnitStructure) : "multi_unit";
}

export const structureTitle = (s: UnitStructure) => UNIT_STRUCTURE_OPTIONS.find((o) => o.value === s)?.title ?? s;

/** Can this layout hold more than one unit? */
export const allowsManyUnits = (s: UnitStructure) => s === "multi_unit";

/** Can this layout hold more than one brand? When not, the unit and brand pages are hidden. */
export const allowsManyBrands = (s: UnitStructure) => s === "multi_unit" || s === "one_unit_multi_brand";

interface UnitLike {
  id: number;
  name: string;
  isDefault: boolean;
  isActive: boolean;
}
interface BrandLike {
  id: number;
  name: string;
  unitId?: number | null;
  isActive: boolean;
}

/** Brands grouped under their unit, default unit first. Brands with no unit fall under the default unit. */
export function groupBrandsByUnit<U extends UnitLike, B extends BrandLike>(
  units: U[],
  brands: B[],
): Array<{ unit: U; brands: B[] }> {
  const fallback = units.find((u) => u.isDefault)?.id ?? units[0]?.id;
  return [...units]
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name))
    .map((unit) => ({
      unit,
      brands: brands.filter((b) => (b.unitId ?? fallback) === unit.id),
    }));
}

/**
 * The name to show for a brand in a picker. With several units the same brand name can repeat
 * ("Rice mills" in two places), so it is prefixed with its unit: "Shamshabad · Rice mills".
 */
export function brandLabel(brand: BrandLike, units: UnitLike[]): string {
  const active = units.filter((u) => u.isActive);
  if (active.length <= 1) return brand.name;
  const fallback = units.find((u) => u.isDefault)?.id;
  const unit = units.find((u) => u.id === (brand.unitId ?? fallback));
  return unit ? `${unit.name} · ${brand.name}` : brand.name;
}

/** What a staff member is assigned to, in words. "All of Shamshabad", "Hyderabad · Rice mills". */
export function assignmentSummary(
  orgUnitIds: number[],
  brandIds: number[],
  units: UnitLike[],
  brands: BrandLike[],
): string {
  const parts: string[] = [];
  for (const id of orgUnitIds) {
    const unit = units.find((u) => u.id === id);
    parts.push(`All of ${unit?.name ?? `#${id}`}`);
  }
  const coveredUnits = new Set(orgUnitIds);
  const fallback = units.find((u) => u.isDefault)?.id;
  for (const id of brandIds) {
    const brand = brands.find((b) => b.id === id);
    // A brand inside a unit they already hold whole adds nothing to say.
    if (brand && coveredUnits.has(brand.unitId ?? fallback ?? -1)) continue;
    parts.push(brand ? brandLabel(brand, units) : `#${id}`);
  }
  return parts.length ? parts.join(", ") : "None";
}

/**
 * The name to show for a brand in a picker, from the brand list alone. When the brands span several
 * units the same name can repeat ("Rice mills" in two places), so it is prefixed with its unit.
 */
export function pickerLabel(brand: { name: string; unitId?: number | null; unitName?: string | null }, brands: Array<{ unitId?: number | null }>): string {
  const unitCount = new Set(brands.map((b) => b.unitId ?? null)).size;
  return unitCount > 1 && brand.unitName ? `${brand.unitName} · ${brand.name}` : brand.name;
}

/** The brands a picker should offer: deactivated ones are left out. */
export function activeBrands<T extends { isActive: boolean }>(brands: T[]): T[] {
  return brands.filter((b) => b.isActive);
}
