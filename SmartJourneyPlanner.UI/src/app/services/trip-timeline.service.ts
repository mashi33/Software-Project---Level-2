import { Injectable, computed, signal } from '@angular/core';
import { Trip, TripDay, TripEvent } from '../models/trip-timeline.model';
import { moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

@Injectable({
  providedIn: 'root'
})
export class TripTimelineService {

  // --- Dummy Initial Data ---
  // This is the fake trip data we use until real backend data is ready
  private initialTrip: Trip = {
    id: 'trip-1',
    name: 'Sri Lanka Adventure',
    startDate: '2026-03-14',
    endDate: '2026-03-16',
    days: [
      {
        id: 'day-1',
        date: 'Saturday, March 14, 2026',
        events: [
          {
            id: 'e1',
            title: 'Check-in at Galle Face Hotel',
            description: 'Historic luxury hotel overlooking the Indian Ocean. Early check-in arranged.',
            time: '14:00',
            location: 'Colombo',
            category: 'Hotel',
            status: 'Pending',
            dayId: 'day-1'
          },
          {
            id: 'e2',
            title: 'Dinner at Ministry of Crab',
            description: 'Award-winning seafood restaurant. Reservation confirmed for 2 people.',
            time: '19:30',
            location: 'Colombo Fort',
            category: 'Dining',
            status: 'Pending',
            dayId: 'day-1'
          }
        ]
      },
      {
        id: 'day-2',
        date: 'Sunday, March 15, 2026',
        events: [
          {
            id: 'e3',
            title: 'Visit Temple of the Tooth',
            description: 'Sacred Buddhist temple housing the relic of the tooth of Buddha. Dress modestly.',
            time: '09:00',
            location: 'Kandy',
            category: 'Sightseeing',
            status: 'Pending',
            dayId: 'day-2'
          },
          {
            id: 'e4',
            title: 'Lunch',
            description: 'Quick local lunch.',
            time: '13:00',
            location: 'Kandy City Center',
            category: 'Dining',
            status: 'Pending',
            dayId: 'day-2'
          }
        ]
      },
      {
        id: 'day-3',
        date: 'Monday, March 16, 2026',
        events: [
          {
            id: 'e5',
            title: 'Return Journey',
            description: 'Head back to Colombo.',
            time: '15:00',
            location: 'Kandy',
            category: 'Transport',
            status: 'Pending',
            dayId: 'day-3'
          }
        ]
      }
    ]
  };

  // We use Angular Signals here. It's the modern way to handle changing data.
  // tripSignal holds the actual modifiable data.
  // We start with an empty trip to show the professional "Empty State" UI first.
  private tripSignal = signal<Trip>({
    id: 'trip-new',
    name: 'My New Trip',
    startDate: '',
    endDate: '',
    days: []
  });

  // We expose "trip" as a computed signal so components can safely read it (but not directly change it).
  trip = computed(() => this.tripSignal());

  constructor() { }

  getTrip(): Trip {
    return this.tripSignal();
  }

  // --- Basic Actions (Add, Update, Delete) ---

  // Adds a new empty day to the timeline
  addDay() {
    const currentTrip = this.tripSignal();
    const days = currentTrip.days;
    let nextDateStr = '';
    
    if (days.length > 0) {
       // Get the date of the last added day
       const lastDateStr = days[days.length - 1].date;
       const lastDate = new Date(lastDateStr);
       
       if (!isNaN(lastDate.getTime())) {
           // Increment by 1 day
           const nextDate = new Date(lastDate);
           nextDate.setDate(nextDate.getDate() + 1);
           nextDateStr = nextDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
       } else {
           nextDateStr = 'Date TBD';
       }
    } else {
        // This is the VERY FIRST day being added
        // Use the trip's start date if it exists, otherwise use today
        let startDate = new Date();
        if (currentTrip.startDate) {
            const [y, m, d] = currentTrip.startDate.split('-').map(Number);
            if (y && m && d) startDate = new Date(y, m - 1, d);
        }
        nextDateStr = startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }

    const newDay: TripDay = {
      id: 'day-' + new Date().getTime(),
      date: nextDateStr,
      events: []
    };

    this.tripSignal.set({ 
      ...currentTrip, 
      days: [...days, newDay] 
    });
  }

  // Finds or creates a day for the given YYYY-MM-DD date and returns its ID
  getOrCreateDayIdForDate(dateStrYYYYMMDD: string): string {
    const currentTrip = this.tripSignal();
    
    // Parse the incoming YYYY-MM-DD cleanly using string manipulation to avoid timezone issues
    const [year, month, day] = dateStrYYYYMMDD.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    
    // Find if a day exists with the same date
    const existingDay = currentTrip.days.find(d => {
       const dDate = new Date(d.date);
       return dDate.getFullYear() === year && dDate.getMonth() === (month - 1) && dDate.getDate() === day;
    });

    if (existingDay) {
      return existingDay.id;
    }

    // Create a new day
    const newDayId = 'day-' + new Date().getTime();
    const formattedDate = targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    
    const newDay: TripDay = {
      id: newDayId,
      date: formattedDate,
      events: []
    };

    // Sort days chronologically
    const newDays = [...currentTrip.days, newDay].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    this.tripSignal.set({ ...currentTrip, days: newDays });
    
    return newDayId;
  }

  updateTripName(newName: string) {
    const currentTrip = this.tripSignal();
    this.tripSignal.set({ ...currentTrip, name: newName });
  }

  updateDayDate(dayId: string, newDateStrYYYYMMDD: string) {
    const currentTrip = this.tripSignal();
    
    const [year, month, day] = newDateStrYYYYMMDD.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    const formattedDate = targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    const updatedDays = currentTrip.days.map(d => {
      if (d.id === dayId) {
        return { ...d, date: formattedDate };
      }
      return d;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    this.tripSignal.set({ ...currentTrip, days: updatedDays });
  }

  // Deletes an entire day and all its events
  deleteDay(dayId: string) {
    const currentTrip = this.tripSignal();
    const updatedDays = currentTrip.days.filter(d => d.id !== dayId);
    this.tripSignal.set({ ...currentTrip, days: updatedDays });
  }

  // Adds a brand new event to a specific day
  addEvent(dayId: string, event: Omit<TripEvent, 'id'>) {
    const currentTrip = this.tripSignal();
    
    // Create the new event object with a fake unique ID based on the current time
    const newEvent: TripEvent = {
      ...event,
      status: event.status as 'Pending' | 'Completed',
      id: 'e' + new Date().getTime(),
      dayId: dayId
    };

    // Find the correct day and push the new event into its list
    const updatedDays = currentTrip.days.map(day => {
      if (day.id === dayId) {
        return { ...day, events: [...day.events, newEvent] };
      }
      return day;
    }) as TripDay[];

    // Save the changes back to the signal, which automatically updates the screen
    this.tripSignal.set({ ...currentTrip, days: updatedDays });
  }

  updateEvent(dayId: string, updatedEvent: TripEvent) {
    const currentTrip = this.tripSignal();

    const updatedDays = currentTrip.days.map(day => {
      if (day.id === dayId) {
        return {
          ...day,
          events: day.events.map(e => e.id === updatedEvent.id ? updatedEvent : e)
        };
      }
      return day;
    }) as TripDay[];

    this.tripSignal.set({ ...currentTrip, days: updatedDays });
  }

  // Removes an event completely
  deleteEvent(dayId: string, eventId: string) {
    const currentTrip = this.tripSignal();

    const updatedDays = currentTrip.days.map(day => {
      if (day.id === dayId) {
        return {
          ...day,
          // Keep all events EXCEPT the one we want to delete
          events: day.events.filter(e => e.id !== eventId)
        };
      }
      return day;
    }) as TripDay[];

    this.tripSignal.set({ ...currentTrip, days: updatedDays });
  }

  // Changes the status between "Pending" and "Completed" when the user clicks the checkbox
  toggleEventStatus(dayId: string, eventId: string) {
    const currentTrip = this.tripSignal();

    const updatedDays = currentTrip.days.map(day => {
      if (day.id === dayId) {
        return {
          ...day,
          events: day.events.map(e => {
            if (e.id === eventId) {
              return { ...e, status: e.status === 'Completed' ? 'Pending' as 'Pending' : 'Completed' as 'Completed' };
            }
            return e;
          })
        };
      }
      return day;
    }) as TripDay[];

    this.tripSignal.set({ ...currentTrip, days: updatedDays });
  }

  // --- Drag and Drop Logic ---
  // Reorders events when a user drags them around the lists
  reorderEvents(
    previousDayId: string,
    currentDayId: string,
    previousIndex: number,
    currentIndex: number
  ) {
    const currentTrip = structuredClone(this.tripSignal()) as Trip; // Deep copy

    const prevDay = currentTrip.days.find(d => d.id === previousDayId);
    const currDay = currentTrip.days.find(d => d.id === currentDayId);

    if (!prevDay || !currDay) return;

    // SCENARIO 1: Dragging an event up or down within the SAME day
    if (previousDayId === currentDayId) {
      moveItemInArray(prevDay.events, previousIndex, currentIndex);
    } 
    // SCENARIO 2: Dragging an event from one day to a DIFFERENT day
    else {
      // Moved across days
      transferArrayItem(
        prevDay.events,
        currDay.events,
        previousIndex,
        currentIndex
      );
      // Update dayId on the moved event
      currDay.events[currentIndex].dayId = currentDayId;
    }

    this.tripSignal.set(currentTrip);
  }
}
