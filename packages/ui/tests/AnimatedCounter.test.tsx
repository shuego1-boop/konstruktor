import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AnimatedCounter } from "../src/components/AnimatedCounter";

describe("AnimatedCounter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders initial value of 0", () => {
    render(<AnimatedCounter value={100} />);
    // Initially starts at 0 before animation kicks in
    expect(screen.getByText(/^0/)).toBeInTheDocument();
  });

  it("displays suffix", () => {
    render(<AnimatedCounter value={0} suffix="%" />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("displays prefix", () => {
    render(<AnimatedCounter value={0} prefix="+" />);
    expect(screen.getByText("+0")).toBeInTheDocument();
  });

  it("applies className", () => {
    const { container } = render(
      <AnimatedCounter value={50} className="score-text" />,
    );
    expect(container.firstChild).toHaveClass("score-text");
    expect(container.firstChild).toHaveClass("tabular-nums");
  });

  it("renders with decimal places", () => {
    render(<AnimatedCounter value={0} decimals={1} suffix="s" />);
    expect(screen.getByText("0.0s")).toBeInTheDocument();
  });
});
