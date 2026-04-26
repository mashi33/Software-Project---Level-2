/**
 * This file defines the data structures (interfaces) we use for the Trip Timeline.
 * Think of these as templates for how our data objects should look.
 */

// Represents a single activity or event in the trip (e.g., a hotel check-in or a dinner)
export interface TimelineEvent {
  id: string;          // Unique ID for identifying the specific event
  title: string;       // Name of the activity (e.g., "Visit Sigiriya")
  description: string; // Extra notes or details about the activity
  time: string;        // Time of the activity in 24-hour format (e.g., "09:00")
  location: string;    // The place where the activity happens
  category: 'Hotel' | 'Dining' | 'Sightseeing' | 'Transport'; // The type of activity for icons/colors
  status: 'Pending' | 'Completed'; // Tracks if the user has finished this activity
  dayId: string;       // Linking ID to know which Day this event belongs to
}

// Represents a single day in the trip, which acts as a container for many events
export interface TimelineDay {
  id: string;               // Unique ID for the day
  date: string;             // The formatted date string (e.g., "Monday, October 12, 2026")
  events: TimelineEvent[];  // The list of activities planned for this specific day
}

// Represents the entire Trip Plan (the top-level object)
export interface TimelinePlan {
  id: string;           // Unique ID for the entire trip itinerary
  name: string;         // The name given to the trip (e.g., "Sri Lanka Adventure")
  startDate: string;    // The overall start date of the journey
  endDate: string;      // The overall end date of the journey
  days: TimelineDay[];  // All the days (and their events) that make up this trip
}
