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
    commentCount?: number;     
  likedByUsers: string[];
  fullName?: string;
  createdAt?: string | Date;
}
export interface LikeResponse {
  id: string;
  likeCount: number;
  likedByUsers: string[];
}

export interface MemoryComment {
  id?: string;
  memoryId: string;
  userId: string;
  fullName: string;
  text: string;
  createdAt: Date | string;
}