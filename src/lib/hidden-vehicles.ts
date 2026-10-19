export function readHiddenVehicles(userId: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(`iktracker-hidden-vehicles:${userId}`) || "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function setVehicleHidden(userId: string, vehicleId: string, hidden: boolean): string[] {
  const ids = readHiddenVehicles(userId).filter((id) => id !== vehicleId);
  if (hidden) ids.push(vehicleId);
  localStorage.setItem(`iktracker-hidden-vehicles:${userId}`, JSON.stringify(ids));
  return ids;
}