import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LastUpdated } from "./LastUpdated";
import { PAGE_DATES } from "@/lib/page-dates";

describe("LastUpdated", () => {
  it("émet une balise <time datetime> lisible par les crawlers", () => {
    const { container } = render(<LastUpdated date="2026-01-22" />);
    const time = container.querySelector("time");
    expect(time).not.toBeNull();
    expect(time!.getAttribute("datetime")).toBe(new Date("2026-01-22").toISOString());
    expect(screen.getByText(/Mis à jour le/)).toBeTruthy();
    expect(time!.textContent).toBe("22 janvier 2026");
  });

  it("accepte un datetime complet et le normalise en ISO", () => {
    const { container } = render(<LastUpdated date="2026-08-03T00:00:00+01:00" />);
    expect(container.querySelector("time")!.getAttribute("datetime")).toBe(
      new Date("2026-08-03T00:00:00+01:00").toISOString(),
    );
  });

  it("n'affiche rien si la date est invalide", () => {
    const { container } = render(<LastUpdated date="pas-une-date" />);
    expect(container.innerHTML).toBe("");
  });

  it.each(Object.entries(PAGE_DATES))(
    "%s : le datetime rendu correspond au dateModified du registre",
    (_key, dates) => {
      const { container } = render(<LastUpdated date={dates.modified} />);
      const attr = container.querySelector("time")!.getAttribute("datetime")!;
      expect(attr.slice(0, 10)).toBe(dates.modified);
    },
  );
});
