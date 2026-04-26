export interface TripMemory {
    id?: string;
    title: string;
    locationName: string;
    imageUrl: string;
    description: string;
    latitude: number;  
    longitude: number; 
    startDate: Date;
    endDate: Date;
    isPublic: boolean;
}