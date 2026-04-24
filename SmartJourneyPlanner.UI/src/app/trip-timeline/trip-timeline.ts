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
  
  // This gets the current list of days and events from the service
  timeline = this.timelineService.timeline;
  
  // If true, we show the welcome screen. If false, we show the actual timeline.
  showHero = true;

  // This tells us if the "Add Event" popup (modal) is currently open or closed
  isModalOpen = false;
  
  // If we are editing an old event, we keep its ID here. If it's a new event, this is null.
  editingEventId: string | null = null; 

  // This object holds the text the user types into the Add/Edit form
  formData = {
    title: '',
    time: '',
    location: '',
    category: 'Sightseeing' as 'Hotel' | 'Dining' | 'Sightseeing' | 'Transport',
    description: '',
    status: 'Pending' as 'Pending' | 'Completed'
  };
  
  // Remembers which day we are adding an event to (e.g., Day 1 or Day 2)
  selectedDayId: string = ''; 

  constructor() {
    // We don't auto-hide the hero anymore, let the user click the button
  }
  // --- Validation State ---
  // These help us track if a user has clicked on a field and if there are any errors (like empty fields)
  formTouched = {
    title: false,
    time: false,
    location: false
  };

  formErrors = {
    title: '',
    time: '',
    location: ''
  };

  ngOnInit() {
    // If we already have data loaded, don't show the welcome hero
    if (this.timeline().days.length > 0) {
      this.showHero = false;
    }
  }

  // Checks if the form is filled out correctly before saving
  validateForm(): boolean {
    let isValid = true;
    
    // Check if Title is empty
    if (!this.formData.title || this.formData.title.trim() === '') {
      this.formErrors.title = 'Title is required';
      isValid = false;
    } else {
      this.formErrors.title = '';
    }

    // Check if Time is empty
    if (!this.formData.time) {
      this.formErrors.time = 'Time is required';
      isValid = false;
    } else {
      this.formErrors.time = '';
    }

    // Check if Location is empty
    if (!this.formData.location || this.formData.location.trim() === '') {
      this.formErrors.location = 'Location is required';
      isValid = false;
    } else {
      this.formErrors.location = '';
    }

    return isValid;
  }

  // Runs when user leaves a text box, to check for errors immediately
  handleBlur(field: 'title' | 'time' | 'location') {
    this.formTouched[field] = true;
    this.validateForm();
  }

  // A quick way to check if the Save button should be disabled
  get isFormInvalid(): boolean {
    return !this.formData.title || !this.formData.time || !this.formData.location;
  }

  // --- Date Picker Logic ---
  // Updates the date of a specific day when the user picks a new date
  onDateChange(event: any, dayId: string) {
    const newDate = event.target.value;
    if (newDate) {
      this.timelineService.updateDayDate(dayId, newDate);
    }
  }

  // Opens the browser's built-in date picker when the calendar icon is clicked
  triggerDatePicker(dayId: string) {
    const picker = document.getElementById('date-picker-' + dayId) as HTMLInputElement;
    if (picker) {
      picker.showPicker(); 
    }
  }

  // This tells Angular which lists an event can be dragged into
  get connectedTo(): string[] {
    return this.timeline().days.map(d => d.id);
  }

  // --- Day logic methods ---
  // Switches from the welcome screen to the timeline view
  startItinerary() {
    this.showHero = false;
  }

  // Adds a new empty day to the trip
  addNewDay() {
    this.timelineService.addDay();
  }

  // Deletes a day after asking the user for confirmation
  deleteDay(dayId: string) {
    Swal.fire({
      title: 'Delete this day?',
      text: "You will lose all events planned for this day. This action cannot be undone.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DC3545',
      cancelButtonColor: '#6C757D',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.timelineService.deleteDay(dayId);
        Swal.fire('Deleted!', 'The day has been deleted.', 'success');
      }
    });
  }

  // Helper to show "Day 1", "Day 2", etc.
  getDayIndex(day: TimelineDay): number {
    const days = this.timeline().days;
    return days.findIndex(d => d.id === day.id) + 1;
  }
  
  // Counts how many activities are marked as "Completed" for a day
  completedCount(day: TimelineDay): number {
    return day.events.filter(e => e.status === 'Completed').length;
  }

  // Calculates the progress percentage (0% to 100%) for a day
  completionPercentage(day: TimelineDay): number {
    if (day.events.length === 0) return 0;
    return Math.round((this.completedCount(day) / day.events.length) * 100);
  }

  // This method runs when an event is dragged and dropped into a new position or new day
  drop(event: CdkDragDrop<any>) {
    const currentDayId = event.container.id; 
    
    if (event.previousContainer === event.container) {
      // Reordering inside the same day
      this.timelineService.reorderEvents(currentDayId, currentDayId, event.previousIndex, event.currentIndex);
    } else {
      // Moving from one day to another day
      this.timelineService.reorderEvents(event.previousContainer.id, currentDayId, event.previousIndex, event.currentIndex);
    }
  }

  // --- Event logic methods ---
  // Decides which icon to show based on the category (e.g., taxi for transport)
  getCategoryIcon(eventItem: TimelineEvent): string {
    switch (eventItem.category) {
      case 'Hotel': return 'domain'; 
      case 'Dining': return 'restaurant';
      case 'Sightseeing': return 'camera_alt';
      case 'Transport': return 'local_taxi'; 
      default: return 'event';
    }
  }

  // Decides which CSS color to use for the icon background
  getCategoryClass(eventItem: TimelineEvent): string {
    switch (eventItem.category) {
      case 'Hotel': return 'cat-hotel';
      case 'Dining': return 'cat-dining';
      case 'Sightseeing': return 'cat-sightseeing';
      case 'Transport': return 'cat-transport';
      default: return 'cat-hotel';
    }
  }

  // Marks an event as "Completed" or "Pending" when the dot is clicked
  toggleStatus(dayId: string, eventItem: TimelineEvent) {
    this.timelineService.toggleEventStatus(dayId, eventItem.id);
  }

  // Deletes a single event after asking for confirmation
  deleteEvent(dayId: string, eventItem: TimelineEvent) {
    Swal.fire({
      title: 'Delete this event?',
      text: `Are you sure you want to delete "${eventItem.title}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DC3545',
      cancelButtonColor: '#6C757D',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.timelineService.deleteEvent(dayId, eventItem.id);
      }
    });
  }

  // --- Modal (Popup) logic methods ---
  // Opens the popup to add a brand new activity
  openAddEventModal(dayId: string) {
    this.selectedDayId = dayId;
    this.editingEventId = null;
    this.formData = { title: '', time: '', location: '', category: 'Sightseeing', description: '', status: 'Pending' };
    this.formTouched = { title: false, time: false, location: false };
    this.formErrors = { title: '', time: '', location: '' };
    this.isModalOpen = true;
  }

  // Opens the popup to edit an existing activity and fills it with current data
  openEditEventModal(dayId: string, eventItem: TimelineEvent) {
    this.selectedDayId = dayId;
    this.editingEventId = eventItem.id;
    this.formData = { ...eventItem };
    this.formTouched = { title: false, time: false, location: false };
    this.formErrors = { title: '', time: '', location: '' };
    this.isModalOpen = true;
  }

  // Closes the popup
  closeModal() {
    this.isModalOpen = false;
  }

  // Saves the form data when the user clicks 'Save'
  onSubmit(e: Event) {
    e.preventDefault();
    
    // Trigger validation for all fields
    this.formTouched = { title: true, time: true, location: true };
    
    if (this.validateForm() && this.selectedDayId) {
      if (this.editingEventId) {
        // Update existing event
        this.timelineService.updateEvent(this.selectedDayId, { ...this.formData, id: this.editingEventId, dayId: this.selectedDayId } as TimelineEvent);
      } else {
        // Add new event
        this.timelineService.addEvent(this.selectedDayId, { ...this.formData, dayId: this.selectedDayId });
      }
      
      // Clear form and close
      this.formData = { title: '', time: '', location: '', category: 'Sightseeing', description: '', status: 'Pending' };
      this.editingEventId = null;
      this.closeModal();
    }
  }

  // --- Export logic ---
  // Opens Google Calendar to sync the trip plan
  exportToCalendar() {
    if (this.totalActivities === 0) {
      Swal.fire({
        title: 'Timeline is Empty',
        text: 'Please add some events to your timeline before exporting to calendar.',
        icon: 'warning',
        iconColor: '#f8bb86',
        confirmButtonColor: '#f8bb86'
      });
      return;
    }
    CalendarSyncUtil.openInGoogleCalendar(this.timeline());
  }

  // --- Statistics Getters ---
  // Total number of activities in the whole trip
  get totalActivities(): number {
    return this.timeline().days.reduce((acc, day) => acc + day.events.length, 0);
  }

  // Total activities marked as "Completed" in the whole trip
  get completedActivities(): number {
    return this.timeline().days.reduce((acc, day) => acc + day.events.filter(e => e.status === 'Completed').length, 0);
  }
}