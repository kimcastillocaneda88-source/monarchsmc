import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox, FormMessage, Select, SpamTrap, TextArea, TextInput } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SmartImage } from "@/components/ui/SmartImage";
import { Avatar } from "@/components/ui/Avatar";

describe("form fields", () => {
  it("binds a label to its control and exposes hints and errors", () => {
    render(<TextInput id="email" label="Email" hint="We never share it." error="Enter a valid email." />);

    const input = screen.getByLabelText(/Email/);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");

    const describedBy = input.getAttribute("aria-describedby") ?? "";
    expect(describedBy).toContain("email-error");
    expect(describedBy).toContain("email-hint");

    expect(screen.getByText("Enter a valid email.")).toBeInTheDocument();
    expect(screen.getByText("We never share it.")).toBeInTheDocument();
  });

  it("does not mark a healthy field invalid", () => {
    render(<TextInput id="name" label="Name" />);
    expect(screen.getByLabelText(/Name/)).not.toHaveAttribute("aria-invalid");
  });

  it("marks optional fields so the requirement is never guessed from an asterisk alone", () => {
    render(<TextInput id="nickname" label="Road name" />);
    expect(screen.getByText("(optional)")).toBeInTheDocument();
  });

  it("names a textarea after its id when no name is given", () => {
    render(<TextArea id="bio" label="About you" />);
    expect(screen.getByLabelText(/About you/)).toHaveAttribute("name", "bio");
  });

  it("renders a select with a placeholder and options", async () => {
    render(
      <Select
        id="category"
        label="Category"
        placeholder="Select…"
        options={[
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ]}
      />,
    );
    const select = screen.getByLabelText(/Category/);
    expect(within(select).getAllByRole("option")).toHaveLength(3);
  });

  it("toggles a checkbox with the keyboard", async () => {
    const user = userEvent.setup();
    render(<Checkbox id="consent" label="I agree" />);
    const box = screen.getByLabelText("I agree");
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(box).toBeChecked();
  });
});

describe("form feedback", () => {
  it("announces errors assertively and successes politely", () => {
    const { rerender } = render(
      <FormMessage tone="error" title="Not sent">
        Something failed.
      </FormMessage>,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");

    rerender(
      <FormMessage tone="success" title="Sent">
        All good.
      </FormMessage>,
    );
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("hides the honeypot from assistive technology and keyboard users", () => {
    const { container } = render(<SpamTrap />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector('input[name="website"]')).toHaveAttribute("tabindex", "-1");
  });
});

describe("status indicators", () => {
  it("carries meaning in text, not colour alone", () => {
    render(<Badge tone="danger">Cancelled</Badge>);
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });
});

describe("states", () => {
  it("renders an empty state with an optional action", () => {
    render(<EmptyState title="No rides" description="Nothing scheduled." action={<button>Add</button>} />);
    expect(screen.getByRole("heading", { name: "No rides" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("renders an error state as an alert without provider detail", () => {
    render(<ErrorState />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).not.toMatch(/firebase|firestore|permission-denied/i);
  });
});

describe("data table", () => {
  interface Row {
    id: string;
    name: string;
  }
  const columns: Array<Column<Row>> = [
    { key: "name", header: "Name", render: (row) => row.name },
  ];

  it("renders a captioned table with headers on desktop", () => {
    render(
      <DataTable
        caption="All members"
        columns={columns}
        rows={[{ id: "1", name: "A Rider" }]}
        rowKey={(row) => row.id}
      />,
    );
    expect(screen.getByRole("table", { name: "All members" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
  });

  it("shows the empty slot instead of an empty table", () => {
    render(
      <DataTable
        caption="All members"
        columns={columns}
        rows={[]}
        rowKey={(row) => row.id}
        empty={<EmptyState title="Nothing here" />}
      />,
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeInTheDocument();
  });
});

describe("images", () => {
  it("falls back to a placeholder rather than a broken image", () => {
    const { container } = render(<SmartImage src={null} alt="A ride" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".u-hatch")).not.toBeNull();
  });

  it("refuses to render an image from an unconfigured host", () => {
    const { container } = render(<SmartImage src="https://evil.example/x.jpg" alt="A ride" />);
    expect(container.querySelector("img")).toBeNull();
  });

  it("keeps placeholder labels out of the public site by default", () => {
    render(<SmartImage src={null} alt="" label="Upload the hero photograph" />);
    expect(screen.queryByText("Upload the hero photograph")).not.toBeInTheDocument();
  });

  it("shows the placeholder label when an admin surface asks for it", () => {
    render(<SmartImage src={null} alt="" label="Upload the hero photograph" showLabel />);
    expect(screen.getByText("Upload the hero photograph")).toBeInTheDocument();
  });

  it("serves member photographs through the authorising route", () => {
    const { container } = render(<Avatar uid="abc" name="A Rider" hasPhoto />);
    expect(container.querySelector("img")).toHaveAttribute("src", "/api/media/member/abc");
  });

  it("shows initials when a member has no photograph", () => {
    render(<Avatar uid="abc" name="Sam Whitfield" hasPhoto={false} />);
    expect(screen.getByText("SW")).toBeInTheDocument();
  });
});
