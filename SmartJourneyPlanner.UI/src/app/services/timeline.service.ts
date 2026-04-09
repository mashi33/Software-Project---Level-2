// This service handles all the data operations for the Trip Timeline.
// It talks to the backend API to save and load trip information.

import { Injectable, computed, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TimelinePlan, TimelineDay, TimelineEvent } from '../models/trip-timeline.model';
import { moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TimelineService {
  private http = inject(HttpClient);
  // The URL where our backend server is running
  private apiUrl = `${environment.apiUrl}/Timeline`; 

  // We use a Signal to hold the trip data. 
  // Any component using this signal will update automatically when the data changes.
  private timelineSignal = signal<TimelinePlan>({
    id: '',
    name: 'My New Trip',
    startDate: '',
    endDate: '',
    days: []
  });

  // This is a read-only version of the signal for other components to use
  timeline = computed(() => this.timelineSignal());

  constructor() {
    // When the app starts, we immediately try to load the trip from the database
    this.initTimeline();
  }

  // Gets the trip data from the backend API
  private async initTimeline() {
    try {
      console.log(`[TimelineService] FETCHING timeline from: ${this.apiUrl}`);
      const plans = await firstValueFrom(this.http.get<TimelinePlan[]>(this.apiUrl));
      
      if (plans && plans.length > 0) {
        let plan = plans[0];
        // If the ID is just the word "string", it might be corrupted data, so we clear it
        if (plan.id === 'string') {
          console.warn('[TimelineService] DATA CORRUPTION: Received literal "string" as ID. Sanitizing...');
          plan.id = '';
        }
        
        console.log(`[TimelineService] SUCCESS: Loaded plan. ID: ${plan.id || 'NEW'}`, plan);
        // Save the loaded data into our signal
        this.timelineSignal.set(plan);
      } else {
        console.warn('[TimelineService] EMPTY: No plans found on backend. Starting fresh.');
      }
    } catch (error: any) {
      console.error('[TimelineService] ERROR loading timeline:', error);
      if (error.status === 0) {
        console.error(`[TimelineService] CONNECTION FAILURE: Backend at ${this.apiUrl} is unreachable.`);
      }
    }
  }

  // Sends the current trip data to the backend to be saved in the database
  private async saveToBackend() {
    const currentPlan = this.timelineSignal();
    const planToSave = { ...currentPlan };
    
    // If it's a brand new trip (no ID), we let the database create an ID for us
    if (!planToSave.id || planToSave.id === '') {
      delete (planToSave as any).id;
    }

    try {
      if (currentPlan.id && currentPlan.id !== 'string') {
        // If trip already exists, we use "PUT" to update it
        console.log(`[TimelineService] UPDATING plan: ${currentPlan.id}`);
        await firstValueFrom(this.http.put(`${this.apiUrl}/${currentPlan.id}`, planToSave));
        console.log('[TimelineService] UPDATE SUCCESSful');
      } else {
        // If it's new, we use "POST" to create it
        console.log('[TimelineService] CREATING new plan (ID was empty or "string")...');
        const newPlan = await firstValueFrom(this.http.post<TimelinePlan>(this.apiUrl, planToSave));
        this.timelineSignal.set(newPlan);
        console.log(`[TimelineService] CREATE SUCCESSful. New ID: ${newPlan.id}`);
      }
    } catch (error: any) {
      console.error('[TimelineService] SAVE ERROR:', error);
    }
  }

  // Returns the current plan data
  getTimeline(): TimelinePlan {
    return this.timelineSignal();
  }

  // --- Actions ---

  // Adds a new day to the trip and calculates the next date automatically
  async addDay() {
    const currentPlan = this.timelineSignal();
    const days = currentPlan.days;
    let nextDateStr = '';
    
    if (days.length > 0) {
       // If we already have days, set the new day to be the day after the last one
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
        // If it's the first day, use today's date
        let startDate = new Date();
        nextDateStr = startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }

    const newDay: TimelineDay = {
      id: 'day-' + new Date().getTime(),
      date: nextDateStr,
      events: []
    };

    // Update the signal and then save to database
    this.timelineSignal.set({ 
      ...currentPlan, 
      days: [...days, newDay] 
    });

    await this.saveToBackend();
  }

  // Changes the name of the trip
  async updateTimelineName(newName: string) {
    if (!newName || newName.trim() === '') return;
    const currentPlan = this.timelineSignal();
    this.timelineSignal.set({ ...currentPlan, name: newName });
    await this.saveToBackend();
  }

  // Updates the date of a specific day and re-orders the list of days
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

  // Removes a day from the trip
  async deleteDay(dayId: string) {
    const currentPlan = this.timelineSignal();
    const updatedDays = currentPlan.days.filter(d => d.id !== dayId);
    this.timelineSignal.set({ ...currentPlan, days: updatedDays });
    await this.saveToBackend();
  }

  // Adds a new activity/event to a specific day
  async addEvent(dayId: string, event: Omit<TimelineEvent, 'id'>) {
    if (!event.title || !event.time || !event.location) return;

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

  // Updates an existing activity (e.g. changing the time or title)
  async updateEvent(dayId: string, updatedEvent: TimelineEvent) {
    if (!updatedEvent.title || !updatedEvent.time || !updatedEvent.location) return;
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

  // Removes a single activity from a day
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

  // Toggles an activity between "Pending" and "Completed"
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

  // Handles moving an activity up/down or into another day (Drag and Drop)
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
      // Reordering in the same day
      moveItemInArray(prevDay.events, previousIndex, currentIndex);
    } 
    else {
      // Moving to a different day
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

