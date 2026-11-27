import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Counter } from "./Counter";
import { displayedRegisteredUserCount } from "@/lib/user-count";

function digits() {
  return (document.body.textContent ?? "").replace(/\D/g, "");
}

describe("animation du compteur déjà rendu", () => {
  const frames: FrameRequestCallback[] = [];

  afterEach(() => {
    frames.length = 0;
    vi.unstubAllGlobals();
  });

  function installFrames() {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
  }

  it.each([
    ["inscrits", displayedRegisteredUserCount(627), ""],
    ["trajets enregistrés", 9778, ""],
    ["kilomètres suivis", 1_280_700, "km"],
  ] as const)("garde %s affiché sans repartir de zéro", (label, value, unit) => {
    installFrames();
    render(<Counter value={value} initialValue={value} label={label} unit={unit} />);
    expect(frames).toHaveLength(0);
    expect(digits()).toContain(String(value));
    expect(digits()).not.toBe("0");
  });

  it("anime une mise à jour depuis le chiffre déjà affiché", () => {
    installFrames();
    const { rerender } = render(
      <Counter value={9778} initialValue={9778} label="trajets enregistrés" unit="" />,
    );
    expect(frames).toHaveLength(0);

    rerender(<Counter value={9900} initialValue={9778} label="trajets enregistrés" unit="" />);
    expect(frames.length).toBeGreaterThan(0);
    act(() => {
      frames[0](1_000);
    });
    const next = frames[frames.length - 1];
    act(() => {
      next(1_000);
    });
    expect(digits()).toContain("9778");
    expect(digits()).not.toBe("0");
  });

  it("anime encore depuis zéro quand aucun chiffre n'est déjà rendu", () => {
    installFrames();
    render(<Counter value={120} label="Distance totale" unit="km" />);
    expect(frames.length).toBeGreaterThan(0);
  });
});
