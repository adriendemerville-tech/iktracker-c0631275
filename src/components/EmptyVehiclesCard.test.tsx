import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EmptyVehiclesCard } from "./EmptyVehiclesCard";

describe("EmptyVehiclesCard", () => {
  it("ouvre l'ajout existant depuis la carte, le picto et le clavier", () => {
    const onAdd = vi.fn();
    render(<EmptyVehiclesCard onAdd={onAdd} />);

    const card = screen.getByRole("button", { name: "Ajouter un véhicule" });
    expect(card).toHaveAttribute("type", "button");
    expect(card).toHaveAttribute("aria-haspopup", "dialog");
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByText("Aucun véhicule enregistré")).toBeInTheDocument();
    expect(screen.getByText("Ajoutez votre véhicule pour commencer")).toBeInTheDocument();
    const badge = screen.getByTestId("empty-vehicle-add-badge");
    expect(badge.querySelector("svg")).toBeTruthy();
    expect(badge.className).toContain("absolute");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("empty-vehicle-add-badge"));
    fireEvent.click(screen.getByText("Aucun véhicule enregistré"));
    card.focus();
    expect(card).toHaveFocus();

    expect(onAdd).toHaveBeenCalledTimes(2);
  });
});
