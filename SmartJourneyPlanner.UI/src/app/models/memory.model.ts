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
    visibility: string; // Options: "private", "public", "tripMembers"
    tripId?: string; 
  tripName?: string;
    userId: string;
    likeCount: number;       
  likedByUsers: string[];
  fullName?: string;
  createdAt?: string | Date;
}
export interface LikeResponse {
  id: string;
  likeCount: number;
  likedByUsers: string[];
}