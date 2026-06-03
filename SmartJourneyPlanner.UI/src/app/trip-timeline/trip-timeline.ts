import { Component, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

// Importing our own services and models
import { TimelineService } from '../services/timeline.service';
import { TimelineDay, TimelineEvent } from '../models/trip-timeline.model';
import { CalendarSyncUtil } from '../utils/calendar-sync.util';
import Swal from 'sweetalert2'; // For nice popup alerts

@Component({
  selector: 'app-trip-timeline',
  standalone: true,
  imports: [CommonModule, DragDropModule, MatButtonModule, MatIconModule, FormsModule],
  templateUrl: './trip-timeline.html',
  styleUrl: './trip-timeline.css'
})
export class TripTimelineComponent {
  // Accessing the shared TimelineService to manage data
  private timelineService = inject(TimelineService);
  
  // The current timeline data (linked to the service)
  timeline = this.timelineService.timeline;
  
  // Controls if we show the "Welcome" screen or the actual timeline
  showHero = true;

  // Controls if the "Add/Edit Event" popup is visible
  isModalOpen = false;
  
  // Stores the ID of the event we are currently editing (null if adding new)
  editingEventId: string | null = null; 

  // Object to store data from the Add/Edit form
  formData = {
    title: '',
    time: '',
    location: '',
    category: 'Sightseeing' as 'Hotel' | 'Dining' | 'Sightseeing' | 'Transport',
    description: '',
    status: 'Pending' as 'Pending' | 'Completed'
  };
  
  // Stores which day we are currently adding an event to
  selectedDayId: string = ''; 
  
  // Calculates today's date so users can't pick past dates in the calendar
  get minDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  constructor() {}

  // Tracking which form fields have been clicked/touched
  formTouched = {
    title: false,
    time: false,
    location: false,
    description: false
  };

  // Stores error messages to show the user
  formErrors = {
    title: '',
    time: '',
    location: '',
    description: ''
  };

  // Runs when the page loads
  ngOnInit() {
    // If there is already data, skip the welcome screen
    if (this.timeline().days.length > 0) {
      this.showHero = false;
    }
  }

  // --- Validation Logic ---
  // Checks if the form is filled out correctly before saving
  validateForm(): boolean {
    let isValid = true;
    
    const hasLetter = /[a-zA-Z]/.test(this.formData.title);

    // Title validation: Required, must have letters, and length between 3-50
    if (!this.formData.title || this.formData.title.trim() === '') {
      this.formErrors.title = 'Title is required';
      isValid = false;
    } else if (!hasLetter) {
      this.formErrors.title = 'Invalid title (must contain letters)';
      isValid = false;
    } else if (this.formData.title.trim().length < 3) {
      this.formErrors.title = 'Title must be at least 3 characters';
      isValid = false;
    } else if (this.formData.title.trim().length > 50) {
      this.formErrors.title = 'Title is too long (max 50 chars)';
      isValid = false;
    } else {
      this.formErrors.title = '';
    }

    // Time validation: Required, cannot be duplicate, and must be in future for today
    if (!this.formData.time) {
      this.formErrors.time = 'Time is required';
      isValid = false;
    } else {
      const day = this.timeline().days.find(d => d.id === this.selectedDayId);
      if (day) {
        // Check if another event already has this exact time
        const isTimeTaken = day.events.some(e => {
          if (this.editingEventId && e.id === this.editingEventId) return false;
          return e.time === this.formData.time;
        });

        if (isTimeTaken) {
          this.formErrors.time = 'An event already exists at this time';
          isValid = false;
        } else {
          // If the day is "Today", check if the chosen time has already passed
          const dDate = new Date(day.date);
          const now = new Date();
          
          if (dDate.getFullYear() === now.getFullYear() && 
              dDate.getMonth() === now.getMonth() && 
              dDate.getDate() === now.getDate()) {
            
            const [h, m] = this.formData.time.split(':').map(Number);
            const eventTime = new Date();
            eventTime.setHours(h, m, 0, 0);

            if (eventTime < now) {
              this.formErrors.time = 'Time must be in the future';
              isValid = false;
            } else {
              this.formErrors.time = '';
            }
          } else {
            this.formErrors.time = '';
          }
        }
      } else {
        this.formErrors.time = '';
      }
    }

    // Location validation: Required, must have letters, length 3-100
    const hasLetterLoc = /[a-zA-Z]/.test(this.formData.location);
    if (!this.formData.location || this.formData.location.trim() === '') {
      this.formErrors.location = 'Location is required';
      isValid = false;
    } else if (!hasLetterLoc) {
      this.formErrors.location = 'Invalid location (must contain letters)';
      isValid = false;
    } else if (this.formData.location.trim().length < 3) {
      this.formErrors.location = 'Location must be at least 3 characters';
      isValid = false;
    } else if (this.formData.location.trim().length > 100) {
      this.formErrors.location = 'Location is too long (max 100 chars)';
      isValid = false;
    } else {
      this.formErrors.location = '';
    }

    // Description validation: Optional, but if typed, must have letters and be < 200 chars
    if (this.formData.description && this.formData.description.trim().length > 0) {
      const hasLetterDesc = /[a-zA-Z]/.test(this.formData.description);
      if (!hasLetterDesc) {
        this.formErrors.description = 'Invalid description (must contain letters)';
        isValid = false;
      } else if (this.formData.description.length > 200) {
        this.formErrors.description = 'Description is too long (max 200 chars)';
        isValid = false;
      } else {
        this.formErrors.description = '';
      }
    } else {
      this.formErrors.description = '';
    }

    return isValid;
  }

  // Marks a field as "visited" so we can show error messages
  handleBlur(field: 'title' | 'time' | 'location' | 'description') {
    this.formTouched[field] = true;
    this.validateForm();
  }

  // Helper to disable the "Save" button if there are errors
  get isFormInvalid(): boolean {
    const title = this.formData.title ? this.formData.title.trim() : '';
    const hasLetterTitle = /[a-zA-Z]/.test(title);
    
    const location = this.formData.location ? this.formData.location.trim() : '';
    const hasLetterLoc = /[a-zA-Z]/.test(location);

    const description = this.formData.description ? this.formData.description.trim() : '';
    const hasLetterDesc = description.length > 0 ? /[a-zA-Z]/.test(description) : true;

    if (!title || !hasLetterTitle || title.length < 3 || title.length > 50) return true;
    if (!location || !hasLetterLoc || location.length < 3 || location.length > 100) return true;
    if (description.length > 0 && (!hasLetterDesc || description.length > 200)) return true;
    if (!this.formData.time) return true;

    const day = this.timeline().days.find(d => d.id === this.selectedDayId);
    if (day) {
      const isTimeTaken = day.events.some(e => {
        if (this.editingEventId && e.id === this.editingEventId) return false;
        return e.time === this.formData.time;
      });
      if (isTimeTaken) return true;

      const dDate = new Date(day.date);
      const now = new Date();
      if (dDate.getFullYear() === now.getFullYear() && 
          dDate.getMonth() === now.getMonth() && 
          dDate.getDate() === now.getDate()) {
        const [h, m] = this.formData.time.split(':').map(Number);
        const eventTime = new Date();
        eventTime.setHours(h, m, 0, 0);
        if (eventTime < now) return true;
      }
    }

    return false;
  }

  // --- Date Picker Logic ---
  // Runs when a user picks a new date for a day
  onDateChange(event: any, dayId: string) {
    const newDateStr = event.target.value; 
    if (!newDateStr) return;

    const [y, m, d] = newDateStr.split('-').map(Number);
    const newDate = new Date(y, m - 1, d); 
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validation: Don't allow past dates
    if (newDate < today) {
      Swal.fire({
        title: 'Invalid Date',
        text: 'You cannot select a date in the past.',
        icon: 'error',
        confirmButtonColor: '#007BFF'
      });
      event.target.value = ''; 
      return;
    }

    // Validation: Don't allow same date for multiple days
    const [year, month, day] = newDateStr.split('-').map(Number);
    const existingDays = this.timeline().days;
    
    const isDateTaken = existingDays.some(d => {
      if (d.id === dayId) return false; 
      
      const dDate = new Date(d.date);
      if (isNaN(dDate.getTime())) return false;
      
      return dDate.getFullYear() === year && 
             dDate.getMonth() === (month - 1) && 
             dDate.getDate() === day;
    });

    if (isDateTaken) {
      Swal.fire({
        title: 'Date Already Taken',
        text: 'This date is already assigned to another day in your itinerary.',
        icon: 'warning',
        confirmButtonColor: '#007BFF'
      });
      event.target.value = ''; 
      return;
    }

    // Update the date in our database/service
    this.timelineService.updateDayDate(dayId, newDateStr);
  }

  // Opens the browser's native date picker when clicking our custom date UI
  triggerDatePicker(dayId: string) {
    const picker = document.getElementById('date-picker-' + dayId) as HTMLInputElement;
    if (picker) {
      picker.showPicker(); 
    }
  }

  // Helper for drag and drop to know which containers are linked
  get connectedTo(): string[] {
    return this.timeline().days.map(d => d.id);
  }

  // --- Day logic methods ---
  startItinerary() {
    this.showHero = false;
  }

  addNewDay() {
    this.timelineService.addDay();
  }

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
  
  // Counts how many tasks are marked "Completed" in a day
  completedCount(day: TimelineDay): number {
    return day.events.filter(e => e.status === 'Completed').length;
  }

  // Calculates the progress bar percentage for a day
  completionPercentage(day: TimelineDay): number {
    if (day.events.length === 0) return 0;
    return Math.round((this.completedCount(day) / day.events.length) * 100);
  }

  // Handles moving events up/down or between different days
  drop(event: CdkDragDrop<any>) {
    const currentDayId = event.container.id; 
    
    if (event.previousContainer === event.container) {
      this.timelineService.reorderEvents(currentDayId, currentDayId, event.previousIndex, event.currentIndex);
    } else {
      this.timelineService.reorderEvents(event.previousContainer.id, currentDayId, event.previousIndex, event.currentIndex);
    }
  }

  // Returns the correct icon name based on event type (Hotel, Food, etc)
  getCategoryIcon(eventItem: TimelineEvent): string {
    switch (eventItem.category) {
      case 'Hotel': return 'domain'; 
      case 'Dining': return 'restaurant';
      case 'Sightseeing': return 'camera_alt';
      case 'Transport': return 'local_taxi'; 
      default: return 'event';
    }
  }

  // Returns CSS class for coloring based on event type
  getCategoryClass(eventItem: TimelineEvent): string {
    switch (eventItem.category) {
      case 'Hotel': return 'cat-hotel';
      case 'Dining': return 'cat-dining';
      case 'Sightseeing': return 'cat-sightseeing';
      case 'Transport': return 'cat-transport';
      default: return 'cat-hotel';
    }
  }

  // Switches an event between "Pending" and "Completed"
  toggleStatus(dayId: string, eventItem: TimelineEvent) {
    this.timelineService.toggleEventStatus(dayId, eventItem.id);
  }

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
  // Prepares the form to add a new activity
  openAddEventModal(dayId: string) {
    this.selectedDayId = dayId;
    this.editingEventId = null;
    this.formData = { title: '', time: '', location: '', category: 'Sightseeing', description: '', status: 'Pending' };
    this.formTouched = { title: false, time: false, location: false, description: false };
    this.formErrors = { title: '', time: '', location: '', description: '' };
    this.isModalOpen = true;
  }

  // Loads existing data into the form to edit an activity
  openEditEventModal(dayId: string, eventItem: TimelineEvent) {
    this.selectedDayId = dayId;
    this.editingEventId = eventItem.id;
    this.formData = { ...eventItem };
    this.formTouched = { title: false, time: false, location: false, description: false };
    this.formErrors = { title: '', time: '', location: '', description: '' };
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  // Runs when user clicks "Save" in the popup
  onSubmit(e: Event) {
    e.preventDefault();
    
    // Mark everything as touched to show errors if any
    this.formTouched = { title: true, time: true, location: true, description: true };
    
    if (this.validateForm() && this.selectedDayId) {
      if (this.editingEventId) {
        this.timelineService.updateEvent(this.selectedDayId, { ...this.formData, id: this.editingEventId, dayId: this.selectedDayId } as TimelineEvent);
      } else {
        this.timelineService.addEvent(this.selectedDayId, { ...this.formData, dayId: this.selectedDayId });
      }
      
      // Reset form and close
      this.formData = { title: '', time: '', location: '', category: 'Sightseeing', description: '', status: 'Pending' };
      this.editingEventId = null;
      this.closeModal();
    }
  }

  // Opens Google Calendar to save the trip events
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
  get totalActivities(): number {
    return this.timeline().days.reduce((acc, day) => acc + day.events.length, 0);
  }

  get completedActivities(): number {
    return this.timeline().days.reduce((acc, day) => acc + day.events.filter(e => e.status === 'Completed').length, 0);
  }
}