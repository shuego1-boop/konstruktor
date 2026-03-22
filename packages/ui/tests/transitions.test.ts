import { describe, it, expect } from "vitest";
import {
  springSnap,
  springSmooth,
  springBouncy,
  springGentle,
  tweenFast,
  tweenNormal,
  tweenSlow,
} from "../src/animations/transitions";

describe("Animation transitions", () => {
  it("springSnap is a snappy spring", () => {
    expect(springSnap.type).toBe("spring");
    expect(springSnap.stiffness).toBe(400);
  });

  it("springSmooth is a smooth spring", () => {
    expect(springSmooth.type).toBe("spring");
    expect(springSmooth.damping).toBe(24);
  });

  it("springBouncy has low damping for bounce", () => {
    expect(springBouncy.damping).toBe(14);
  });

  it("springGentle is a soft spring", () => {
    expect(springGentle.stiffness).toBe(200);
  });

  it("tweenFast has short duration", () => {
    expect(tweenFast.type).toBe("tween");
    expect(tweenFast.duration).toBe(0.15);
  });

  it("tweenNormal has standard duration", () => {
    expect(tweenNormal.duration).toBe(0.3);
  });

  it("tweenSlow has longer duration", () => {
    expect(tweenSlow.duration).toBe(0.5);
  });
});
