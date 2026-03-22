import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ToastProvider, useToast } from "../src/components/Toast";

function TestComponent() {
  const { showToast } = useToast();
  return (
    <div>
      <button onClick={() => showToast("Saved!", "success")}>Success</button>
      <button onClick={() => showToast("Error!", "error")}>Error</button>
      <button onClick={() => showToast("Info")}>Info</button>
    </div>
  );
}

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing initially", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows toast on trigger", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Success"));
    expect(screen.getByText("Saved!")).toBeInTheDocument();
  });

  it("auto-dismisses after timeout", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Info"));
    expect(screen.getAllByText("Info")).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    // After timeout, only the button text "Info" remains (toast dismissed)
    expect(screen.getAllByText("Info")).toHaveLength(1);
  });

  it("renders success variant styling", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Success"));
    const toast = screen.getByText("Saved!").closest("[data-variant]");
    expect(toast).toHaveAttribute("data-variant", "success");
  });

  it("renders error variant styling", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Error"));
    const toast = screen.getByText("Error!").closest("[data-variant]");
    expect(toast).toHaveAttribute("data-variant", "error");
  });

  it("supports manual dismiss", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Success"));
    expect(screen.getByText("Saved!")).toBeInTheDocument();

    const dismissBtn = screen.getByLabelText("Dismiss");
    fireEvent.click(dismissBtn);
    // After dismiss, toast is removed from state (AnimatePresence may keep DOM briefly)
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("has aria-live region", () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Success"));
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("throws when useToast is used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow();
    spy.mockRestore();
  });
});
