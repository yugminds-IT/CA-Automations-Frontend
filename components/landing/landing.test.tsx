import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const submitContact = vi.fn();
vi.mock("@/lib/api/index", async () => {
  const { ApiError } = await import("@/lib/api/client");
  return { submitContact: (...a: unknown[]) => submitContact(...a), ApiError };
});

const toast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({ useToast: () => ({ toast }) }));

import ContactSection from "./ContactSection";
import FAQSection from "./FAQSection";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { ApiError } from "@/lib/api/client";

beforeEach(() => {
  push.mockReset();
  submitContact.mockReset();
  toast.mockReset();
});

async function fillContactForm() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("First name"), " Asha ");
  await user.type(screen.getByLabelText("Last name"), "Rao");
  await user.type(screen.getByLabelText("Email"), "asha@example.com");
  await user.type(screen.getByLabelText("Message"), "Need a demo");
  return user;
}

describe("ContactSection", () => {
  it("submits trimmed values, shows success and clears the form", async () => {
    submitContact.mockResolvedValue({ message: "Thanks" });
    render(<ContactSection />);
    const user = await fillContactForm();

    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() =>
      expect(submitContact).toHaveBeenCalledWith({
        firstName: "Asha",
        lastName: "Rao",
        email: "asha@example.com",
        company: undefined,
        message: "Need a demo",
      }),
    );
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "success", description: "Thanks" }));
    expect(screen.getByLabelText("First name")).toHaveValue("");
  });

  it("shows the server's error and keeps the form filled", async () => {
    submitContact.mockRejectedValue(new ApiError(400, "email must be an email"));
    render(<ContactSection />);
    const user = await fillContactForm();

    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "destructive", description: "email must be an email" }),
      ),
    );
    expect(screen.getByLabelText("Last name")).toHaveValue("Rao");
  });

  it("shows the corrected contact details", () => {
    render(<ContactSection />);
    expect(screen.getByText("+91 8885026092")).toBeInTheDocument();
    expect(screen.getByText(/Shyamlal Buildings, Begumpet,/)).toBeInTheDocument();
  });
});

describe("FAQSection", () => {
  it("opens an answer on click and keeps it open when the mouse leaves", async () => {
    const user = userEvent.setup();
    render(<FAQSection />);
    const question = screen.getByRole("button", { name: /7-day free trial work/i });

    await user.click(question);
    expect(question).toHaveAttribute("aria-expanded", "true");

    await user.unhover(question);
    expect(question).toHaveAttribute("aria-expanded", "true");
  });
});

describe("calls to action", () => {
  it("sends Start Free Trial to /signup", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    await user.click(screen.getByRole("button", { name: /open menu/i }));
    // Desktop and mobile buttons both render in jsdom (no CSS); both must go to /signup.
    const buttons = screen.getAllByRole("button", { name: "Start Free Trial" });
    expect(buttons).toHaveLength(2);
    for (const b of buttons) await user.click(b);

    expect(push.mock.calls).toEqual([["/signup"], ["/signup"]]);
  });

  it("footer has no dead links, the right phone number and the current year", () => {
    render(<Footer />);
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));

    expect(hrefs).not.toContain("#");
    expect(hrefs).not.toContain("/docs");
    expect(screen.getByText(/\+91 8885026092/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()}`))).toBeInTheDocument();
  });
});
