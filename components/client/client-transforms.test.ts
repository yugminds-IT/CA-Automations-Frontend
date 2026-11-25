import { describe, expect, it } from "vitest";
import {
  filterClients,
  formatDate,
  formatDirectories,
  transformApiClientToComponent,
  transformApiClientToFormValues,
  transformComponentToOnboardRequest,
  transformComponentToUpdateRequest,
  type Client,
  type NewClient,
} from "./client-transforms";
import type { Service } from "@/lib/api/types";

const services = [
  { id: 1, name: "GST Filing" },
  { id: 2, name: "TDS" },
] as Service[];

const newClient: NewClient = {
  name: "Asha Rao",
  email: "asha@example.com",
  phone: "",
  companyName: "Rao & Co",
  directories: ["GST Filing", "Unknown service"],
  onboardDate: new Date("2026-03-05T00:00:00Z"),
  followUpDate: "2026-04-01",
  notes: "VIP",
  directors: [
    { name: "  Ravi  ", email: " ravi@x.com ", phone: "", aadhar: "1234" },
    { name: "   " },
  ],
};

describe("transformComponentToOnboardRequest", () => {
  it("maps services to ids, dates to YYYY-MM-DD and trims directors", () => {
    const req = transformComponentToOnboardRequest(newClient, services, 7, 3);

    expect(req).toMatchObject({
      name: "Asha Rao",
      phone: undefined, // empty phone is not sent
      businessTypeId: 3,
      organizationId: 7,
      status: "active", // default
      serviceIds: [1], // unknown service names are dropped
      onboardDate: "2026-03-05",
      followupDate: "2026-04-01",
      additionalNotes: "VIP",
    });
    expect(req.directors).toEqual([{ directorName: "Ravi", email: "ravi@x.com", aadharNumber: "1234" }]);
  });

  it("omits serviceIds and directors when there are none", () => {
    const req = transformComponentToOnboardRequest(
      { ...newClient, directories: "—", directors: [] },
      services,
    );
    expect(req.serviceIds).toBeUndefined();
    expect(req).not.toHaveProperty("directors");
  });
});

describe("transformComponentToUpdateRequest", () => {
  it("always sends serviceIds and directors so they can be cleared", () => {
    const req = transformComponentToUpdateRequest({ ...newClient, directories: [], directors: [] }, services);
    expect(req.serviceIds).toEqual([]);
    expect(req.directors).toEqual([]);
    expect(req).not.toHaveProperty("organizationId");
  });

  it("does not default the status", () => {
    expect(transformComponentToUpdateRequest(newClient, services).status).toBeUndefined();
  });
});

describe("API → component", () => {
  const apiClient = {
    id: 9,
    name: "Asha",
    email: "a@x.com",
    companyName: "Rao & Co",
    services: [{ name: "GST Filing" }, { name: "" }],
    businessType: { id: 3, name: "LLP" },
    followupDate: "2026-04-01",
    onboardDate: "2026-03-05",
    status: "active",
    directors: [{ directorName: "Ravi", aadharNumber: "1234" }],
  } as any;

  it("reads camelCase fields and business type relations", () => {
    expect(transformApiClientToComponent(apiClient)).toMatchObject({
      id: 9,
      name: "Asha",
      phone: null,
      directories: ["GST Filing"],
      businessType: "LLP",
      lastContactedDate: null,
    });
  });

  it("falls back to snake_case fields and a plain business type string", () => {
    const c = transformApiClientToComponent({ id: 1, client_name: "Old", company_name: "OldCo", business_type: "Firm" } as any);
    expect(c).toMatchObject({ name: "Old", companyName: "OldCo", businessType: "Firm", directories: "—" });
  });

  it("builds form values with dates and directors", () => {
    const v = transformApiClientToFormValues(apiClient);
    expect(v.businessType).toBe("LLP");
    expect(v.onboardDate).toEqual(new Date("2026-03-05"));
    expect(v.followUpDate).toEqual(new Date("2026-04-01"));
    expect(v.directors?.[0]).toMatchObject({ name: "Ravi", aadhar: "1234", email: "" });
  });
});

describe("list helpers", () => {
  const clients = [
    { id: 1, name: "Asha", email: "a@x.com", phone: null, companyName: "Rao", directories: ["GST"], status: "Active" },
    { id: 2, name: "Bala", email: "b@x.com", phone: "999", companyName: "Kumar", directories: "TDS", status: "inactive" },
  ] as Client[];

  it("filters by status case-insensitively and by any searchable field", () => {
    expect(filterClients(clients, "", "active").map((c) => c.id)).toEqual([1]);
    expect(filterClients(clients, "tds", "all").map((c) => c.id)).toEqual([2]);
    expect(filterClients(clients, "999", "all").map((c) => c.id)).toEqual([2]);
    expect(filterClients(clients, "  ", "all")).toHaveLength(2);
  });

  it("formats dates and service lists with a dash for empty values", () => {
    expect(formatDate("2026-03-05T12:00:00Z")).toBe("Mar 5, 2026");
    expect(formatDate("not a date")).toBe("—");
    expect(formatDate(null)).toBe("—");
    expect(formatDirectories([])).toBe("—");
    expect(formatDirectories(["A", "B"])).toBe("A, B");
  });
});
