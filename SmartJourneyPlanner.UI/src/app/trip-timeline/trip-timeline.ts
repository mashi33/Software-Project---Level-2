// This is the main logic file for the Trip Timeline page.
// It handles showing the trip days, adding events, and dragging items around.

import { Component, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

import { TimelineService } from '../services/timeline.service';
import { TimelineDay, TimelineEvent } from '../models/trip-timeline.model';
import { CalendarSyncUtil } from '../utils/calendar-sync.util';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-trip-timeline',
  standalone: true,
  imports: [CommonModule, DragDropModule, MatButtonModule, MatIconModule, FormsModule],

  templateUrl: './trip-timeline.html',
  styleUrl: './trip-timeline.css'
})
export class TripTimelineComponent {
  // We use this service to talk to the database and manage our trip data
  private timelineService = inject(TimelineService);
  
  // This variable holds the actual list of days and activities (events)
  timeline = this.timelineService.timeline;
  
  // If true, the welcome screen is visible. If false, the timeline is visible.
  showHero = true;

  // This controls the 'Add Activity' popup window
  isModalOpen = false;
  
  // Remembers which activity we are editing (if any)
  editingEventId: string | null = null; 

  // Object to store temporary data when the user is typing into the form
  formData = {
    title: '',
    time: '',
    location: '',
    category: 'Sightseeing' as 'Hotel' | 'Dining' | 'Sightseeing' | 'Transport',
    description: '',
    status: 'Pending' as 'Pending' | 'Completed'
  };
  
  // Remembers which day (e.g. Day 1) we are adding an activity to
  selectedDayId: string = ''; 

  // Tracks if the user has clicked inside the form fields (for validation)
  formTouched = {
    title: false,
    time: false,
    location: false
  };

  // Stores error messages if fields are left empty
  formErrors = {
    title: '',
    time: '',
    location: ''
  };

  constructor() {}

  // This runs when the component starts
  ngOnInit() {
    // If the user already has a trip plan loaded, hide the welcome screen immediately
    if (this.timeline().days.length > 0) {
      this.showHero = false;
    }
  }

  // Checks if the user has filled in the required fields (Title, Time, Location)
  validateForm(): boolean {
    let isValid = true;
    
    if (!this.formData.title || this.formData.title.trim() === '') {
      this.formErrors.title = 'Title is required';
      isValid = false;
    } else {
      this.formErrors.title = '';
    }

    if (!this.formData.time) {
      this.formErrors.time = 'Time is required';
      isValid = false;
    } else {
      this.formErrors.time = '';
    }

    if (!this.formData.location || this.formData.location.trim() === '') {
      this.formErrors.location = 'Location is required';
      isValid = false;
    } else {
      this.formErrors.location = '';
    }

    return isValid;
  }

  // Runs when user clicks out of a field to check for errors
  handleBlur(field: 'title' | 'time' | 'location') {
    this.formTouched[field] = true;
    this.validateForm();
  }

  // Updates the specific date (e.g. 2024-05-20) for a trip day
  onDateChange(event: any, dayId: string) {
    const newDate = event.target.value;
    if (newDate) {
      this.timelineService.updateDayDate(dayId, newDate);
    }
  }

  // Opens the browser's date picker when the calendar icon is clicked
  triggerDatePicker(dayId: string) {
    const picker = document.getElementById('date-picker-' + dayId) as HTMLInputElement;
    if (picker) {
      picker.showPicker(); 
    }
  }

  // Tells Angular which lists an activity can be dragged into
  get connectedTo(): string[] {
    return this.timeline().days.map(d => d.id);
  }

  // --- Day Management ---

  // Moves from welcome screen to the timeline
  startItinerary() {
    this.showHero = false;
  }

  // Adds a new Day (Day 1, Day 2, etc.) to the trip
  addNewDay() {
    this.timelineService.addDay();
  }

