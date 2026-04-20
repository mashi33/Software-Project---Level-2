export interface TripMemory {
    id?: string;
    title: string;
    locationName: string;
    imageUrl: string;
    description: string;
    latitude: number;  // Add this
    longitude: number; // Add this
    startDate: Date;
    endDate: Date;
}