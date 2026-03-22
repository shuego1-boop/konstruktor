import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Skeleton } from "../src/components/Skeleton";

describe("Skeleton", () => {
  it("renders a div with pulse animation", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el.className).toContain("animate-pulse");
  });

  it("applies custom className", () => {
    const { container } = render(<Skeleton className="h-10 w-40" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass("h-10");
    expect(el).toHaveClass("w-40");
  });

  it("renders as a rounded rectangle by default", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("rounded");
  });

  it("supports circle variant", () => {
    const { container } = render(<Skeleton variant="circle" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("rounded-full");
  });

  it("supports text variant", () => {
    const { container } = render(<Skeleton variant="text" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("rounded");
    expect(el.className).toContain("h-4");
  });

  it("has aria-hidden for accessibility", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveAttribute("aria-hidden", "true");
  });

  it("renders multiple instances for count > 1", () => {
    const { container } = render(<Skeleton count={3} className="h-4" />);
    const children = container.querySelectorAll("[aria-hidden]");
    expect(children).toHaveLength(3);
  });
});
