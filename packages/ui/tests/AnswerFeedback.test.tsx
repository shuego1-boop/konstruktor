import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AnswerFeedback } from "../src/components/AnswerFeedback";

vi.mock("lottie-react", () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="lottie-mock" data-loop={String(props.loop)} />
  ),
}));

describe("AnswerFeedback", () => {
  it("renders correct feedback text", () => {
    render(<AnswerFeedback correct />);
    expect(screen.getByText("Correct!")).toBeInTheDocument();
  });

  it("renders incorrect feedback text", () => {
    render(<AnswerFeedback correct={false} />);
    expect(screen.getByText("Incorrect")).toBeInTheDocument();
  });

  it("renders with role alert", () => {
    render(<AnswerFeedback correct />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("applies className to alert container", () => {
    render(<AnswerFeedback correct className="feedback-x" />);
    expect(screen.getByRole("alert")).toHaveClass("feedback-x");
  });

  it("renders explanation when provided", () => {
    render(<AnswerFeedback correct explanation="Because math" />);
    expect(screen.getByText("Because math")).toBeInTheDocument();
  });
});
