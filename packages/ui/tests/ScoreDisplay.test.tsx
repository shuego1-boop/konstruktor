import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ScoreDisplay } from "../src/components/ScoreDisplay";

describe("ScoreDisplay", () => {
  it("renders percentage", () => {
    render(<ScoreDisplay points={5} maxPoints={10} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("renders points text", () => {
    render(<ScoreDisplay points={7} maxPoints={10} />);
    const el = screen.getByText(/7.*10 pts/i);
    expect(el).toBeInTheDocument();
  });

  it("applies className to container", () => {
    const { container } = render(
      <ScoreDisplay points={1} maxPoints={2} className="score-x" />,
    );
    expect(container.firstChild).toHaveClass("score-x");
  });

  it("uses provided percentage override", () => {
    render(<ScoreDisplay points={0} maxPoints={10} percentage={80} />);
    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("shows green color for pct >= 70", () => {
    const { container } = render(<ScoreDisplay points={7} maxPoints={10} />);
    expect(container.querySelector(".text-green-600")).toBeTruthy();
  });

  it("shows yellow color for pct between 50 and 69", () => {
    // 6/10 = 60%
    const { container } = render(<ScoreDisplay points={6} maxPoints={10} />);
    expect(container.querySelector(".text-yellow-600")).toBeTruthy();
  });

  it("shows red color for pct < 50", () => {
    // 4/10 = 40%
    const { container } = render(<ScoreDisplay points={4} maxPoints={10} />);
    expect(container.querySelector(".text-red-600")).toBeTruthy();
  });

  it("renders 0% when maxPoints is 0", () => {
    render(<ScoreDisplay points={0} maxPoints={0} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("renders sm size variant", () => {
    const { container } = render(
      <ScoreDisplay points={5} maxPoints={10} size="sm" />,
    );
    expect(container.querySelector(".text-2xl")).toBeTruthy();
  });

  it("renders lg size variant", () => {
    const { container } = render(
      <ScoreDisplay points={5} maxPoints={10} size="lg" />,
    );
    expect(container.querySelector(".text-6xl")).toBeTruthy();
  });
});
