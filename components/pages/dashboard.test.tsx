import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

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

// Like the server, a converted enquiry stops being "new", so a reload no longer lists it.
const { convert, converted } = vi.hoisted(() => {
  const converted = new Set<number>();
  return {
    converted,
    convert: vi.fn(async (id: number) => {
      converted.add(id);
      return { leadId: 55, duplicate: false };
    }),
  };
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
}));
vi.mock("@/lib/api/clients", () => ({
  getClients: async () => ({
    clients: [
      { id: 1, name: "Overdue Co", email: "o@example.com", followupDate: day(-3) },
      { id: 3, name: "Later Co", email: "l@example.com", followupDate: day(30) },
    ],
  }),
}));
vi.mock("@/lib/api/developer", () => ({
  getFormSubmissions: async () =>
    [
      { id: 1, senderName: "Ravi Kumar", senderEmail: "ravi@example.com", formName: "Bulk order", businessUnitId: 1, createdAt: iso(Date.now()) },
      { id: 2, senderName: "Meena", senderEmail: "meena@example.com", formName: "Contact", businessUnitId: 1, createdAt: iso(Date.now()) },
    ].filter((s) => !converted.has(s.id)),
  convertSubmissionToLead: convert,
}));
vi.mock("@/lib/api/leads", () => ({
  listLeads: async (p: { status?: string }) =>
    p.status === "open"
      ? { items: [], total: 7, page: 1, limit: 1 }
      : {
          items: [{ id: 21, name: "Priya Shah", email: "priya@example.com", company: "Shah Traders", source: "Form", status: "open", businessUnitId: 1, createdAt: iso(Date.now()), lastActivityAt: iso(Date.now()) }],
          total: 12, page: 1, limit: 8,
        },
  listOpenTasks: async () => [
    { id: 1, leadId: 21, title: "Call Priya", dueAt: iso(Date.now() - 2 * DAY), completedAt: null },
    { id: 2, leadId: 21, title: "Send quote", dueAt: iso(Date.now()), completedAt: null },
    { id: 3, leadId: 21, title: "Review contract", dueAt: iso(Date.now() + 30 * DAY), completedAt: null },
    { id: 4, leadId: 21, title: "Someday", dueAt: null, completedAt: null },
  ],
}));
vi.mock("@/lib/api/business-units", () => ({ listBusinessUnits: async () => [] }));
vi.mock("@/lib/api/reports", () => ({
  getStandardReport: async () => ({
    totals: { leads: 12, won: 1, lost: 1, open: 10, pipelineValue: 250000, wonValue: 0, winRate: 50 },
    byStage: [
      { key: 1, label: "New", values: { lead_count: 5 } },
      { key: 2, label: "Qualified", values: { lead_count: 3 } },
      { key: 3, label: "Empty stage", values: { lead_count: 0 } },
    ],
  }),
}));

import { Dashboard } from "./dashboard";

describe("Dashboard", () => {
  it("leads with enquiries, leads and tasks, then pipeline and email activity", async () => {
    render(<Dashboard />);
    const glance = screen.getByRole("list", { name: "At a glance" });
    await within(glance).findByText("Emails failed this week");
    const count = (label: string) => within(glance).getByText(label).closest("a")!.textContent;
    expect(count("New inquiries")).toBe("2New inquiries");
    expect(count("Open leads")).toBe("7Open leads");
    expect(count("Tasks due")).toBe("2Tasks due"); // overdue and today; the one 30 days away and the undated one are left out
    expect(count("Emails delivered, 30 days")).toBe("2Emails delivered, 30 days"); // the 40-day-old send is left out
    expect(count("Emails failed this week")).toBe("1Emails failed this week"); // problems appear only when there are some

    const inquiries = screen.getByRole("region", { name: "New inquiries" });
    expect(within(inquiries).getByText("Ravi Kumar")).toBeTruthy();
    expect(within(inquiries).getAllByRole("button", { name: /To lead/ })).toHaveLength(2);

    const tasks = screen.getByRole("region", { name: "Tasks due" });
    expect(within(tasks).getByText("Call Priya")).toBeTruthy();
    expect(within(tasks).getByText("2d overdue")).toBeTruthy();
    expect(within(tasks).getByText("Today")).toBeTruthy();
    expect(within(tasks).getByText("3d overdue")).toBeTruthy(); // the overdue client follow-up
    expect(within(tasks).queryByText("Review contract")).toBeNull();
    expect(within(tasks).queryByText("Later Co")).toBeNull();

    const leads = screen.getByRole("region", { name: "Recent leads" });
    expect(within(leads).getByText("Priya Shah")).toBeTruthy();

    const stages = screen.getByRole("region", { name: "Leads by stage" });
    expect(within(stages).getByText("New")).toBeTruthy();
    expect(within(stages).queryByText("Empty stage")).toBeNull();
    expect(within(stages).getByText(/Win rate 50%/)).toBeTruthy();

    const coming = screen.getByRole("region", { name: "Up next" });
    expect(within(coming).getByRole("link", { name: /Email 3/ }).getAttribute("href")).toBe("/email-management/scheduled-mails?tab=scheduled&open=s3");
  });

  it("turns an enquiry into a lead from the dashboard", async () => {
    render(<Dashboard />);
    const inquiries = await screen.findByRole("region", { name: "New inquiries" });
    const buttons = await within(inquiries).findAllByRole("button", { name: /To lead/ });
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(convert).toHaveBeenCalledWith(1));
    await waitFor(() => expect(within(inquiries).queryByText("Ravi Kumar")).toBeNull());
    expect(within(inquiries).getByText("Meena")).toBeTruthy();
  });
});
