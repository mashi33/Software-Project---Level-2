export enum VehicleType {
  Budget = 'Budget',
  Luxury = 'Luxury',
  Group = 'Group'
}

export type VehicleClass = 'Car' | 'Van' | 'Bus';

export interface Vehicle {
  id?: string;
  modelName?: string;
  providerId: string;
  
  // Provider Profile
  providerProfile: {
    name: string;
    phone: string;
    location: string;
  };

  type: VehicleType;          // Category
  vehicleClass: VehicleClass; // Car/Van/Bus
  yearOfManufacture: number;
  seatCount: number;
  isAc: boolean;
  transmission: string;       // Automatic/Manual
  fuelType: string;           // Hybrid/Petrol/Diesel
  description: string;
  
  // Rates
  standardDailyRate: number;
  freeKMLimit: number; // Default 100
  extraKMRate: number;
  driverNightOutFee: number;
  
  // Images
  interiorPhoto?: string; // Base64 or URL
  exteriorPhoto?: string;
  
  // Verification
  driverNicUrl?: string;
  driverLicenseUrl?: string;
  insuranceDocUrl?: string;
  insuranceExpiry?: string;
  revenueLicenseUrl?: string;
  revenueLicenseExpiry?: string;
  isVerified: boolean;
  status: 'Approved' | 'Pending';
  
  // Features
  features: {
    wifi?: boolean;
    bluetooth?: boolean;
    airbags?: boolean;
    usbCharging?: boolean;
    luggage: number; // Number of bags
    safety: boolean;
    childSeats?: boolean;
    entertainment: boolean;
    tv?: boolean;
  };
  
  languages: string[]; // Sinhala, English, Tamil, etc.
  
  availableDates: string[]; // ISO Strings
  bookedDates?: string[]; // ISO Strings
  reviews: Review[];
}

export interface Review {
  id: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1-5
  comment: string;
  date: string; // ISO or relative
}

export interface Booking {
  id?: string;
  vehicleId: string;
  userId: string;
  startDate: Date | string;
  endDate: Date | string;
  nights: number;
  days: number;
  totalAmount: number;
  contactNumber?: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'Active' | 'Rejected';
  createdAt: Date | string;
  hasBeenRated?: boolean;
  
  // New Trip Details for Providers
  pickupAddress?: string;
  destinationAddress?: string;
  destinations?: string[]; // Array of stops/destinations
  passengerCount?: number;
  luggageCount?: number;
  
  // New UI Fields
  passengers?: number; // Keeping for backward compatibility if used elsewhere
  location?: string;
  pricingSummary?: {
    dailyRate: number;
    dailyRental: number;
    nightlyRate: number;
    driverNightOut: number;
  };
  vehicleImage?: string;
  providerName?: string;
  userName?: string;
}
