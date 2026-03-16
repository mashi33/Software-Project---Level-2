import { Component, inject } from '@angular/core';
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
  imports: [CommonModule, DragDropModule, MatButtonModule, MatIconModule, FormsModule, RouterLink],

  templateUrl: './trip-timeline.html',
  styleUrl: './trip-timeline.css'
})
export class TripTimelineComponent {
  // Injecting the service that handles all our data
  private timelineService = inject(TimelineService);
  
  // This signal holds the current timeline data and updates UI automatically
  timeline = this.timelineService.timeline;
  
  // Controls whether the hero landing section or the timeline itself is visible
  showHero = true;

  // Controls whether the Add Event popup is visible
  isModalOpen = false;
  
  editingEventId: string | null = null; // Tracks if we are editing an existing event

  formData = {
    title: '',
    time: '',
    location: '',
    category: 'Sightseeing' as 'Hotel' | 'Dining' | 'Sightseeing' | 'Transport',
    description: '',
    status: 'Pending' as 'Pending' | 'Completed'
  };
  selectedDayId: string = ''; // The ID of the day where the add/edit button was clicked

  // --- Validation State ---
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

  validateForm(): boolean {
    let isValid = true;
    
    // Title validation
    if (!this.formData.title || this.formData.title.trim() === '') {
      this.formErrors.title = 'Title is required';
      isValid = false;
    } else {
      this.formErrors.title = '';
    }

    // Time validation
    if (!this.formData.time) {
      this.formErrors.time = 'Time is required';
      isValid = false;
    } else {
      this.formErrors.time = '';
    }

    // Location validation
    if (!this.formData.location || this.formData.location.trim() === '') {
      this.formErrors.location = 'Location is required';
      isValid = false;
    } else {
      this.formErrors.location = '';
    }

    return isValid;
  }

  handleBlur(field: 'title' | 'time' | 'location') {
    this.formTouched[field] = true;
    this.validateForm();
  }

  get isFormInvalid(): boolean {
    return !this.formData.title || !this.formData.time || !this.formData.location;
  }

  // --- Date Picker Logic ---
  onDateChange(event: any, dayId: string) {
    const newDate = event.target.value;
    if (newDate) {
      this.timelineService.updateDayDate(dayId, newDate);
    }
  }

  triggerDatePicker(dayId: string) {
    const picker = document.getElementById('date-picker-' + dayId) as HTMLInputElement;
    if (picker) {
      picker.showPicker(); // Modern browser API to trigger the picker
    }
  }

  // Expose connected boundaries helper for drag and drop
  // This tells Angular which lists an event can be dropped into
  get connectedTo(): string[] {
    return this.timeline().days.map(d => d.id);
  }

  // --- Day logic methods ---
  // --- Navigation/Flow logic ---
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

  getDayIndex(day: TimelineDay): number {
    const days = this.timeline().days;
    return days.findIndex(d => d.id === day.id) + 1;
  }
  
  completedCount(day: TimelineDay): number {
    return day.events.filter(e => e.status === 'Completed').length;
  }

  completionPercentage(day: TimelineDay): number {
    if (day.events.length === 0) return 0;
    return Math.round((this.completedCount(day) / day.events.length) * 100);
  }

  // This method runs when an event is dragged and dropped
  drop(event: CdkDragDrop<any>) {
    const currentDayId = event.container.id; 
    
    // Check if the event was moved in the same list or to a different day
    if (event.previousContainer === event.container) {
      this.timelineService.reorderEvents(currentDayId, currentDayId, event.previousIndex, event.currentIndex);
    } else {
      this.timelineService.reorderEvents(event.previousContainer.id, currentDayId, event.previousIndex, event.currentIndex);
    }
  }

  // --- Event logic methods ---
  getCategoryIcon(eventItem: TimelineEvent): string {
    switch (eventItem.category) {
      case 'Hotel': return 'domain'; // Domain icon looks like a building
      case 'Dining': return 'restaurant';
      case 'Sightseeing': return 'camera_alt';
      case 'Transport': return 'local_taxi'; // Nice distinct car icon
      default: return 'event';
    }
  }

  getCategoryClass(eventItem: TimelineEvent): string {
    switch (eventItem.category) {
      case 'Hotel': return 'cat-hotel';
      case 'Dining': return 'cat-dining';
      case 'Sightseeing': return 'cat-sightseeing';
      case 'Transport': return 'cat-transport';
      default: return 'cat-hotel';
    }
  }

  toggleStatus(dayId: string, eventItem: TimelineEvent) {
    this.timelineService.toggleEventStatus(dayId, eventItem.id);
  }

  // Deletes an event
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

  // --- Modal logic methods ---
  openAddEventModal(dayId: string) {
    this.selectedDayId = dayId;
    this.editingEventId = null;
    this.formData = { title: '', time: '', location: '', category: 'Sightseeing', description: '', status: 'Pending' };
    this.formTouched = { title: false, time: false, location: false };
    this.formErrors = { title: '', time: '', location: '' };
    this.isModalOpen = true;
  }

  openEditEventModal(dayId: string, eventItem: TimelineEvent) {
    this.selectedDayId = dayId;
    this.editingEventId = eventItem.id;
    this.formData = { ...eventItem };
    this.formTouched = { title: false, time: false, location: false };
    this.formErrors = { title: '', time: '', location: '' };
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  // This saves the new or edited event from the form
  onSubmit(e: Event) {
    e.preventDefault();
    
    // Mark all fields as touched to show errors if user tries to submit empty
    this.formTouched = { title: true, time: true, location: true };
    
    if (this.validateForm() && this.selectedDayId) {
      if (this.editingEventId) {
        // Send updated data to the service. We know the dayId is the same.
        this.timelineService.updateEvent(this.selectedDayId, { ...this.formData, id: this.editingEventId, dayId: this.selectedDayId } as TimelineEvent);
      } else {
        // Brand new event
        this.timelineService.addEvent(this.selectedDayId, { ...this.formData, dayId: this.selectedDayId });
      }
      
      // Reset form fields back to default
      this.formData = { title: '', time: '', location: '', category: 'Sightseeing', description: '', status: 'Pending' };
      this.editingEventId = null;
      this.closeModal();
    }
  }

  // --- Export logic ---
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