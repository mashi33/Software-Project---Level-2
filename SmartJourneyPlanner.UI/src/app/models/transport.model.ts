/**
 * Defines the main categories of vehicles.
 */
export enum VehicleType {
  Budget = 'Budget',
  Luxury = 'Luxury',
  Group = 'Group'
}

/**
 * Defines the physical type of the vehicle.
 */
export type VehicleClass = 'Car' | 'Van' | 'Bus';

/**
 * This interface represents a Transport Vehicle and all its properties.
 * It is used for both the database and the UI display.
 */
export interface Vehicle {
  id?: string; // Unique ID from database
  modelName: string; // e.g. "Toyota Prius"
  providerId: string; // ID of the vehicle owner
  
  // Information about the owner/provider
  providerProfile: {
    name: string;
    phone: string;
    email: string;
    location: string; // Where the vehicle is based
  };

  type: VehicleType;          // Budget, Luxury, or Group
  vehicleClass: VehicleClass; // Car, Van, or Bus
  yearOfManufacture: number;
  seatCount: number;
  isAc: boolean;
  transmission: string;       // Automatic or Manual
  fuelType: string;           // Hybrid, Petrol, or Diesel
  description: string;        // Brief text about the vehicle
  
  // Pricing Details
  standardDailyRate: number; // Cost for 1 day
  freeKMLimit: number;       // How many KM included for free per day
  extraKMRate: number;       // Cost per KM after free limit
  driverNightOutFee: number; // Cost if driver stays overnight
  
  // Photo Storage (as Base64 strings or URLs)
  interiorPhoto?: string;
  exteriorPhoto?: string;
  
  // Document links for verification
  driverNicUrl?: string;
  driverLicenseUrl?: string;
  insuranceDocUrl?: string;
  insuranceExpiry?: string;
  revenueLicenseUrl?: string;
  revenueLicenseExpiry?: string;
  
  isVerified: boolean; // True if admin approved the vehicle
  status: 'Approved' | 'Pending'; // Current listing status
  
  // Extra features the vehicle has
  features: {
    wifi?: boolean;
    bluetooth?: boolean;
    airbags?: boolean;
    usbCharging?: boolean;
    luggage: number; // Capacity for bags
    safety: boolean;
    childSeats?: boolean;
    entertainment: boolean;
    tv?: boolean;
  };
  
  languages: string[]; // Languages the driver speaks
  availableDates: string[]; // Dates the vehicle is free
  bookedDates?: string[]; // Dates the vehicle is already reserved
  reviews: Review[]; // History of user feedback
}

/**
 * Represents a single review from a traveler.
 */
export interface Review {
  id: string;
  userName: string;
  userAvatar?: string;
  rating: number; // Star count (1 to 5)
  comment: string; // Feedback text
  date: string; // When the review was written
}

/**
 * Represents a booking request or reservation record.
 */
export interface Booking {
  id?: string;
  vehicleId: string;
  userId: string; // ID of the traveler
  startDate: Date | string; // Trip start date
  endDate: Date | string; // Trip end date
  nights: number;
  days: number;
  totalAmount: number; // Calculated cost
  contactNumber?: string; // Traveler's phone
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'Active' | 'Rejected';
  createdAt: Date | string;
  hasBeenRated?: boolean; // True if the user already reviewed this trip
  
  // Trip details provided by the traveler
  pickupAddress?: string;
  destinations?: string[]; // List of stop-over locations
  passengerCount?: number;
  luggageCount?: number;
  
  // UI Helpers (used to show info on the My Bookings page)
  pricingSummary?: {
    dailyRate: number;
    dailyRental: number;
    nightlyRate: number;
    driverNightOut: number;
  };
  vehicleImage?: string;
  providerName?: string;
  providerPhone?: string;
  userName?: string; // Traveler's name
}
