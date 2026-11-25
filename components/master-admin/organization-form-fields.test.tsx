import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { OrganizationFormFields, type OrganizationFormValues } from "./organization-form-fields";

const values: OrganizationFormValues = { name: "ABC", city: "Pune", state: "", country: "", pincode: "" };

describe("OrganizationFormFields", () => {
  it("prefixes ids and marks the name required only when asked", () => {
    const { rerender } = render(<OrganizationFormFields values={values} onChange={() => {}} nameRequired />);
    expect(screen.getByLabelText("Organization Name *")).toHaveAttribute("id", "org-name");
    expect(screen.getByLabelText("City")).toHaveAttribute("id", "city");

    rerender(<OrganizationFormFields values={values} onChange={() => {}} idPrefix="edit-" />);
    expect(screen.getByLabelText("Organization Name")).toHaveAttribute("id", "edit-org-name");
    expect(screen.getByLabelText("Pincode")).toHaveAttribute("id", "edit-pincode");
  });

  it("reports the whole object with just the edited field changed", () => {
    const onChange = vi.fn();
    render(<OrganizationFormFields values={values} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("State"), { target: { value: "MH" } });

    expect(onChange).toHaveBeenCalledWith({ ...values, state: "MH" });
  });
});
