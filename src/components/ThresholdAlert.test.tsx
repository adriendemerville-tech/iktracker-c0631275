import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThresholdAlert } from "./ThresholdAlert";

describe("ThresholdAlert", () => {
  it("returns null when not near any threshold", () => {
    const { container } = render(<ThresholdAlert totalKm={3000} fiscalPower={5} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows approaching alert near 5000 km", () => {
    render(<ThresholdAlert totalKm={4850} fiscalPower={5} />);
    expect(screen.getByText(/dans 150 km/)).toBeInTheDocument();
    expect(screen.getByText(/tranche supérieure/)).toBeInTheDocument();
  });

  it("shows crossed alert just after 5000 km", () => {
    render(<ThresholdAlert totalKm={5100} fiscalPower={5} />);
    expect(screen.getByText(/5.000 km/)).toBeInTheDocument();
    expect(screen.getByText(/barème a changé/)).toBeInTheDocument();
  });

  it("shows approaching alert near 20000 km", () => {
    render(<ThresholdAlert totalKm={19850} fiscalPower={5} />);
    expect(screen.getByText(/dans 150 km/)).toBeInTheDocument();
  });

  it("shows crossed alert just after 20000 km", () => {
    render(<ThresholdAlert totalKm={20100} fiscalPower={5} />);
    expect(screen.getByText(/20.000 km/)).toBeInTheDocument();
  });

  it("returns null far from any threshold", () => {
    const { container } = render(<ThresholdAlert totalKm={10000} fiscalPower={5} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null at 0 km", () => {
    const { container } = render(<ThresholdAlert totalKm={0} fiscalPower={5} />);
    expect(container.firstChild).toBeNull();
  });
});
