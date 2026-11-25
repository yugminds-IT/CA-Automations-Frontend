import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import PricingCards, { usePricingPlans } from "./PricingCards";
import { DEFAULT_PRICING_PLANS, getPublicPricingPlans, type PricingPlan } from "@/lib/api/pricing-plans";
import { formToInput, planToForm } from "@/components/master-admin/pricing-plan-form";

const plan = (over: Partial<PricingPlan> = {}): PricingPlan => ({
  ...DEFAULT_PRICING_PLANS[1],
  id: 1,
  ...over,
});

afterEach(() => vi.unstubAllGlobals());

describe("PricingCards", () => {
  it("renders each plan with its price, features and button link", () => {
    render(
      <PricingCards
        plans={[
          plan({ name: "Starter", price: "₹199", buttonText: "Go", buttonLink: "/signup", features: ["One", "Two"] }),
        ]}
      />,
    );
    expect(screen.getByText("Starter")).toBeInTheDocument();
    expect(screen.getByText("₹199")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go" })).toHaveAttribute("href", "/signup");
  });

  it("shows the badge on top for a featured plan and as a pill otherwise", () => {
    render(<PricingCards plans={[plan({ id: 1, name: "A", isHighlighted: true, badge: "Most Popular" }), plan({ id: 2, name: "B", badge: "Coming Soon", trialText: null })]} />);
    expect(screen.getByText("Most Popular")).toBeInTheDocument();
    expect(screen.getByText("Coming Soon")).toBeInTheDocument();
  });

  it("renders a placeholder while loading", () => {
    const { container } = render(<PricingCards plans={null} />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });
});

describe("getPublicPricingPlans", () => {
  it("falls back to the default plans when the API is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(getPublicPricingPlans()).resolves.toBe(DEFAULT_PRICING_PLANS);
  });

  it("returns what the API sends, even an empty list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } })),
    );
    await expect(getPublicPricingPlans()).resolves.toEqual([]);
  });
});

describe("usePricingPlans", () => {
  function Probe() {
    const plans = usePricingPlans();
    return <span>{plans === null ? "loading" : plans.map((p) => p.name).join(",")}</span>;
  }

  it("loads plans from the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([plan({ name: "Solo" })]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    render(<Probe />);
    expect(screen.getByText("loading")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Solo")).toBeInTheDocument());
  });
});

describe("pricing plan form", () => {
  it("round-trips a plan and cleans up input", () => {
    const form = planToForm(plan({ badge: null, features: ["A", "B"] }));
    expect(form.badge).toBe("");
    expect(form.features).toBe("A\nB");

    const input = formToInput({ ...form, badge: "  ", trialText: " 7 days ", features: " A \n\n B \n", sortOrder: NaN });
    expect(input).toMatchObject({ badge: null, trialText: "7 days", features: ["A", "B"], sortOrder: 0 });
  });
});
