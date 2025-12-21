export interface Location {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  type: string; // 'home' | 'office' | 'client' | 'supplier' | 'other' or custom type
}

export interface Vehicle {
  id: string;
  ownerFirstName: string;
  ownerLastName: string;
  licensePlate: string;
  make: string;
  model: string;
  fiscalPower: number; // CV
  year?: number;
  isElectric?: boolean; // 100% electric vehicle (20% IK bonus)
}

export interface TourStopData {
  id: string;
  timestamp: string;
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  duration?: number;
}

export interface Trip {
  id: string;
  vehicleId: string | null; // Can be null if vehicle was deleted
  startLocation: Location;
  endLocation: Location;
  distance: number; // in km (total distance, doubled if round trip)
  baseDistance: number; // single-way distance
  roundTrip: boolean;
  purpose: string;
  startTime: Date;
  endTime: Date;
  ikAmount: number; // calculated IK in euros (preserved even if vehicle deleted)
  tourStops?: TourStopData[]; // For tours: array of intermediate stops
  calendarEventId?: string | null; // If trip was created from a calendar event
  status: 'validated' | 'pending_location'; // Trip status
}

export interface TripDraft {
  vehicleId?: string;
  startLocation?: Location;
  startTime?: Date;
  endLocation?: Location;
  endTime?: Date;
  purpose?: string;
}

// French IK rates 2024 (barème kilométrique fiscal)
// Rates depend on fiscal power (CV) and total annual distance
export interface IKBareme {
  cv: string;
  upTo5000: { rate: number };
  from5001To20000: { rate: number; fixed: number };
  over20000: { rate: number };
}

export const IK_BAREME_2024: IKBareme[] = [
  { cv: '3', upTo5000: { rate: 0.529 }, from5001To20000: { rate: 0.316, fixed: 1065 }, over20000: { rate: 0.370 } },
  { cv: '4', upTo5000: { rate: 0.606 }, from5001To20000: { rate: 0.340, fixed: 1330 }, over20000: { rate: 0.407 } },
  { cv: '5', upTo5000: { rate: 0.636 }, from5001To20000: { rate: 0.357, fixed: 1395 }, over20000: { rate: 0.427 } },
  { cv: '6', upTo5000: { rate: 0.665 }, from5001To20000: { rate: 0.374, fixed: 1457 }, over20000: { rate: 0.447 } },
  { cv: '7+', upTo5000: { rate: 0.697 }, from5001To20000: { rate: 0.394, fixed: 1515 }, over20000: { rate: 0.470 } },
];

export function getIKBareme(fiscalPower: number): IKBareme {
  if (fiscalPower <= 3) return IK_BAREME_2024[0];
  if (fiscalPower === 4) return IK_BAREME_2024[1];
  if (fiscalPower === 5) return IK_BAREME_2024[2];
  if (fiscalPower === 6) return IK_BAREME_2024[3];
  return IK_BAREME_2024[4]; // 7 CV et plus
}

export function calculateIK(distance: number, totalAnnualKm: number, fiscalPower: number): number {
  const bareme = getIKBareme(fiscalPower);
  
  // Apply the correct formula based on total annual distance
  if (totalAnnualKm <= 5000) {
    return distance * bareme.upTo5000.rate;
  } else if (totalAnnualKm <= 20000) {
    // For individual trip, use the rate portion
    return distance * bareme.from5001To20000.rate;
  } else {
    return distance * bareme.over20000.rate;
  }
}

export function calculateTotalAnnualIK(totalAnnualKm: number, fiscalPower: number): number {
  const bareme = getIKBareme(fiscalPower);
  
  if (totalAnnualKm <= 5000) {
    return totalAnnualKm * bareme.upTo5000.rate;
  } else if (totalAnnualKm <= 20000) {
    return (totalAnnualKm * bareme.from5001To20000.rate) + bareme.from5001To20000.fixed;
  } else {
    return totalAnnualKm * bareme.over20000.rate;
  }
}
