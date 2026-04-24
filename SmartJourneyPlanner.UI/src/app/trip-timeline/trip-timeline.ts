// src/app/trip-timeline/trip-timeline.ts

import { Component, inject, OnInit } from '@angular/core';
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
export class TripTimelineComponent implements OnInit {
  private timelineService = inject(TimelineService);
  
  timeline = this.timelineService.timeline;
  showHero = true;
  isModalOpen = false;
  editingEventId: string | null = null; 

  formData = {
    title: '',
    time: '',
    location: '',
    category: 'Sightseeing' as 'Hotel' | 'Dining' | 'Sightseeing' | 'Transport',
    description: '',
    status: 'Pending' as 'Pending' | 'Completed'
  };
  
  selectedDayId: string = ''; 

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

  constructor() {}

  ngOnInit() {
    if (this.timeline().days.length > 0) {
      this.showHero = false;
    }
  }

  /**
   * MISSING FUNCTIONS ADDED BELOW TO FIX COMPILATION ERRORS
   */

  // 1. Get the index of the day (e.g., Day 1, Day 2)
  getDayIndex(day: TimelineDay): number {
    return this.timeline().days.findIndex(d => d.id === day.id) + 1;
  }

  // 2. Returns a CSS class name based on the activity category
  getCategoryClass(eventItem: TimelineEvent): string {
    return eventItem.category ? eventItem.category.toLowerCase() : 'default';
  }

  // 3. Closes the Add/Edit activity modal
  closeModal() {
    this.isModalOpen = false;
    this.editingEventId = null;
    // Reset validation errors when closing
    this.formErrors = { title: '', time: '', location: '' };
  }

  // 4. Getter to check if the form is invalid (used for button disabling)
  get isFormInvalid(): boolean {
    return !this.formData.title || !this.formData.time || !this.formData.location;
  }

  // --- Logic Functions ---

  validateForm(): boolean {
    let isValid = true;
    if (!this.formData.title?.trim()) {
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

    if (!this.formData.location?.trim()) {
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

  onDateChange(event: any, dayId: string) {
    const newDate = event.target.value;
    if (newDate) {
      this.timelineService.updateDayDate(dayId, newDate);
    }
  }

  triggerDatePicker(dayId: string) {
    const picker = document.getElementById('date-picker-' + dayId) as HTMLInputElement;
    if (picker) {
      picker.showPicker(); 
    }
  }

  get connectedTo(): string[] {
    return this.timeline().days.map(d => d.id);
  }

  startItinerary() {
    this.showHero = false;
  }

  addNewDay() {
    this.timelineService.addDay();
  }

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

  completedCount(day: TimelineDay): number {
    return day.events.filter(e => e.status === 'Completed').length;
  }

  completionPercentage(day: TimelineDay): number {
    if (day.events.length === 0) return 0;
    return Math.round((this.completedCount(day) / day.events.length) * 100);
  }

  drop(event: CdkDragDrop<any>) {
    const currentDayId = event.container.id; 
    if (event.previousContainer === event.container) {
      this.timelineService.reorderEvents(currentDayId, currentDayId, event.previousIndex, event.currentIndex);
    } else {
      this.timelineService.reorderEvents(event.previousContainer.id, currentDayId, event.previousIndex, event.currentIndex);
    }
  }

  getCategoryIcon(eventItem: TimelineEvent): string {
    switch (eventItem.category) {
      case 'Hotel': return 'domain'; 
      case 'Dining': return 'restaurant';
      case 'Sightseeing': return 'camera_alt';
      case 'Transport': return 'local_taxi'; 
      default: return 'event';
    }
  }

  toggleStatus(dayId: string, eventItem: TimelineEvent) {
    this.timelineService.toggleEventStatus(dayId, eventItem.id);
  }

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

  openAddEventModal(dayId: string) {
    this.selectedDayId = dayId;
    this.editingEventId = null;
    this.formData = { title: '', time: '', location: '', category: 'Sightseeing', description: '', status: 'Pending' };
    this.isModalOpen = true;
  }

  openEditEventModal(dayId: string, eventItem: TimelineEvent) {
    this.selectedDayId = dayId;
    this.editingEventId = eventItem.id;
    this.formData = { ...eventItem };
    this.isModalOpen = true;
  }

  onSubmit(e: Event) {
    e.preventDefault();
    if (this.validateForm() && this.selectedDayId) {
      if (this.editingEventId) {
        this.timelineService.updateEvent(this.selectedDayId, { ...this.formData, id: this.editingEventId, dayId: this.selectedDayId } as TimelineEvent);
      } else {
        this.timelineService.addEvent(this.selectedDayId, { ...this.formData, dayId: this.selectedDayId });
      }
      this.closeModal();
    }
  }

  exportToCalendar() {
    if (this.totalActivities === 0) {
      Swal.fire('Empty Timeline', 'Please add some activities before exporting.', 'warning');
      return;
    }
    CalendarSyncUtil.openInGoogleCalendar(this.timeline());
  }

  get totalActivities(): number {
    return this.timeline().days.reduce((acc, day) => acc + day.events.length, 0);
  }

  get completedActivities(): number {
    return this.timeline().days.reduce((acc, day) => acc + day.events.filter(e => e.status === 'Completed').length, 0);
  }
}