import { beforeEach, describe, expect, it } from "vitest";
import { readHiddenVehicles, setVehicleHidden } from "./hidden-vehicles";

describe("vehicle visibility", () => {
  beforeEach(() => localStorage.clear());
  it("persists hiding and unhiding without changing the vehicle", () => {
    expect(setVehicleHidden("owner", "peugeot", true)).toEqual(["peugeot"]);
    expect(readHiddenVehicles("owner")).toEqual(["peugeot"]);
    expect(setVehicleHidden("owner", "peugeot", false)).toEqual([]);
  });
  it("isolates hidden vehicles by owner", () => {
    setVehicleHidden("owner", "peugeot", true);
    expect(readHiddenVehicles("other-owner")).toEqual([]);
  });
});