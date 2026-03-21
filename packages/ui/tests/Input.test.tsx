import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Input } from "../src/components/Input";

describe("Input", () => {
  it("renders input element", () => {
    render(<Input />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("accepts value and onChange", () => {
    const handleChange = vi.fn();
    render(<Input value="abc" onChange={handleChange} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("abc");
    fireEvent.change(input, { target: { value: "def" } });
    expect(handleChange).toHaveBeenCalled();
  });

  it("applies className to input element", () => {
    render(<Input className="input-x" />);
    expect(screen.getByRole("textbox")).toHaveClass("input-x");
  });

  it("renders label when provided", () => {
    render(<Input label="Username" />);
    expect(screen.getByText("Username")).toBeInTheDocument();
  });

  it("renders error message", () => {
    render(<Input error="Required" />);
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("renders hint when no error", () => {
    render(<Input hint="At least 8 characters" />);
    expect(screen.getByText("At least 8 characters")).toBeInTheDocument();
  });

  it("does not render hint when error is also set", () => {
    render(<Input error="Required" hint="At least 8 characters" />);
    expect(screen.queryByText("At least 8 characters")).not.toBeInTheDocument();
    expect(screen.getByText("Required")).toBeInTheDocument();
  });
});
