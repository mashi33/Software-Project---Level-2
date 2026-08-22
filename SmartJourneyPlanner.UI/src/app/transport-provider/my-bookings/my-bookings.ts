/**
 * This component manages the "My Bookings" page.
 * It shows travelers their trip history and vehicle owners their customer requests.
 */

import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Booking } from '../../models/transport.model';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';
import { TransportBookingService } from '../../services/transport-booking.service';
import { TransportVehicleService } from '../../services/transport-vehicle.service';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'app-my-bookings',
    imports: [CommonModule, FormsModule],
    templateUrl: './my-bookings.html',
    styleUrl: './my-bookings.css'
})
export class MyBookings implements OnInit {
  // role: 'user' means traveler view, 'provider' means vehicle owner view
  @Input() role: 'user' | 'provider' = 'user'; 
  @Input() targetBookingId: string | null = null;
  
  userBookings: Booking[] = [];      // Trips booked by the traveler
  providerBookings: Booking[] = [];  // Requests received by the vehicle owner
  loading: boolean = true;           // Loading indicator state

  // --- Rating Modal State ---
  showRatingModal: boolean = false;
  selectedBooking: Booking | null = null;
  tempRating: number = 0;           // Number of stars selected (1-5)
  tempComment: string = '';         // Review text typed by the user
  commentError: string = '';        // Validation error message
  showSuccessMessage: boolean = false; 
  isSubmittingReview: boolean = false; // Loading state for review submission
  
  // Event to tell the parent component to switch back to the search page
  @Output() switchTab = new EventEmitter<'search' | 'bookings'>();

