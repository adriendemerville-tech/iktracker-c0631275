export interface Location {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  type: 'home' | 'office' | 'client' | 'supplier' | 'other';
}

export interface Trip {
  id: string;
  startLocation: Location;
  endLocation: Location;
  distance: number; // in km
  purpose: string;
  startTime: Date;
  endTime: Date;
  ikAmount: number; // calculated IK in euros
}

export interface TripDraft {
  startLocation?: Location;
  startTime?: Date;
  endLocation?: Location;
  endTime?: Date;
  purpose?: string;
}

// IK rate per km (simplified - actual rates vary by car power and total km)
export const IK_RATE = 0.603; // €/km for 5CV up to 5000km
