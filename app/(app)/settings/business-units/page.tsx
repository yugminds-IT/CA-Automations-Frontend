"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Building2, KeyRound, Mail, MapPin, Pencil, Plus, Power, Star, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/use-toast";
import { getMyAccess } from "@/lib/api/access";
import {
  BusinessUnit,
  CreateBusinessUnitInput,
  createBusinessUnit,
  listBusinessUnits,
  setDefaultBusinessUnit,
  updateBusinessUnit,
} from "@/lib/api/business-units";
import { OrgUnit, createOrgUnit, listOrgUnits, updateOrgUnit } from "@/lib/api/units";
import { ApiKeyItem, getApiKeys } from "@/lib/api/developer";
import { MailAccount, listMailAccounts } from "@/lib/api/mail-accounts";
import { UnitStructure, allowsManyBrands, allowsManyUnits, groupBrandsByUnit, normalizeStructure, structureTitle } from "@/lib/unit-structure";

// Same rules as the backend DTO. Checked here so the user sees the problem before submitting.
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** A brand being added or edited. unitId is the unit it sits in. */
type BrandForm = {
  id: number | null;
  unitId: number | null;
  name: string;
  businessProfileEnabled: boolean;
  legalName: string;
  gstin: string;
  pan: string;
  address: string;
  invoicePrefix: string;
};

const emptyBrand: BrandForm = {
  id: null,
  unitId: null,
  name: "",
  businessProfileEnabled: false,
  legalName: "",
  gstin: "",
  pan: "",
  address: "",
  invoicePrefix: "",
};

type UnitForm = { id: number | null; name: string; city: string };
const emptyUnit: UnitForm = { id: null, name: "", city: "" };

