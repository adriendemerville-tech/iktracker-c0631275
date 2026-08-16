import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VehicleCard } from "./VehicleCard";
import { Vehicle } from "@/types/trip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TestRouter } from "@/test/router";

const baseVehicle: Vehicle = {
  id: "v1",
  ownerFirstName: "Jean",
  ownerLastName: "Dupont",
  licensePlate: "AB-123-CD",
  make: "Renault",
  model: "Clio",
  fiscalPower: 5,
};

function renderCard(props: Partial<React.ComponentProps<typeof VehicleCard>> = {}) {
  return render(
    <TestRouter>
      <TooltipProvider>
        <VehicleCard vehicle={baseVehicle} {...props} />
      </TooltipProvider>
    </TestRouter>
  );
}

describe("VehicleCard", () => {
  it("renders vehicle make, model and CV", () => {
    renderCard();
    expect(screen.getByText("Renault Clio")).toBeInTheDocument();
    expect(screen.getByText("5 CV")).toBeInTheDocument();
  });

  it("displays rate per km for tranche ≤ 5000 km", () => {
    renderCard({ totalKm: 3000 });
    // 5CV upTo5000 rate = 0.636
    expect(screen.getByText("0.636 €/km")).toBeInTheDocument();
  });

  it("displays rate per km for tranche 5001-20000 km", () => {
    renderCard({ totalKm: 10000 });
    // 5CV from5001To20000 rate = 0.357
    expect(screen.getByText("0.357 €/km")).toBeInTheDocument();
  });

  it("displays rate per km for tranche > 20000 km", () => {
    renderCard({ totalKm: 25000 });
    // 5CV over20000 rate = 0.427
    expect(screen.getByText("0.427 €/km")).toBeInTheDocument();
  });

  it("applies 20% electric bonus to rate", () => {
    const electricVehicle: Vehicle = { ...baseVehicle, isElectric: true };
    render(
      <TestRouter>
        <TooltipProvider>
          <VehicleCard vehicle={electricVehicle} totalKm={3000} />
        </TooltipProvider>
      </TestRouter>
    );
    // 0.636 * 1.2 = 0.7632
    expect(screen.getByText("0.763 €/km")).toBeInTheDocument();
  });

  it("shows selected state styling", () => {
    const { container } = renderCard({ selected: true });
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("border-primary");
  });

  it("calls onSelect when clicked", () => {
    const onSelect = vi.fn();
    const { container } = renderCard({ onSelect });
    fireEvent.click(container.firstChild as HTMLElement);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("shows edit/delete menu when handlers provided", () => {
    renderCard({ onEdit: vi.fn(), onDelete: vi.fn() });
    expect(screen.getByLabelText("Options du véhicule")).toBeInTheDocument();
  });
});
