"use client";

import type { BusinessUnit } from "@/lib/api/business-units";
import type { OrgUnit } from "@/lib/api/units";
import { groupBrandsByUnit } from "@/lib/unit-structure";

interface Props {
  orgUnits: OrgUnit[];
  brands: BusinessUnit[];
  /** Brands picked one by one. */
  brandIds: number[];
  /** Whole units: every brand in them, including brands added later. */
  orgUnitIds: number[];
  onChange: (next: { brandIds: number[]; orgUnitIds: number[] }) => void;
}

/**
 * Who sees what: pick a whole unit (all its brands, now and later) or single brands inside a unit.
 * With one unit there is nothing to group, so it is a plain list of brands.
 */
export function UnitBrandPicker({ orgUnits, brands, brandIds, orgUnitIds, onChange }: Props) {
  const groups = groupBrandsByUnit(
    orgUnits.filter((u) => u.isActive),
    brands.filter((b) => b.isActive),
  );
  const grouped = groups.length > 1;

  const toggleBrand = (id: number) =>
    onChange({
      orgUnitIds,
      brandIds: brandIds.includes(id) ? brandIds.filter((b) => b !== id) : [...brandIds, id],
    });

  // Picking a whole unit replaces the single brands inside it.
  const toggleUnit = (unit: OrgUnit, inUnit: BusinessUnit[]) => {
    if (orgUnitIds.includes(unit.id)) {
      onChange({ brandIds, orgUnitIds: orgUnitIds.filter((u) => u !== unit.id) });
      return;
    }
    const inside = new Set(inUnit.map((b) => b.id));
    onChange({ brandIds: brandIds.filter((b) => !inside.has(b)), orgUnitIds: [...orgUnitIds, unit.id] });
  };

  const brandBox = (b: BusinessUnit, covered: boolean) => (
    <label key={b.id} className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${covered ? "opacity-60" : ""}`}>
      <input type="checkbox" checked={covered || brandIds.includes(b.id)} disabled={covered} onChange={() => toggleBrand(b.id)} />
      {b.name}
    </label>
  );

  if (!grouped) {
    return <div className="mt-1 flex flex-wrap gap-2">{groups[0]?.brands.map((b) => brandBox(b, false))}</div>;
  }

  return (
    <div className="mt-1 space-y-2">
      {groups.map(({ unit, brands: inUnit }) => {
        const whole = orgUnitIds.includes(unit.id);
        return (
          <div key={unit.id} className="rounded-md border p-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={whole} onChange={() => toggleUnit(unit, inUnit)} />
              All of {unit.name}
              <span className="text-[11px] font-normal text-muted-foreground">includes brands added later</span>
            </label>
            {inUnit.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 pl-6">{inUnit.map((b) => brandBox(b, whole))}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
