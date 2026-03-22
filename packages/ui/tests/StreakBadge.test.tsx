import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { StreakBadge } from "../src/components/StreakBadge";

vi.mock("lottie-react", () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="lottie-mock" data-loop={String(props.loop)} />
  ),
}));

describe("StreakBadge", () => {
  it("renders streak count with x suffix", () => {
    render(<StreakBadge streak={3} />);
    expect(screen.getByText("3x")).toBeInTheDocument();
  });

  it("returns null for streak < 2", () => {
    const { container } = render(<StreakBadge streak={1} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null for streak 0", () => {
    const { container } = render(<StreakBadge streak={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("applies className to container", () => {
    const { container } = render(
      <StreakBadge streak={3} className="streak-x" />,
    );
    expect(container.firstChild).toHaveClass("streak-x");
  });

  it("shows STREAK label for streak 2–4", () => {
    render(<StreakBadge streak={2} />);
    expect(screen.getByText("STREAK")).toBeInTheDocument();
  });

  it("shows ON FIRE label for streak 5–9", () => {
    render(<StreakBadge streak={5} />);
    expect(screen.getByText("ON FIRE")).toBeInTheDocument();
  });

  it("shows LEGENDARY label for streak >= 10", () => {
    render(<StreakBadge streak={10} />);
    expect(screen.getByText("LEGENDARY")).toBeInTheDocument();
  });

  it("shows LEGENDARY for streak > 10", () => {
    render(<StreakBadge streak={15} />);
    expect(screen.getByText("LEGENDARY")).toBeInTheDocument();
    expect(screen.getByText("15x")).toBeInTheDocument();
  });
});
