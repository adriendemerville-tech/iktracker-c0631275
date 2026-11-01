import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { IKSimulator } from "./IKSimulator";
import { TestRouter } from "@/test/router";
import { calculateTotalAnnualIK } from "@/types/trip";
import { formatFrEuros, formatFrRate, FR_NBSP } from "@/lib/format-fr";

describe("IKSimulator display", () => {
  it("keeps the default amount and euro sign together, with a French rate", () => {
    render(
      <TestRouter>
        <IKSimulator />
      </TestRouter>,
    );
    const amount = formatFrEuros(calculateTotalAnnualIK(10_000, 5));
    expect(amount).toBe("4\u00a0965\u00a0€");
    const button = screen.getByRole("button", { name: /Automatiser mes/ });
    expect(button.textContent).toContain(amount);
    expect(button.textContent).toContain("d'IK");
    expect(button.className).toContain("whitespace-normal");
    expect(button.className).toContain("max-w-full");
    const glued = button.querySelector(".whitespace-nowrap");
    expect(glued?.textContent).toBe(`${amount}${FR_NBSP}d'IK`);
    expect(glued?.textContent?.includes(" ")).toBe(false);
    expect(document.body.textContent).toContain(`${formatFrRate(0.357)}${FR_NBSP}€/km`);
    expect(document.body.textContent).not.toContain("0.357");
  });
});
