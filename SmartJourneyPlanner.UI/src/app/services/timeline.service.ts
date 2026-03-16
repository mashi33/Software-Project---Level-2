import { Injectable, computed, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TimelinePlan, TimelineDay, TimelineEvent } from '../models/trip-timeline.model';
import { moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TimelineService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5125/api/Timeline'; // Updated to match currently running backend port

  // We use Angular Signals here. It's the modern way to handle changing data.
  private timelineSignal = signal<TimelinePlan>({
    id: '',
    name: 'My New Trip',
    startDate: '',
    endDate: '',
    days: []
  });

  // We expose "timeline" as a computed signal so components can safely read it (but not directly change it).
  timeline = computed(() => this.timelineSignal());

  constructor() {
    this.initTimeline();
  }

  // Initializes the timeline from the backend or creates a new one if none exists
  private async initTimeline() {
    try {
      console.log('Fetching timeline from:', this.apiUrl);
      const plans = await firstValueFrom(this.http.get<TimelinePlan[]>(this.apiUrl));
      console.log('Plans received from backend:', plans);
      if (plans && plans.length > 0) {
        this.timelineSignal.set(plans[0]); // Load the first existing plan
      } else {
        console.log('No existing plans found on backend.');
      }
    } catch (error: any) {
      console.error('Failed to load timeline from backend:', error);
      if (error.status === 0) {
        console.error('CRITICAL: Backend API is offline or unreachable at', this.apiUrl);
      }
    }
  }

  // Saves the current timeline state to the backend
  private async saveToBackend() {
    const currentPlan = this.timelineSignal();
    console.log('Attempting to save timeline:', currentPlan);
    
    // We create a copy to avoid mutating the signal directly
    const planToSave = { ...currentPlan };
    
    // If ID is empty, we remove it so the backend/MongoDB can generate a proper ObjectId
    if (!planToSave.id || planToSave.id === '') {
      delete (planToSave as any).id;
    }

    try {
      if (currentPlan.id) {
        // Update existing plan
        console.log('UPDATING existing plan with ID:', currentPlan.id);
        await firstValueFrom(this.http.put(`${this.apiUrl}/${currentPlan.id}`, planToSave));
        console.log('Timeline updated successfully');
      } else {
        // Create new plan
        console.log('CREATING new plan on backend...');
        const newPlan = await firstValueFrom(this.http.post<TimelinePlan>(this.apiUrl, planToSave));
        console.log('Response from POST:', newPlan);
        this.timelineSignal.set(newPlan);
        console.log('New timeline created successfully with ID:', newPlan.id);
      }
    } catch (error: any) {
      console.error('Failed to save timeline to backend:', error);
      if (error.status === 0) {
        console.error('CRITICAL: Cannot save because Backend API is offline at', this.apiUrl);
      }
    }
  }

  getTimeline(): TimelinePlan {
    return this.timelineSignal();
  }

  // --- Basic Actions (Add, Update, Delete) ---

  // Adds a new empty day to the timeline
  async addDay() {
    const currentPlan = this.timelineSignal();
    const days = currentPlan.days;
    let nextDateStr = '';
    
    if (days.length > 0) {
       const lastDateStr = days[days.length - 1].date;
       const lastDate = new Date(lastDateStr);
       
       if (!isNaN(lastDate.getTime())) {
           const nextDate = new Date(lastDate);
           nextDate.setDate(nextDate.getDate() + 1);
           nextDateStr = nextDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
       } else {
           nextDateStr = 'Date TBD';
       }
    } else {
        let startDate = new Date();
        if (currentPlan.startDate) {
            const [y, m, d] = currentPlan.startDate.split('-').map(Number);
            if (y && m && d) startDate = new Date(y, m - 1, d);
        }
        nextDateStr = startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }

    const newDay: TimelineDay = {
      id: 'day-' + new Date().getTime(),
      date: nextDateStr,
      events: []
    };

    this.timelineSignal.set({ 
      ...currentPlan, 
      days: [...days, newDay] 
    });

    await this.saveToBackend();
  }

  async updateTimelineName(newName: string) {
    if (!newName || newName.trim() === '') {
      console.warn('Cannot update timeline name to an empty string.');
      return;
    }
    const currentPlan = this.timelineSignal();
    this.timelineSignal.set({ ...currentPlan, name: newName });
    await this.saveToBackend();
  }

  async updateDayDate(dayId: string, newDateStrYYYYMMDD: string) {
    const currentPlan = this.timelineSignal();
    
    const [year, month, day] = newDateStrYYYYMMDD.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    const formattedDate = targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    const updatedDays = currentPlan.days.map(d => {
      if (d.id === dayId) {
        return { ...d, date: formattedDate };
      }
      return d;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    this.timelineSignal.set({ ...currentPlan, days: updatedDays });
    await this.saveToBackend();
  }

  async deleteDay(dayId: string) {
    const currentPlan = this.timelineSignal();
    const updatedDays = currentPlan.days.filter(d => d.id !== dayId);
    this.timelineSignal.set({ ...currentPlan, days: updatedDays });
    await this.saveToBackend();
  }

  async addEvent(dayId: string, event: Omit<TimelineEvent, 'id'>) {
    if (!event.title || event.title.trim() === '' || !event.time || !event.location || event.location.trim() === '') {
      console.error('Validation failed: Title, Time, and Location are required for an event.', event);
      return;
    }

    const currentPlan = this.timelineSignal();
    
    const newEvent: TimelineEvent = {
      ...event,
      status: event.status as 'Pending' | 'Completed',
      id: 'e' + new Date().getTime(),
      dayId: dayId
    };

    const updatedDays = currentPlan.days.map(day => {
      if (day.id === dayId) {
        return { ...day, events: [...day.events, newEvent] };
      }
      return day;
    }) as TimelineDay[];

    this.timelineSignal.set({ ...currentPlan, days: updatedDays });
    await this.saveToBackend();
  }

  async updateEvent(dayId: string, updatedEvent: TimelineEvent) {
    if (!updatedEvent.title || updatedEvent.title.trim() === '' || !updatedEvent.time || !updatedEvent.location || updatedEvent.location.trim() === '') {
      console.error('Validation failed: Title, Time, and Location are required for an event update.', updatedEvent);
      return;
    }
    const currentPlan = this.timelineSignal();

    const updatedDays = currentPlan.days.map(day => {
      if (day.id === dayId) {
        return {
          ...day,
          events: day.events.map(e => e.id === updatedEvent.id ? updatedEvent : e)
        };
      }
      return day;
    }) as TimelineDay[];

    this.timelineSignal.set({ ...currentPlan, days: updatedDays });
    await this.saveToBackend();
  }

  async deleteEvent(dayId: string, eventId: string) {
    const currentPlan = this.timelineSignal();

    const updatedDays = currentPlan.days.map(day => {
      if (day.id === dayId) {
        return {
          ...day,
          events: day.events.filter(e => e.id !== eventId)
        };
      }
      return day;
    }) as TimelineDay[];

    this.timelineSignal.set({ ...currentPlan, days: updatedDays });
    await this.saveToBackend();
  }

  async toggleEventStatus(dayId: string, eventId: string) {
    const currentPlan = this.timelineSignal();

    const updatedDays = currentPlan.days.map(day => {
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
    }) as TimelineDay[];

    this.timelineSignal.set({ ...currentPlan, days: updatedDays });
    await this.saveToBackend();
  }

  async reorderEvents(
    previousDayId: string,
    currentDayId: string,
    previousIndex: number,
    currentIndex: number
  ) {
    const currentPlan = structuredClone(this.timelineSignal()) as TimelinePlan;

    const prevDay = currentPlan.days.find(d => d.id === previousDayId);
    const currDay = currentPlan.days.find(d => d.id === currentDayId);

    if (!prevDay || !currDay) return;

    if (previousDayId === currentDayId) {
      moveItemInArray(prevDay.events, previousIndex, currentIndex);
    } 
    else {
      transferArrayItem(
        prevDay.events,
        currDay.events,
        previousIndex,
        currentIndex
      );
      currDay.events[currentIndex].dayId = currentDayId;
    }

    this.timelineSignal.set(currentPlan);
    await this.saveToBackend();
  }
}

