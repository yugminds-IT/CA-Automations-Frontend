import { describe, expect, it } from "vitest";
import { telLink, toDialDigits, whatsappLink } from "./contact-links";

describe("toDialDigits", () => {
  it("adds India's code to ten-digit numbers", () => {
    expect(toDialDigits("98765 43210")).toBe("919876543210");
    expect(toDialDigits("098765-43210")).toBe("919876543210");
  });

  it("keeps numbers that already have a country code", () => {
    expect(toDialDigits("+44 20 7946 0958")).toBe("442079460958");
  });

  it("returns null for empty or implausible numbers", () => {
    expect(toDialDigits("")).toBeNull();
    expect(toDialDigits("12-34")).toBeNull();
  });
});

describe("links", () => {
  it("builds a tel link with a plus sign", () => {
    expect(telLink("9876543210")).toBe("tel:+919876543210");
  });

  it("builds a WhatsApp link with optional prefilled text", () => {
    expect(whatsappLink("9876543210")).toBe("https://wa.me/919876543210");
    expect(whatsappLink("9876543210", "Hi & welcome")).toBe("https://wa.me/919876543210?text=Hi%20%26%20welcome");
  });

  it("returns null when there is no usable number", () => {
    expect(telLink(null)).toBeNull();
    expect(whatsappLink("")).toBeNull();
  });
});
