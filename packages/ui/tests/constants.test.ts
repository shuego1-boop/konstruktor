import { describe, it, expect } from "vitest";
import { duration, stagger, delay } from "../src/animations/constants";

describe("Animation constants", () => {
  describe("duration", () => {
    it("has increasing durations", () => {
      expect(duration.instant).toBeLessThan(duration.fast);
      expect(duration.fast).toBeLessThan(duration.normal);
      expect(duration.normal).toBeLessThan(duration.slow);
      expect(duration.slow).toBeLessThan(duration.dramatic);
    });
  });

  describe("stagger", () => {
    it("has increasing delays", () => {
      expect(stagger.tight).toBeLessThan(stagger.normal);
      expect(stagger.normal).toBeLessThan(stagger.relaxed);
      expect(stagger.relaxed).toBeLessThan(stagger.dramatic);
    });
  });

  describe("delay", () => {
    it("starts at zero", () => {
      expect(delay.none).toBe(0);
    });

    it("has increasing delay values", () => {
      expect(delay.short).toBeLessThan(delay.medium);
      expect(delay.medium).toBeLessThan(delay.long);
    });
  });
});