  constructor(
    private transportBookingService: TransportBookingService,
    private transportVehicleService: TransportVehicleService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  // Load the bookings as soon as the page opens
  ngOnInit() {
    this.loadBookings(); 
  }

  /**
   * Fetches the correct list of bookings from the database based on who is logged in.
   * ⚡ Uses Stale-While-Revalidate caching for 0ms instant display.
   */
  loadBookings(forceRefresh = false) {
    if (this.role === 'user') {
      const travelerId = this.authService.getUserId();
      if (!travelerId) { this.loading = false; return; }

      // 🏎️ Instant 0ms render from memory cache if available
      const cached = this.transportBookingService.getCachedUserBookings(travelerId);
      if (cached && cached.length > 0) {
        this.userBookings = this.sortUserBookings(cached);
        this.loading = false;
      } else {
        this.loading = true;
      }

      this.transportBookingService.getUserBookings(travelerId, forceRefresh).subscribe({
        next: (res) => {
          this.userBookings = this.sortUserBookings(res);
          this.enrichBookings(this.userBookings);
          this.loading = false;
          this.scrollToTargetBooking();
        },
        error: () => {
          this.loading = false;
        }
      });
    } else {
      const providerId = this.authService.getUserEmail();
      if (!providerId) { this.loading = false; return; }

      // 🏎️ Instant 0ms render from memory cache if available
      const cached = this.transportBookingService.getCachedProviderBookings(providerId);
      if (cached && cached.length > 0) {
        this.providerBookings = cached;
        this.loading = false;
      } else {
        this.loading = true;
      }

      this.transportBookingService.getProviderBookings(providerId, forceRefresh).subscribe({
        next: (res) => {
          this.providerBookings = res;
          this.enrichBookings(this.providerBookings);
          this.loading = false;
          this.scrollToTargetBooking();
        },
        error: () => {
          this.loading = false;
        }
      });
    }
  }

  /**
   * Sorts traveler bookings so that active/pending/confirmed (newest first) appear at the top,
   * while completed, cancelled, and rejected bookings appear at the bottom.
   */
  private sortUserBookings(bookings: Booking[]): Booking[] {
    if (!bookings || bookings.length === 0) return [];
    
    const isPastOrInactive = (status: string) => 
      status === 'Completed' || status === 'Cancelled' || status === 'Rejected';

    return [...bookings].sort((a, b) => {
      const aIsPast = isPastOrInactive(a.status);
      const bIsPast = isPastOrInactive(b.status);

      // Active / Confirmed / Pending come before Completed / Cancelled / Rejected
      if (!aIsPast && bIsPast) return -1;
      if (aIsPast && !bIsPast) return 1;

      // Within the same group, sort newest first (by createdAt or startDate)
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : (a.startDate ? new Date(a.startDate).getTime() : 0);
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : (b.startDate ? new Date(b.startDate).getTime() : 0);
      return dateB - dateA;
    });
  }

  scrollToTargetBooking() {
    if (this.targetBookingId) {
      setTimeout(() => {
        const element = document.querySelector(`.booking-highlighted`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('pulse-highlight');
          setTimeout(() => {
            element.classList.remove('pulse-highlight');
          }, 3000);
        }
        // Clear query parameter to avoid auto-scrolling on refreshes or subsequent navigation
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { bookingId: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      }, 800);
    }
  }

  private vehicleProfileCache = new Map<string, any>();

  /**
   * Sometimes booking records are missing the provider's phone number.
   * This helper function looks up the vehicle details to fill in the missing info.
   */
  private enrichBookings(bookings: Booking[]) {
    bookings.forEach(b => {
      if (!b.providerPhone && b.vehicleId) {
        if (this.vehicleProfileCache.has(b.vehicleId)) {
          const cachedProfile = this.vehicleProfileCache.get(b.vehicleId);
          if (cachedProfile) {
            b.providerPhone = cachedProfile.phone;
            if (!b.providerName) b.providerName = cachedProfile.name;
          }
          return;
        }

        this.transportVehicleService.getVehicleById(b.vehicleId).subscribe({
          next: (v) => {
            if (v && v.providerProfile) {
              this.vehicleProfileCache.set(b.vehicleId, v.providerProfile);
              b.providerPhone = v.providerProfile.phone;
              if (!b.providerName) b.providerName = v.providerProfile.name;
            }
          },
          error: () => {
            if (!b.providerPhone) b.providerPhone = 'Not available';
          }
        });
      }
    });
  }

  /**
   * Allows a traveler to cancel a trip request before it is confirmed.
   */
  cancelBooking(booking: Booking) {
    Swal.fire({
      title: 'Cancel Booking?',
      text: 'Are you sure you want to cancel this booking request?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        if (!booking.id) return;
        this.transportBookingService.updateBookingStatus(booking.id, 'Cancelled').subscribe(() => {
          booking.status = 'Cancelled';
          this.userBookings = this.sortUserBookings(this.userBookings);
          Swal.fire('Cancelled', 'Your booking has been cancelled.', 'success');
        });
      }
    });
  }

  /**
   * Opens the popup so the traveler can rate their trip.
   */
  openRatingModal(booking: Booking) {
    this.selectedBooking = booking;
    this.tempRating = 0;
    this.tempComment = '';
    this.commentError = '';
    this.showSuccessMessage = false;
    this.isSubmittingReview = false;
    this.showRatingModal = true;
  }

  closeModal() {
    this.showRatingModal = false;
    this.selectedBooking = null;
    this.isSubmittingReview = false;
  }

  // Sets the star rating (1 to 5)
  setRating(rating: number) {
    this.tempRating = rating;
  }

  /**
   * Saves the user's review and marks the booking as "Rated" in parallel.
   */
  submitReview() {
    if (!this.selectedBooking || !this.selectedBooking.id || this.isSubmittingReview) return;
    
    // Validation: Stars are mandatory
    if (this.tempRating === 0) {
      Swal.fire('Rating Required', 'Please select a star rating.', 'warning');
      return;
    }

    // Validation: Comment must be at least 10 characters long
    if (!this.tempComment || this.tempComment.trim().length < 10) {
      this.commentError = 'Please write at least 10 characters.';
      return;
    }
    
    this.commentError = ''; // Clear error if valid
    
    // Validation: Comment cannot exceed 500 characters
    if (this.tempComment.length > 500) {
      Swal.fire('Comment Too Long', 'Please keep it under 500 characters.', 'warning');
      return;
    }

    const bookingId = this.selectedBooking.id;
    const vehicleId = this.selectedBooking.vehicleId;
    const reviewData = {
      userName: this.selectedBooking.userName || 'Anonymous User',
      rating: this.tempRating,
      comment: this.tempComment.trim(),
      date: new Date().toISOString().split('T')[0]
    };

    this.isSubmittingReview = true;

    // Run both API operations in parallel for ultra-fast response
    forkJoin({
      reviewRes: this.transportVehicleService.addVehicleReview(vehicleId, reviewData),
      ratingRes: this.transportBookingService.markBookingAsRated(bookingId)
    }).subscribe({
      next: () => {
        this.showSuccessMessage = true;
        this.isSubmittingReview = false;
        
        // Update local state in-place for seamless 0-reload UI update
        if (this.selectedBooking) this.selectedBooking.hasBeenRated = true;
        const item = this.userBookings.find(b => b.id === bookingId);
        if (item) item.hasBeenRated = true;

        // Close the popup after a brief success acknowledgement without triggering a full page reload
        setTimeout(() => {
          this.closeModal();
        }, 1000);
      },
      error: (err) => {
        this.isSubmittingReview = false;
        Swal.fire('Error', err.error?.message || 'Failed to submit review.', 'error');
      }
    });
  }

  /**
   * Provider Action: Confirms a trip request from a customer.
   */
  acceptBooking(booking: Booking) {
    Swal.fire({
      title: 'Accept Request?',
      text: 'You are confirming availability for these dates.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      confirmButtonText: 'Yes, Accept'
    }).then((result) => {
      if (result.isConfirmed) {
        if (!booking.id) return;
        this.transportBookingService.updateBookingStatus(booking.id, 'Confirmed').subscribe(() => {
          booking.status = 'Confirmed';
          Swal.fire('Accepted', 'The booking is now confirmed.', 'success');
        });
      }
    });
  }

  /**
   * Provider Action: Declines a trip request.
   */
  rejectBooking(booking: Booking) {
    Swal.fire({
      title: 'Reject Request?',
      text: 'This will decline the user\'s trip request.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, Reject'
    }).then((result) => {
      if (result.isConfirmed) {
        if (!booking.id) return;
        this.transportBookingService.updateBookingStatus(booking.id, 'Rejected').subscribe(() => {
          booking.status = 'Rejected';
          Swal.fire('Rejected', 'The booking request was rejected.', 'success');
        });
      }
    });
  }

  /**
   * Deletes a booking record from the user's history list.
   */
  removeBooking(booking: Booking) {
    Swal.fire({
      title: 'Remove Booking?',
      text: 'This will permanently remove this record from your history.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, Remove'
    }).then((result) => {
      if (result.isConfirmed) {
        if (!booking.id) return;
        this.transportBookingService.deleteBooking(booking.id).subscribe({
          next: () => {
            // Remove immediately from memory for instant UI responsiveness without full page reload
            this.userBookings = this.userBookings.filter(b => b.id !== booking.id);
            this.providerBookings = this.providerBookings.filter(b => b.id !== booking.id);
            Swal.fire('Removed', 'The booking has been removed.', 'success');
          },
          error: () => {
            Swal.fire('Error', 'Failed to remove booking.', 'error');
          }
        });
      }
    });
  }

  // Switches the view back to the Vehicle Search page
  goToSearch() {
    this.switchTab.emit('search');
  }

  /**
   * Refreshes the data from the server with a nice loading effect.
   */
  refreshBookings() {
    Swal.fire({
      title: 'Refreshing...',
      timer: 1000,
      timerProgressBar: true,
      didOpen: () => Swal.showLoading()
    }).then(() => this.loadBookings());
  }
}
