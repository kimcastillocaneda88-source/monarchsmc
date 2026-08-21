import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderMarkdown } from "@/lib/markdown";

/**
 * The markdown renderer is a security boundary: editorial bodies are stored in
 * Firestore, and rendering them as HTML would turn a compromised editor account
 * into stored XSS. These tests assert that raw markup never becomes markup.
 */
describe("markdown rendering", () => {
  it("renders headings, lists and emphasis", () => {
    const { container } = render(
      <>{renderMarkdown("## Heading\n\nSome **bold** text.\n\n- one\n- two")}</>,
    );
    expect(screen.getByRole("heading", { name: "Heading" })).toBeInTheDocument();
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.querySelector("strong")?.textContent).toBe("bold");
  });

  it("does not execute or render raw HTML", () => {
    const { container } = render(
      <>{renderMarkdown('<script>alert(1)</script><img src=x onerror="alert(1)">')}</>,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    // The markup survives as literal text, which is exactly what we want.
    expect(container.textContent).toContain("<script>");
  });

  it("renders only safe link protocols", () => {
    const { container } = render(
      <>{renderMarkdown("[safe](https://example.com) and [relative](/rides)")}</>,
    );
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("https://example.com");
    expect(hrefs).toContain("/rides");
  });

  it("does not create a link for a javascript: URL", () => {
    // The inline pattern only matches http(s) and root-relative targets, so a
    // javascript: target is never recognised as a link at all.
    const { container } = render(<>{renderMarkdown("[click](javascript:alert(1))")}</>);
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toContain("click");
  });

  it("marks external links noopener noreferrer", () => {
    const { container } = render(<>{renderMarkdown("[x](https://example.com)")}</>);
    const link = container.querySelector("a");
    expect(link?.getAttribute("rel")).toContain("noopener");
    expect(link?.getAttribute("target")).toBe("_blank");
  });

  it("renders blockquotes and horizontal rules", () => {
    const { container } = render(<>{renderMarkdown("> a quote\n\n---\n\nafter")}</>);
    expect(container.querySelector("blockquote")?.textContent).toContain("a quote");
    expect(container.querySelector("hr")).not.toBeNull();
  });

  it("handles an empty body without throwing", () => {
    const { container } = render(<>{renderMarkdown("")}</>);
    expect(container).toBeTruthy();
  });
});
