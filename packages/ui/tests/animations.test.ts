import { describe, it, expect } from "vitest";
import {
  fadeIn,
  fadeInUp,
  fadeInDown,
  slideInRight,
  slideInLeft,
  slideInUp,
  scaleIn,
  popIn,
  staggerContainer,
  staggerContainerFast,
  staggerItem,
  staggerItemFade,
  shake,
  pulse,
  correctFlash,
  tapScale,
  tapScaleSubtle,
  hoverLift,
} from "../src/animations/variants";

describe("Animation variants", () => {
  describe("fadeIn", () => {
    it("has hidden and visible states", () => {
      expect(fadeIn.hidden).toEqual({ opacity: 0 });
      expect(fadeIn.visible).toBeDefined();
    });
  });

  describe("fadeInUp", () => {
    it("translates from below", () => {
      expect((fadeInUp.hidden as Record<string, unknown>).y).toBe(20);
      expect((fadeInUp.visible as Record<string, unknown>).y).toBe(0);
    });
  });

  describe("fadeInDown", () => {
    it("translates from above", () => {
      expect((fadeInDown.hidden as Record<string, unknown>).y).toBe(-20);
    });
  });

  describe("slideInRight", () => {
    it("slides from right with spring transition", () => {
      expect((slideInRight.hidden as Record<string, unknown>).x).toBe(60);
      expect((slideInRight.visible as Record<string, unknown>).x).toBe(0);
    });

    it("has exit state", () => {
      expect(slideInRight.exit).toBeDefined();
      expect((slideInRight.exit as Record<string, unknown>).x).toBe(-60);
    });
  });

  describe("slideInLeft", () => {
    it("slides from left", () => {
      expect((slideInLeft.hidden as Record<string, unknown>).x).toBe(-60);
    });
  });

  describe("slideInUp", () => {
    it("slides from below", () => {
      expect((slideInUp.hidden as Record<string, unknown>).y).toBe(40);
    });
  });

  describe("scaleIn", () => {
    it("scales from smaller size", () => {
      expect((scaleIn.hidden as Record<string, unknown>).scale).toBe(0.8);
      expect((scaleIn.visible as Record<string, unknown>).scale).toBe(1);
    });
  });

  describe("popIn", () => {
    it("scales from very small with exit zoom", () => {
      expect((popIn.hidden as Record<string, unknown>).scale).toBe(0.3);
      expect((popIn.exit as Record<string, unknown>).scale).toBe(1.8);
    });
  });

  describe("stagger containers", () => {
    it("staggerContainer has staggerChildren", () => {
      const vis = staggerContainer.visible as Record<string, unknown>;
      const transition = vis.transition as Record<string, unknown>;
      expect(transition.staggerChildren).toBe(0.1);
    });

    it("staggerContainerFast has faster stagger", () => {
      const vis = staggerContainerFast.visible as Record<string, unknown>;
      const transition = vis.transition as Record<string, unknown>;
      expect(transition.staggerChildren).toBe(0.08);
    });
  });

  describe("stagger items", () => {
    it("staggerItem has spring transition", () => {
      const vis = staggerItem.visible as Record<string, unknown>;
      const transition = vis.transition as Record<string, unknown>;
      expect(transition.type).toBe("spring");
    });

    it("staggerItemFade has tween transition", () => {
      const vis = staggerItemFade.visible as Record<string, unknown>;
      const transition = vis.transition as Record<string, unknown>;
      expect(transition.duration).toBe(0.3);
    });
  });

  describe("feedback variants", () => {
    it("shake has x-axis keyframes", () => {
      const s = shake.shake as Record<string, unknown>;
      expect(Array.isArray(s.x)).toBe(true);
    });

    it("pulse scales up and back", () => {
      const p = pulse.pulse as Record<string, unknown>;
      const scales = p.scale as number[];
      expect(scales[0]).toBe(1);
      expect(scales[1]).toBeGreaterThan(1);
      expect(scales[2]).toBe(1);
    });

    it("correctFlash has scale animation", () => {
      expect(correctFlash.flash).toBeDefined();
    });
  });

  describe("micro-interactions", () => {
    it("tapScale has hover and tap", () => {
      expect(tapScale.whileHover).toEqual({ scale: 1.02 });
      expect(tapScale.whileTap).toEqual({ scale: 0.97 });
    });

    it("tapScaleSubtle is less pronounced", () => {
      expect(tapScaleSubtle.whileHover).toEqual({ scale: 1.01 });
      expect(tapScaleSubtle.whileTap).toEqual({ scale: 0.98 });
    });

    it("hoverLift raises element", () => {
      expect((hoverLift.whileHover as Record<string, unknown>).y).toBe(-2);
    });
  });
});
