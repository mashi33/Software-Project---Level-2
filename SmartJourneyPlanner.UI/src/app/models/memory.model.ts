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
    userId: string;
    likeCount: number;       
  likedByUsers: string[];
}
export interface LikeResponse {
  id: string;
  likeCount: number;
  likedByUsers: string[];
}