import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProgressBar } from "../src/components/ProgressBar";

describe("ProgressBar", () => {
  it("renders progressbar role", () => {
    render(<ProgressBar value={0.7} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("sets aria-valuenow correctly", () => {
    render(<ProgressBar value={0.5} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
  });

  it("applies className to container", () => {
    const { container } = render(
      <ProgressBar value={0.1} className="progress-x" />,
    );
    expect(container.firstChild).toHaveClass("progress-x");
  });

  it("shows percentage when showPercent is true", () => {
    render(<ProgressBar value={0.75} showPercent />);
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("shows label when provided", () => {
    render(<ProgressBar value={0.5} label="Score" />);
    expect(screen.getByText("Score")).toBeInTheDocument();
  });

  it("shows both label and percentage when both provided", () => {
    render(<ProgressBar value={0.6} label="Progress" showPercent />);
    expect(screen.getByText("Progress")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("uses custom colorClass on the bar", () => {
    render(<ProgressBar value={0.5} colorClass="bg-red-400" />);
    const bar = screen.getByRole("progressbar");
    expect(bar.className).toContain("bg-red-400");
  });

  it("clamps value above 1 to 100%", () => {
    render(<ProgressBar value={1.5} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
  });

  it("clamps negative value to 0%", () => {
    render(<ProgressBar value={-0.5} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });
});
