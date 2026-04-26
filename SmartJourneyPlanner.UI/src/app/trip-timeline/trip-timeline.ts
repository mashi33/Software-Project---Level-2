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

  constructor() {}

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

  ngOnInit() {
    if (this.timeline().days.length > 0) {
      this.showHero = false;
    }
  }

  // --- Validation Logic ---
  // Checks if the form is filled out correctly before saving
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
      picker.showPicker(); 
    }
  }

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

  drop(event: CdkDragDrop<any>) {
    const currentDayId = event.container.id; 
    
    if (event.previousContainer === event.container) {
      this.timelineService.reorderEvents(currentDayId, currentDayId, event.previousIndex, event.currentIndex);
    } else {
      this.timelineService.reorderEvents(event.previousContainer.id, currentDayId, event.previousIndex, event.currentIndex);
    }
  }

  // --- Event logic methods ---
  getCategoryIcon(eventItem: TimelineEvent): string {
    switch (eventItem.category) {
      case 'Hotel': return 'domain'; 
      case 'Dining': return 'restaurant';
      case 'Sightseeing': return 'camera_alt';
      case 'Transport': return 'local_taxi'; 
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

  onSubmit(e: Event) {
    e.preventDefault();
    
    this.formTouched = { title: true, time: true, location: true };
    
    if (this.validateForm() && this.selectedDayId) {
      if (this.editingEventId) {
        this.timelineService.updateEvent(this.selectedDayId, { ...this.formData, id: this.editingEventId, dayId: this.selectedDayId } as TimelineEvent);
      } else {
        this.timelineService.addEvent(this.selectedDayId, { ...this.formData, dayId: this.selectedDayId });
      }
      
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