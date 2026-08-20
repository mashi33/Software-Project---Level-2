import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';

// Importing our own services and models
import { TimelineService } from '../services/timeline.service';
import { TripService } from '../services/trip.service'; // 👈 TripService injected for database role checks
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
export class TripTimelineComponent implements OnInit {
  // Accessing the shared TimelineService and other core dependencies
  private timelineService = inject(TimelineService);
  private tripService = inject(TripService);
  private cd = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Determines if the current user is a viewer (read-only) or an editor
  // Default = false so authorised travellers always see action buttons
  // unless the DB explicitly marks them as viewer/viewonly.
  isViewer: boolean = false;

  // User identity and trip security properties
  currentUserEmail: string = '';
  tripDetails: any = null;
  tripId: string = '';

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

  constructor() { }

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
    console.log('🚀 TripTimelineComponent Initialized!');

    // 1. Extract logged-in user email securely from JWT token
    this.extractLoggedInUser();

    // 2. Get tripId from URL query parameters (one-shot, safe for both snapshot & observable)
    //    Prefer snapshot first so we have the value synchronously.
    const snapshotTripId = this.route.snapshot.queryParamMap.get('tripId');
    if (snapshotTripId) {
      this.tripId = snapshotTripId;
      console.log('📌 tripId from snapshot:', this.tripId);
      this.loadTripAndCheckRole();
    } else {
      // Fallback: still subscribe in case the params arrive later (rare with queryParams)
      this.route.queryParams.subscribe(params => {
        console.log('🔍 URL Query Params (subscribe):', params);
        if (params['tripId'] && params['tripId'] !== this.tripId) {
          this.tripId = params['tripId'];
          this.loadTripAndCheckRole();
        }
      });
    }

    // Explicit fallback: no tripId → treat as editor (authorized traveller)
    if (!this.tripId) {
      console.warn('⚠️ No tripId found – defaulting isViewer = false');
      this.isViewer = false;
      this.cd.detectChanges();
    }

