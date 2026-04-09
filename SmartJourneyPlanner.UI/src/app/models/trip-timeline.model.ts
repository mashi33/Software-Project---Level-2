// This file defines the data structures we use for the trip timeline.

// Represents a single activity/event in the trip (e.g., a hotel check-in or a dinner)
export interface TimelineEvent {
  id: string; // Unique ID for the event
  title: string; // Name of the activity
  description: string; // Extra details
  time: string; // When it happens (e.g. "10:00 AM")
  location: string; // Where it happens
  category: 'Hotel' | 'Dining' | 'Sightseeing' | 'Transport'; // Type of activity
  status: 'Pending' | 'Completed'; // Is it done or not?
  dayId: string; // The ID of the day this event belongs to
}

// Represents a single day in the trip, which can have many events inside it
export interface TimelineDay {
  id: string; // Unique ID for the day
  date: string; // The date (e.g. "Monday, October 12")
  events: TimelineEvent[]; // List of activities for this day
}

// Represents the entire Trip Plan, which holds all the days
export interface TimelinePlan {
  id: string; // Unique ID for the whole trip
  name: string; // Name of the trip (e.g. "Summer in Sri Lanka")
  startDate: string; // When the trip starts
  endDate: string; // When the trip ends
  days: TimelineDay[]; // All the days included in this trip
}
