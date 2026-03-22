import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Dialog } from "../src/components/Dialog";

describe("Dialog", () => {
  it("renders nothing when closed", () => {
    render(
      <Dialog open={false} onClose={() => {}}>
        <p>Content</p>
      </Dialog>,
    );
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });

  it("renders children when open", () => {
    render(
      <Dialog open={true} onClose={() => {}}>
        <p>Modal content</p>
      </Dialog>,
    );
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("has role dialog", () => {
    render(
      <Dialog open={true} onClose={() => {}}>
        <p>Test</p>
      </Dialog>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <Dialog open={true} onClose={onClose}>
        <p>Test</p>
      </Dialog>,
    );
    const backdrop = screen.getByTestId("dialog-backdrop");
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <Dialog open={true} onClose={onClose}>
        <p>Test</p>
      </Dialog>,
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders title when provided", () => {
    render(
      <Dialog open={true} onClose={() => {}} title="Confirm action">
        <p>Are you sure?</p>
      </Dialog>,
    );
    expect(screen.getByText("Confirm action")).toBeInTheDocument();
  });

  it("has aria-modal attribute", () => {
    render(
      <Dialog open={true} onClose={() => {}}>
        <p>Test</p>
      </Dialog>,
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });

  it("has aria-labelledby when title provided", () => {
    render(
      <Dialog open={true} onClose={() => {}} title="My Title">
        <p>Test</p>
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-labelledby");
  });

  it("applies className to dialog panel", () => {
    render(
      <Dialog open={true} onClose={() => {}} className="max-w-lg">
        <p>Test</p>
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("max-w-lg");
  });
});
