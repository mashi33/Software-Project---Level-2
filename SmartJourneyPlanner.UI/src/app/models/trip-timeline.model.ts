// Represents a single activity/event in the trip (e.g., a hotel check-in or a dinner)
export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  time: string; // E.g. "10:00 AM"
  location: string;
  category: 'Hotel' | 'Dining' | 'Sightseeing' | 'Transport';
  status: 'Pending' | 'Completed';
  dayId: string;
}

// Represents a single day in the trip, containing multiple events
export interface TimelineDay {
  id: string;
  date: string;
  events: TimelineEvent[];
}

// Represents the entire Trip, containing all days and general info
export interface TimelinePlan {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  days: TimelineDay[];
}