    // If there is already data, skip the welcome screen
    if (this.timeline().days.length > 0) {
      this.showHero = false;
    }
  }

  // Extracts user email from JWT token stored in localStorage
  private extractLoggedInUser(): void {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        this.currentUserEmail =
          tokenPayload.email ||
          tokenPayload.unique_name ||
          tokenPayload.sub ||
          tokenPayload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
          tokenPayload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
          '';
      }
    } catch (e) {
      console.error("Error parsing token identities:", e);
    }
  }

  // Fetches trip info from database and validates real permissions (Secure against URL tampering)
  private loadTripAndCheckRole() {
    if (!this.tripId) {
      console.warn('⚠️ loadTripAndCheckRole called without tripId – defaulting isViewer = false');
      this.isViewer = false;
      this.cd.detectChanges();
      return;
    }

    // Prefer a direct get-by-id if your TripService has it (mirrors TripSummaryComponent).
    // Fallback to getAllTrips() if getTripById is not available.
    const request$ = (this.tripService as any).getTripById
      ? (this.tripService as any).getTripById(this.tripId)
      : this.tripService.getAllTrips();

    request$.subscribe({
      next: (res: any) => {
        let selectedTrip: any = null;

        if (Array.isArray(res)) {
          // getAllTrips path
          selectedTrip = res.find((t: any) => (t._id || t.id) === this.tripId);
        } else {
          // getTripById path
          selectedTrip = res;
        }

        if (selectedTrip) {
          this.tripDetails = selectedTrip;
          this.checkUserTripRole();
        } else {
          console.warn('⚠️ Trip not found in response – defaulting isViewer = false');
          this.isViewer = false;
          this.cd.detectChanges();
        }
      },
      error: (err: any) => {
        console.error('Failed to load trip roles securely', err);
        // Robust fallback: on any loading failure, allow the authorised traveller to edit
        this.isViewer = false;
        this.cd.detectChanges();
      }
    });
  }

  // Validates if the user is a viewer or editor based strictly on database records
  private checkUserTripRole() {
    // Always start from the safe default for this component’s requirement
    this.isViewer = false;

    if (!this.tripDetails) {
      console.log('⚠️ Missing tripDetails – keeping isViewer = false');
      this.cd.detectChanges();
      return;
    }

    if (!this.currentUserEmail) {
      console.log('⚠️ Missing currentUserEmail – keeping isViewer = false (fallback)');
      this.cd.detectChanges();
      return;
    }

    const userEmail = this.currentUserEmail.trim().toLowerCase();
    console.log('🔍 Current Logged In Email:', userEmail);
    console.log('🔍 Trip Details Object:', this.tripDetails);

    // 1. Creator → full editor
    const creatorEmail = (this.tripDetails.createdBy || this.tripDetails.CreatedBy || '')
      .toString()
      .trim()
      .toLowerCase();

    if (creatorEmail && creatorEmail === userEmail) {
      this.isViewer = false;
      console.log('✅ User is the Creator. isViewer = false');
      this.cd.detectChanges();
      return;
    }

    // 2. Members array
    const members = this.tripDetails.members || this.tripDetails.Members || [];
    if (Array.isArray(members) && members.length > 0) {
      const memberRecord = members.find((m: any) => {
        const memberEmail = (m.email || m.Email || '').toString().trim().toLowerCase();
        return memberEmail === userEmail;
      });

      console.log('🔍 Found Member Record in DB:', memberRecord);

      if (memberRecord) {
        const memberRole = (memberRecord.role || memberRecord.Role || '')
          .toString()
          .trim()
          .toLowerCase();
        console.log('🔍 Member Role from DB:', memberRole);

        // Only these two values make the user a pure viewer
        this.isViewer = memberRole === 'viewer' || memberRole === 'viewonly';
      } else {
        console.log('⚠️ User not found in members list. Defaulting isViewer = false');
        this.isViewer = false;
      }
    } else {
      console.log('⚠️ No members array found – defaulting isViewer = false');
      this.isViewer = false;
    }

    console.log('🏁 Final Is Viewer Status:', this.isViewer);
    this.cd.detectChanges();
  }

  // --- Validation Logic ---
  validateForm(): boolean {
    let isValid = true;
    const hasLetter = /[a-zA-Z]/.test(this.formData.title);

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

    if (!this.formData.time) {
      this.formErrors.time = 'Time is required';
      isValid = false;
    } else {
      const day = this.timeline().days.find(d => d.id === this.selectedDayId);
      if (day) {
        const isTimeTaken = day.events.some(e => {
          if (this.editingEventId && e.id === this.editingEventId) return false;
          return e.time === this.formData.time;
        });

        if (isTimeTaken) {
          this.formErrors.time = 'An event already exists at this time';
          isValid = false;
        } else {
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

  handleBlur(field: 'title' | 'time' | 'location' | 'description') {
    this.formTouched[field] = true;
    this.validateForm();
  }

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

  onDateChange(event: any, dayId: string) {
    const newDateStr = event.target.value;
    if (!newDateStr) return;

    const [y, m, d] = newDateStr.split('-').map(Number);
    const newDate = new Date(y, m - 1, d);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

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

    this.timelineService.updateDayDate(dayId, newDateStr);
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
    if (this.isViewer) {
      Swal.fire('Access Denied', 'Viewers cannot add new days.', 'error');
      return;
    }
    this.timelineService.addDay();
  }

  deleteDay(dayId: string) {
    if (this.isViewer) {
      Swal.fire('Access Denied', 'Viewers cannot delete days.', 'error');
      return;
    }
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
    if (this.isViewer) {
      Swal.fire('Access Denied', 'Viewers cannot delete events.', 'error');
      return;
    }
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

  openAddEventModal(dayId: string) {
    if (this.isViewer) {
      Swal.fire('Access Denied', 'Viewers cannot add events.', 'error');
      return;
    }
    this.selectedDayId = dayId;
    this.editingEventId = null;
    this.formData = { title: '', time: '', location: '', category: 'Sightseeing', description: '', status: 'Pending' };
    this.formTouched = { title: false, time: false, location: false, description: false };
    this.formErrors = { title: '', time: '', location: '', description: '' };
    this.isModalOpen = true;
  }

  openEditEventModal(dayId: string, eventItem: TimelineEvent) {
    if (this.isViewer) {
      Swal.fire('Access Denied', 'Viewers cannot edit events.', 'error');
      return;
    }
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

  onSubmit(e: Event) {
    e.preventDefault();
    this.formTouched = { title: true, time: true, location: true, description: true };

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

  get totalActivities(): number {
    return this.timeline().days.reduce((acc, day) => acc + day.events.length, 0);
  }

  get completedActivities(): number {
    return this.timeline().days.reduce((acc, day) => acc + day.events.filter(e => e.status === 'Completed').length, 0);
  }
}