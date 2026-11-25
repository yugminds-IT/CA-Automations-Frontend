import { describe, expect, it } from "vitest";
import { clientOnboardSchema } from "./client-onboard-schema";

const valid = { name: "Asha Rao", email: "asha@example.com", businessType: "LLP" };

function errorsFor(input: object) {
  const r = clientOnboardSchema.safeParse(input);
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path.join("."), i.message]));
}

describe("clientOnboardSchema", () => {
  it("accepts the minimum required fields and defaults lists", () => {
    const r = clientOnboardSchema.parse(valid);
    expect(r.directories).toEqual([]);
    expect(r.directors).toEqual([]);
  });

  it("requires a name, a valid email and a business type", () => {
    expect(errorsFor({ name: "A", email: "nope", businessType: "" })).toEqual({
      name: "Name must be at least 2 characters",
      email: "Please enter a valid email address",
      businessType: "Please select an option",
    });
  });

  it("allows an empty phone but rejects a short one", () => {
    expect(errorsFor({ ...valid, phone: "" })).toEqual({});
    expect(errorsFor({ ...valid, phone: "12345" })).toHaveProperty("phone");
    expect(errorsFor({ ...valid, phone: "9876543210" })).toEqual({});
  });

  it("requires a 6-digit pincode when one is given", () => {
    expect(errorsFor({ ...valid, pincode: "" })).toEqual({});
    expect(errorsFor({ ...valid, pincode: "50001" })).toEqual({ pincode: "Pincode must be 6 digits" });
    expect(errorsFor({ ...valid, pincode: "500016" })).toEqual({});
  });

  it("validates each director", () => {
    expect(errorsFor({ ...valid, directors: [{ name: "R", email: "bad" }] })).toEqual({
      "directors.0.name": "Name must be at least 2 characters",
      "directors.0.email": "Please enter a valid email address",
    });
    expect(errorsFor({ ...valid, directors: [{ name: "Ravi", email: "" }] })).toEqual({});
  });
});
