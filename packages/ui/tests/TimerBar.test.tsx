import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TimerBar } from "../src/components/TimerBar";

describe("TimerBar", () => {
  it("renders progressbar", () => {
    render(<TimerBar elapsedMs={0} durationMs={10000} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("shows remaining time in seconds", () => {
    render(<TimerBar elapsedMs={0} durationMs={10000} />);
    expect(screen.getByText("10s")).toBeInTheDocument();
  });

  it("applies className to container", () => {
    const { container } = render(
      <TimerBar elapsedMs={0} durationMs={5000} className="timer-x" />,
    );
    expect(container.firstChild).toHaveClass("timer-x");
  });

  it("uses green color when remaining > 50%", () => {
    render(<TimerBar elapsedMs={2000} durationMs={10000} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.className).toContain("bg-green-500");
  });

  it("uses yellow color when remaining between 25% and 50%", () => {
    // elapsed = 6000ms of 10000ms → remaining = 40%
    render(<TimerBar elapsedMs={6000} durationMs={10000} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.className).toContain("bg-yellow-500");
  });

  it("uses red color when remaining <= 25%", () => {
    // elapsed = 8000ms of 10000ms → remaining = 20%
    render(<TimerBar elapsedMs={8000} durationMs={10000} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.className).toContain("bg-red-500");
  });

  it("handles durationMs of zero gracefully", () => {
    render(<TimerBar elapsedMs={0} durationMs={0} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
    expect(screen.getByText("0s")).toBeInTheDocument();
  });

  it("clamps displaySeconds to 0 when elapsed exceeds duration", () => {
    render(<TimerBar elapsedMs={15000} durationMs={10000} />);
    expect(screen.getByText("0s")).toBeInTheDocument();
  });
});
