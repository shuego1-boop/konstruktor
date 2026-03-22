import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LottieIcon } from "../src/components/LottieIcon";

// Mock lottie-react to avoid canvas/animation issues in test environment
vi.mock("lottie-react", () => ({
  default: (props: Record<string, unknown>) => (
    <div
      data-testid="lottie-mock"
      data-loop={String(props.loop)}
      data-autoplay={String(props.autoplay)}
    />
  ),
}));

describe("LottieIcon", () => {
  it("renders with default size", () => {
    const { container } = render(<LottieIcon name="checkmark" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe("64px");
    expect(wrapper.style.height).toBe("64px");
  });

  it("renders with custom size", () => {
    const { container } = render(<LottieIcon name="trophy" size={100} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe("100px");
    expect(wrapper.style.height).toBe("100px");
  });

  it("passes loop prop to Lottie", () => {
    render(<LottieIcon name="fire" loop />);
    const lottie = screen.getByTestId("lottie-mock");
    expect(lottie.dataset.loop).toBe("true");
  });

  it("does not loop by default", () => {
    render(<LottieIcon name="checkmark" />);
    const lottie = screen.getByTestId("lottie-mock");
    expect(lottie.dataset.loop).toBe("false");
  });

  it("autoplays by default", () => {
    render(<LottieIcon name="stars" />);
    const lottie = screen.getByTestId("lottie-mock");
    expect(lottie.dataset.autoplay).toBe("true");
  });

  it("applies className", () => {
    const { container } = render(
      <LottieIcon name="cross" className="my-class" />,
    );
    expect(container.firstChild).toHaveClass("my-class");
  });

  it("renders all animation names without errors", () => {
    const names = ["checkmark", "cross", "trophy", "fire", "stars"] as const;
    for (const name of names) {
      const { unmount } = render(<LottieIcon name={name} />);
      expect(screen.getByTestId("lottie-mock")).toBeInTheDocument();
      unmount();
    }
  });
});
