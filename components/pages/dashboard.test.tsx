import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();
/** A calendar day in local time, like a follow-up date picked in the app */
const day = (offset: number) => {
  const d = new Date(Date.now() + offset * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const send = (id: number, status: string, offsetDays: number, to: string[]) => ({
  id, status, subject: `Email ${id}`, recipientEmails: to,
  scheduledAt: iso(Date.now() + offsetDays * DAY), sentAt: status === "pending" ? null : iso(Date.now() + offsetDays * DAY),
});

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/dashboard" }));
vi.mock("@/lib/realtime", () => ({ useRealtimeEvent: () => {} }));
vi.mock("@/components/dashboard/smtp-alert-banner", () => ({ SmtpAlertBanner: () => null }));
vi.mock("@/lib/api/index", () => ({
  getUserData: () => ({ name: "Asha Rao", role: "admin" }),
  getRoleFromUser: () => "admin",
  getOrganizationData: () => ({ industry: "financial_services" }),
}));
vi.mock("@/lib/api/mail-management", () => ({
  listSchedules: async () => [
    send(1, "sent", -1, ["a@example.com", "b@example.com"]),
    send(2, "failed", -2, ["c@example.com"]),
    send(3, "pending", 1, ["d@example.com"]),
    send(4, "sent", -40, ["old@example.com"]), // outside the 30 days
  ],
  listRecurringSchedules: async () => [],
  listDrafts: async () => [{ id: 9, title: "Half done", data: {}, updatedAt: iso(Date.now()) }],
}));
vi.mock("@/lib/api/clients", () => ({
  getClients: async () => ({
    clients: [
      { id: 1, name: "Overdue Co", email: "o@example.com", followupDate: day(-3) },
      { id: 2, name: "Today Co", email: "t@example.com", followupDate: day(0) },
      { id: 3, name: "Later Co", email: "l@example.com", followupDate: day(30) },
    ],
  }),
}));
vi.mock("@/lib/api/developer", () => ({ getFormSubmissions: async () => [{ id: 1 }, { id: 2 }] }));

import { Dashboard } from "./dashboard";

describe("Dashboard", () => {
  it("shows this month's numbers, what needs attention and follow-ups", async () => {
    render(<Dashboard />);
    // the most urgent thing leads; the counts sit underneath
    const glance = screen.getByRole("list", { name: "At a glance" });
    await within(glance).findByText("Failed this week");
    const count = (label: string) => within(glance).getByText(label).closest("a")!.textContent;
    expect(count("Delivered in 30 days")).toBe("2Delivered in 30 days"); // the 40-day-old send is left out
    expect(count("Scheduled")).toBe("1Scheduled");
    expect(count("Draft waiting")).toBe("1Draft waiting");
    expect(count("Clients")).toBe("3Clients");
    expect(count("New inquiries")).toBe("2New inquiries");
    expect(count("Failed this week")).toBe("1Failed this week"); // problems appear only when there are some
    expect(count("Overdue follow-up")).toBe("1Overdue follow-up");

    const follow = screen.getByRole("region", { name: "Follow-ups" });
    expect(within(follow).getByText("3d overdue")).toBeTruthy();
    expect(within(follow).getByText("Today")).toBeTruthy();
    expect(within(follow).queryByText("Later Co")).toBeNull();

    const coming = screen.getByRole("region", { name: "Up next" });
    expect(within(coming).getByRole("link", { name: /Email 3/ }).getAttribute("href")).toBe("/email-management/scheduled-mails?tab=scheduled&open=s3");
  });
});
