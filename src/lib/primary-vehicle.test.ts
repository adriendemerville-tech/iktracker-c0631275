import { describe, expect, it } from "vitest";
import { sortVehiclesWithPrimaryFirst } from "./primary-vehicle";
import type { Vehicle } from "@/types/trip";

const vehicle = (id: string, name: string): Vehicle =>
  ({
    id,
    name,
    ownerFirstName: "",
    ownerLastName: "",
    licensePlate: "",
    make: name,
    model: "",
    fiscalPower: 5,
    isElectric: false,
  }) as Vehicle;

const a = vehicle("a", "Peugeot 308");
const b = vehicle("b", "Tesla Model 3");
const c = vehicle("c", "Kia EV2");

describe("sortVehiclesWithPrimaryFirst", () => {
  it("place le véhicule principal en premier", () => {
    const result = sortVehiclesWithPrimaryFirst([a, b, c], "c").map((v) => v.id);
    expect(result).toEqual(["c", "a", "b"]);
  });

  it("ne change rien quand le véhicule principal est déjà en tête", () => {
    const result = sortVehiclesWithPrimaryFirst([a, b, c], "a").map((v) => v.id);
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("laisse la liste inchangée sans véhicule principal", () => {
    expect(sortVehiclesWithPrimaryFirst([a, b, c], null).map((v) => v.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(sortVehiclesWithPrimaryFirst([a, b, c], undefined).map((v) => v.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("ignore un identifiant de véhicule supprimé ou masqué", () => {
    const result = sortVehiclesWithPrimaryFirst([a, b], "inconnu").map((v) => v.id);
    expect(result).toEqual(["a", "b"]);
  });

  it("ne modifie pas le tableau d'origine", () => {
    const original = [a, b, c];
    sortVehiclesWithPrimaryFirst(original, "c");
    expect(original.map((v) => v.id)).toEqual(["a", "b", "c"]);
  });
});
