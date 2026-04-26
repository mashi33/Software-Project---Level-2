import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Booking } from '../../models/transport.model';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { TransportBookingService } from '../../services/transport-booking.service';
import { TransportVehicleService } from '../../services/transport-vehicle.service';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-bookings.html',
  styleUrl: './my-bookings.css'
})
/**
 * This component displays a list of bookings.
 * It has two views: 
 * 1. User View: Shows trips booked by the traveler.
 * 2. Provider View: Shows requests received by the vehicle owner.
 */
export class MyBookings implements OnInit {
  // role: 'user' means traveler, 'provider' means vehicle owner
  @Input() role: 'user' | 'provider' = 'user'; 
  
  userBookings: Booking[] = []; // List of bookings for the traveler
  providerBookings: Booking[] = []; // List of requests for the owner

  // Rating Modal state
  showRatingModal: boolean = false;
  selectedBooking: Booking | null = null;
  tempRating: number = 0; // Selected star rating (1-5)
  tempComment: string = ''; // User's review text
  showSuccessMessage: boolean = false; // Shows "Thank you" after rating
  
  // Navigation helper to go back to search
  @Output() switchTab = new EventEmitter<'search' | 'bookings'>();

  constructor(
    private transportBookingService: TransportBookingService,
    private transportVehicleService: TransportVehicleService
  ) {}

  // Automatically load data when the page opens
  ngOnInit() {
    this.loadBookings(); 
  }

  /**
   * Fetches the booking list from the database based on the user's role.
   */
  loadBookings() {
    if (this.role === 'user') {
      // Load traveler's bookings (using mock ID 'u1')
      this.transportBookingService.getUserBookings('u1').subscribe(res => {
        this.userBookings = res;
        this.enrichBookings(this.userBookings);
      });
    } else {
      // Load provider's requests (using mock ID 'p1')
      this.transportBookingService.getProviderBookings('p1').subscribe(res => {
        this.providerBookings = res;
        this.enrichBookings(this.providerBookings);
      });
    }
  }

  /**
   * If a booking record is missing the provider's phone or name, 
   * this function fetches that info from the vehicle service.
   */
  private enrichBookings(bookings: Booking[]) {
    bookings.forEach(b => {
      if (!b.providerPhone && b.vehicleId) {
        this.transportVehicleService.getVehicleById(b.vehicleId).subscribe({
          next: (v) => {
            if (v && v.providerProfile) {
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
   * Allows a traveler to cancel a pending booking request.
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
          Swal.fire('Cancelled', 'Your booking has been cancelled.', 'success');
        });
      }
    });
  }

  /**
   * Opens the rating popup window.
   */
  openRatingModal(booking: Booking) {
    this.selectedBooking = booking;
    this.tempRating = 0;
    this.tempComment = '';
    this.showSuccessMessage = false;
    this.showRatingModal = true;
  }

  closeModal() {
    this.showRatingModal = false;
    this.selectedBooking = null;
  }

  setRating(rating: number) {
    this.tempRating = rating;
  }

  /**
   * Submits the user's review and rating to the server.
   */
  submitReview() {
    if (!this.selectedBooking || !this.selectedBooking.id) return;
    
    // Check if stars are selected
    if (this.tempRating === 0) {
      Swal.fire('Rating Required', 'Please select a star rating.', 'warning');
      return;
    }

    // Check if comment length is between 10 and 500 characters
    if (!this.tempComment || this.tempComment.trim().length < 10) {
      Swal.fire('Comment Too Short', 'Please write at least 10 characters.', 'warning');
      return;
    }
    if (this.tempComment.length > 500) {
      Swal.fire('Comment Too Long', 'Please keep it under 500 characters.', 'warning');
      return;
    }

    const reviewData = {
      userName: this.selectedBooking.userName || 'Anonymous User',
      rating: this.tempRating,
      comment: this.tempComment.trim(),
      date: new Date().toISOString().split('T')[0]
    };

    // 1. Add review to vehicle profile
    this.transportVehicleService.addVehicleReview(this.selectedBooking.vehicleId, reviewData).subscribe({
      next: () => {
        // 2. Mark this specific booking as 'Rated'
        if (this.selectedBooking?.id) {
          this.transportBookingService.markBookingAsRated(this.selectedBooking.id).subscribe({
            next: () => {
              this.showSuccessMessage = true;
              if (this.selectedBooking) this.selectedBooking.hasBeenRated = true;
              
              // Close modal after a short delay
              setTimeout(() => {
                this.closeModal();
                this.loadBookings();
              }, 1500);
            },
            error: () => Swal.fire('Error', 'Failed to update booking status.', 'error')
          });
        }
      },
      error: (err) => Swal.fire('Error', err.error?.message || 'Failed to submit review.', 'error')
    });
  }

  /**
   * Provider action: Confirms a booking request.
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
   * Provider action: Rejects a booking request.
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
   * Permanently deletes a booking record from the traveler's history.
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
        this.transportBookingService.deleteBooking(booking.id).subscribe(() => {
          Swal.fire('Removed', 'The booking has been removed.', 'success');
          this.loadBookings();
        });
      }
    });
  }

  goToSearch() {
    this.switchTab.emit('search');
  }

  /**
   * Shows a loading spinner and reloads the booking data.
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