  // Deletes an entire day from the trip plan
  deleteDay(dayId: string) {
    Swal.fire({
      title: 'Delete this day?',
      text: "You will lose all activities for this day.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DC3545',
      cancelButtonColor: '#6C757D',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.timelineService.deleteDay(dayId);
      }
    });
  }

  // Calculates how many activities are done for a specific day
  completedCount(day: TimelineDay): number {
    return day.events.filter(e => e.status === 'Completed').length;
  }

  // Calculates the progress percentage (e.g. 50% finished)
  completionPercentage(day: TimelineDay): number {
    if (day.events.length === 0) return 0;
    return Math.round((this.completedCount(day) / day.events.length) * 100);
  }

  // Handles moving activities between days via Drag and Drop
  drop(event: CdkDragDrop<any>) {
    const currentDayId = event.container.id; 
    
    if (event.previousContainer === event.container) {
      // Reordering activities inside the same day
      this.timelineService.reorderEvents(currentDayId, currentDayId, event.previousIndex, event.currentIndex);
    } else {
      // Moving an activity from one day to a different day
      this.timelineService.reorderEvents(event.previousContainer.id, currentDayId, event.previousIndex, event.currentIndex);
    }
  }

  // --- Activity Management ---

  // Chooses the correct icon based on activity type (Hotel, Restaurant, etc.)
  getCategoryIcon(eventItem: TimelineEvent): string {
    switch (eventItem.category) {
      case 'Hotel': return 'domain'; 
      case 'Dining': return 'restaurant';
      case 'Sightseeing': return 'camera_alt';
      case 'Transport': return 'local_taxi'; 
      default: return 'event';
    }
  }

  // Marks an activity as 'Completed' or 'Pending'
  toggleStatus(dayId: string, eventItem: TimelineEvent) {
    this.timelineService.toggleEventStatus(dayId, eventItem.id);
  }

  // Deletes a single activity from a day
  deleteEvent(dayId: string, eventItem: TimelineEvent) {
    Swal.fire({
      title: 'Delete this activity?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DC3545',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.timelineService.deleteEvent(dayId, eventItem.id);
      }
    });
  }

  // --- Popup (Modal) Logic ---

  // Opens the popup to create a new activity
  openAddEventModal(dayId: string) {
    this.selectedDayId = dayId;
    this.editingEventId = null; // No ID because it's new
    this.formData = { title: '', time: '', location: '', category: 'Sightseeing', description: '', status: 'Pending' };
    this.isModalOpen = true;
  }

  // Opens the popup to edit an existing activity
  openEditEventModal(dayId: string, eventItem: TimelineEvent) {
    this.selectedDayId = dayId;
    this.editingEventId = eventItem.id;
    this.formData = { ...eventItem }; // Fill form with current activity data
    this.isModalOpen = true;
  }

  // Saves the activity when the 'Save' button is clicked
  onSubmit(e: Event) {
    e.preventDefault();
    if (this.validateForm() && this.selectedDayId) {
      if (this.editingEventId) {
        // Update old activity
        this.timelineService.updateEvent(this.selectedDayId, { ...this.formData, id: this.editingEventId, dayId: this.selectedDayId } as TimelineEvent);
      } else {
        // Create new activity
        this.timelineService.addEvent(this.selectedDayId, { ...this.formData, dayId: this.selectedDayId });
      }
      this.isModalOpen = false; // Close the window
    }
  }

  // Syncs the entire trip plan with Google Calendar
  exportToCalendar() {
    if (this.totalActivities === 0) {
      Swal.fire('Empty Timeline', 'Please add some activities before exporting.', 'warning');
      return;
    }
    CalendarSyncUtil.openInGoogleCalendar(this.timeline());
  }

  // Summary statistics for the dashboard
  get totalActivities(): number {
    return this.timeline().days.reduce((acc, day) => acc + day.events.length, 0);
  }

  get completedActivities(): number {
    return this.timeline().days.reduce((acc, day) => acc + day.events.filter(e => e.status === 'Completed').length, 0);
  }

  // Closes the activity modal
  closeModal() {
    this.isModalOpen = false;
  }

  // Returns true if the form is invalid
  get isFormInvalid(): boolean {
    return !this.validateForm();
  }

  // Gets the index of a day
  getDayIndex(day: TimelineDay): number {
    return this.timeline().days.indexOf(day) + 1;
  }

  // Gets a CSS class based on event category
  getCategoryClass(eventItem: TimelineEvent): string {
    if (!eventItem || !eventItem.category) return 'category-default';
    return `category-${eventItem.category.toLowerCase()}`;
  }
}