/** Business setup: the units (places) of a business and the brands inside each one. */
export default function BusinessSetupPage() {
  const { toast } = useToast();
  const [units, setUnits] = useState<OrgUnit[]>([]);
  const [brands, setBrands] = useState<BusinessUnit[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [mailAccounts, setMailAccounts] = useState<MailAccount[]>([]);
  const [structure, setStructure] = useState<UnitStructure>("multi_unit");
  // False for a single-brand layout. It has nothing to manage, so the page explains instead.
  const [adminPanel, setAdminPanel] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brandForm, setBrandForm] = useState<BrandForm>(emptyBrand);
  const [unitForm, setUnitForm] = useState<UnitForm>(emptyUnit);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const brandCardRef = useRef<HTMLDivElement>(null);
  const unitCardRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, b, keys, mail] = await Promise.all([
        listOrgUnits(),
        listBusinessUnits(),
        getApiKeys().catch(() => [] as ApiKeyItem[]),
        listMailAccounts().catch(() => [] as MailAccount[]),
      ]);
      setUnits(u);
      setBrands(b);
      setApiKeys(keys);
      setMailAccounts(mail);
    } catch (err: any) {
      toast({ title: "Could not load your setup", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    getMyAccess()
      .then((access) => {
        setAdminPanel(access.adminPanel !== false);
        setStructure(normalizeStructure(access.unitStructure));
      })
      .catch(() => setAdminPanel(true));
  }, [load]);

  const groups = useMemo(() => groupBrandsByUnit(units, brands), [units, brands]);
  const manyUnits = allowsManyUnits(structure);
  const manyBrands = allowsManyBrands(structure);
  const activeUnits = units.filter((u) => u.isActive);

  const setBrand = <K extends keyof BrandForm>(key: K, value: BrandForm[K]) =>
    setBrandForm((prev) => ({ ...prev, [key]: value }));

  const validateBrand = (): boolean => {
    const next: Record<string, string> = {};
    if (!brandForm.name.trim()) next.name = "Name is required";
    const gstin = brandForm.gstin.trim().toUpperCase();
    const pan = brandForm.pan.trim().toUpperCase();
    if (gstin && !GSTIN_RE.test(gstin)) next.gstin = "GSTIN format is invalid (15 characters)";
    if (pan && !PAN_RE.test(pan)) next.pan = "PAN format is invalid (10 characters)";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const startAddBrand = (unit: OrgUnit) => {
    setErrors({});
    setBrandForm({ ...emptyBrand, unitId: unit.id });
    brandCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const startEditBrand = (brand: BusinessUnit) => {
    setErrors({});
    setBrandForm({
      id: brand.id,
      unitId: brand.unitId ?? units.find((u) => u.isDefault)?.id ?? null,
      name: brand.name,
      businessProfileEnabled: brand.businessProfileEnabled,
      legalName: brand.legalName ?? "",
      gstin: brand.gstin ?? "",
      pan: brand.pan ?? "",
      address: brand.address ?? "",
      invoicePrefix: brand.invoicePrefix ?? "",
    });
    brandCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateBrand()) return;
    setSaving(true);

    // Empty optional fields are sent as null: on edit that clears the stored value. undefined would be
    // dropped from the JSON and the old GSTIN/PAN would silently stay.
    const payload: CreateBusinessUnitInput = {
      name: brandForm.name.trim(),
      ...(brandForm.unitId != null ? { unitId: brandForm.unitId } : {}),
      businessProfileEnabled: brandForm.businessProfileEnabled,
      legalName: brandForm.legalName.trim() || null,
      gstin: brandForm.gstin.trim().toUpperCase() || null,
      pan: brandForm.pan.trim().toUpperCase() || null,
      address: brandForm.address.trim() || null,
      invoicePrefix: brandForm.invoicePrefix.trim().toUpperCase() || null,
    };

    try {
      if (brandForm.id == null) {
        await createBusinessUnit(payload);
        toast({ title: "Brand added" });
      } else {
        await updateBusinessUnit(brandForm.id, payload);
        toast({ title: "Brand updated" });
      }
      setBrandForm(emptyBrand);
      await load();
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.name.trim()) {
      toast({ title: "Give the unit a name", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (unitForm.id == null) {
        await createOrgUnit({ name: unitForm.name.trim(), city: unitForm.city.trim() || undefined });
        toast({ title: "Unit added" });
      } else {
        await updateOrgUnit(unitForm.id, { name: unitForm.name.trim(), city: unitForm.city.trim() });
        toast({ title: "Unit updated" });
      }
      setUnitForm(emptyUnit);
      await load();
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDefault = async (brand: BusinessUnit) => {
    try {
      await setDefaultBusinessUnit(brand.id);
      toast({ title: `${brand.name} is now the default brand` });
      await load();
    } catch (err: any) {
      toast({ title: "Could not change default", description: err?.message, variant: "destructive" });
    }
  };

  const handleToggleBrand = async (brand: BusinessUnit) => {
    try {
      await updateBusinessUnit(brand.id, { isActive: !brand.isActive });
      toast({ title: brand.isActive ? `${brand.name} deactivated` : `${brand.name} activated` });
      await load();
    } catch (err: any) {
      toast({ title: "Could not update brand", description: err?.message, variant: "destructive" });
    }
  };

  const handleToggleUnit = async (unit: OrgUnit) => {
    try {
      await updateOrgUnit(unit.id, { isActive: !unit.isActive });
      toast({ title: unit.isActive ? `${unit.name} deactivated` : `${unit.name} activated` });
      await load();
    } catch (err: any) {
      toast({ title: "Could not update unit", description: err?.message, variant: "destructive" });
    }
  };

  const editingBrand = brandForm.id != null;
  const brandUnitName = units.find((u) => u.id === brandForm.unitId)?.name;

  if (!adminPanel) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <PageHeader title="Business setup" />
        <Card>
          <CardContent className="space-y-1 p-6 text-sm">
            <p className="font-medium">Your workspace is set up as: {structureTitle(structure)}.</p>
            <p className="text-muted-foreground">
              Every employee sees your data directly, so there are no units or brands to manage. To run several units
              or brands under one admin, contact support to change the setup.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-5">
      <PageHeader
        title="Business setup"
        description={
          <>
            {manyUnits
              ? "Add the units (places) your business runs from, then the brands inside each one."
              : "Add the brands your business runs. Each one has its own forms, leads and mail."}{" "}
            Add a business profile (GSTIN, PAN) only if a brand issues invoices.
            <span className="mt-1 block text-xs">Your setup: {structureTitle(structure)}</span>
          </>
        }
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        groups.map(({ unit, brands: inUnit }) => (
          <Card key={unit.id} className={unit.isActive ? "" : "opacity-70"}>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" /> {manyUnits ? unit.name : "Your brands"}
                  {manyUnits && unit.isDefault && <Badge>Default unit</Badge>}
                  {!unit.isActive && <Badge variant="secondary">Inactive</Badge>}
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                  {manyUnits && unit.city ? (
                    <>
                      <MapPin className="h-3 w-3" /> {unit.city} ·{" "}
                    </>
                  ) : null}
                  {inUnit.length} brand{inUnit.length === 1 ? "" : "s"}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {manyUnits && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setUnitForm({ id: unit.id, name: unit.name, city: unit.city ?? "" });
                      unitCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit unit
                  </Button>
                )}
                {manyUnits && !unit.isDefault && (
                  <Button size="sm" variant="ghost" onClick={() => handleToggleUnit(unit)}>
                    <Power className="mr-1 h-3.5 w-3.5" /> {unit.isActive ? "Deactivate" : "Activate"}
                  </Button>
                )}
                {manyBrands && unit.isActive && (
                  <Button size="sm" onClick={() => startAddBrand(unit)}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add brand
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {inUnit.length === 0 ? (
                <p className="text-sm text-muted-foreground">No brands in this unit yet.</p>
              ) : (
                <ul className="divide-y">
                  {inUnit.map((brand) => {
                    const brandKeys = apiKeys.filter((k) => k.isActive && k.businessUnitId === brand.id);
                    const brandSmtp = mailAccounts.find((m) => m.isActive && m.businessUnitId === brand.id);
                    return (
                    <li key={brand.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{brand.name}</span>
                          {brand.isDefault && <Badge>Default</Badge>}
                          {!brand.isActive && <Badge variant="secondary">Inactive</Badge>}
                          {brand.businessProfileEnabled && <Badge variant="outline">Invoices on</Badge>}
                          <Badge
                            variant="outline"
                            className={brandKeys.length > 0 ? "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400" : "text-muted-foreground"}
                          >
                            {brandKeys.length > 0 ? `${brandKeys.length} API key${brandKeys.length === 1 ? "" : "s"}` : "No API key"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={brandSmtp ? "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400" : "text-muted-foreground"}
                          >
                            {brandSmtp ? `SMTP: ${brandSmtp.fromEmail}` : "No SMTP"}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {brand.gstin ? `GSTIN ${brand.gstin}` : "No GSTIN"}
                          {brand.pan ? ` · PAN ${brand.pan}` : ""}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/developer/keys?brand=${brand.id}`}>
                            <KeyRound className="mr-1 h-3.5 w-3.5" /> API keys
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/settings/mail-accounts?brand=${brand.id}`}>
                            <Mail className="mr-1 h-3.5 w-3.5" /> SMTP
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startEditBrand(brand)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        {!brand.isDefault && brand.isActive && (
                          <Button size="sm" variant="outline" onClick={() => handleDefault(brand)}>
                            <Star className="mr-1 h-3.5 w-3.5" /> Make default
                          </Button>
                        )}
                        {!brand.isDefault && (
                          <Button size="sm" variant="ghost" onClick={() => handleToggleBrand(brand)}>
                            <Power className="mr-1 h-3.5 w-3.5" /> {brand.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        )}
                      </div>
                    </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {manyUnits && (
        <div ref={unitCardRef}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="h-4 w-4" /> {unitForm.id != null ? "Edit unit" : "Add a unit"}
              </CardTitle>
              <CardDescription>A unit is a place, like Shamshabad or Hyderabad. Brands go inside it.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveUnit} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="unit-name">Unit name</Label>
                  <Input
                    id="unit-name"
                    placeholder="e.g. Shamshabad"
                    value={unitForm.name}
                    onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unit-city">City (optional)</Label>
                  <Input
                    id="unit-city"
                    value={unitForm.city}
                    onChange={(e) => setUnitForm({ ...unitForm, city: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 md:col-span-2">
                  <Button type="submit" disabled={saving}>
                    {unitForm.id != null ? "Save unit" : "Create unit"}
                  </Button>
                  {unitForm.id != null && (
                    <Button type="button" variant="ghost" onClick={() => setUnitForm(emptyUnit)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <div ref={brandCardRef}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" />{" "}
              {editingBrand ? "Edit brand" : brandUnitName && manyUnits ? `Add a brand to ${brandUnitName}` : "Add a brand"}
            </CardTitle>
            <CardDescription>
              {manyUnits
                ? 'Choose "Add brand" on a unit above, or pick the unit here.'
                : "Each brand has its own forms, leads and mail."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveBrand} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="bu-name">Brand name</Label>
                <Input id="bu-name" placeholder="e.g. Rice mills" value={brandForm.name} onChange={(e) => setBrand("name", e.target.value)} />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              {activeUnits.length > 1 && (
                <div className="space-y-1.5">
                  <Label htmlFor="bu-unit">Unit</Label>
                  <select
                    id="bu-unit"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={brandForm.unitId ?? ""}
                    onChange={(e) => setBrand("unitId", e.target.value ? Number(e.target.value) : null)}
                  >
                    {!brandForm.unitId && <option value="">Default unit</option>}
                    {activeUnits.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  {editingBrand && <p className="text-[11px] text-muted-foreground">Moving a brand moves its leads, forms and mail with it.</p>}
                </div>
              )}
              <div className="flex items-end gap-2 pb-2">
                <input
                  id="bu-profile"
                  type="checkbox"
                  checked={brandForm.businessProfileEnabled}
                  onChange={(e) => setBrand("businessProfileEnabled", e.target.checked)}
                />
                <Label htmlFor="bu-profile">This brand issues GST invoices</Label>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bu-legal">Legal name</Label>
                <Input id="bu-legal" value={brandForm.legalName} onChange={(e) => setBrand("legalName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bu-prefix">Invoice prefix</Label>
                <Input
                  id="bu-prefix"
                  placeholder="e.g. TVR-RES"
                  value={brandForm.invoicePrefix}
                  onChange={(e) => setBrand("invoicePrefix", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bu-gstin">GSTIN</Label>
                <Input id="bu-gstin" value={brandForm.gstin} onChange={(e) => setBrand("gstin", e.target.value)} />
                {errors.gstin && <p className="text-xs text-destructive">{errors.gstin}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bu-pan">PAN</Label>
                <Input id="bu-pan" value={brandForm.pan} onChange={(e) => setBrand("pan", e.target.value)} />
                {errors.pan && <p className="text-xs text-destructive">{errors.pan}</p>}
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="bu-address">Address</Label>
                <Input id="bu-address" value={brandForm.address} onChange={(e) => setBrand("address", e.target.value)} />
              </div>
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={saving}>
                  {editingBrand ? "Save changes" : "Create brand"}
                </Button>
                {editingBrand && (
                  <Button type="button" variant="ghost" onClick={() => setBrandForm(emptyBrand)}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
