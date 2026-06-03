/**
 * This component manages the "My Bookings" page.
 * It shows travelers their trip history and vehicle owners their customer requests.
 */

import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Booking } from '../../models/transport.model';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { TransportBookingService } from '../../services/transport-booking.service';
import { TransportVehicleService } from '../../services/transport-vehicle.service';

@Component({
    selector: 'app-my-bookings',
    imports: [CommonModule, FormsModule],
    templateUrl: './my-bookings.html',
    styleUrl: './my-bookings.css'
})
export class MyBookings implements OnInit {
  // role: 'user' means traveler view, 'provider' means vehicle owner view
  @Input() role: 'user' | 'provider' = 'user'; 
  
  userBookings: Booking[] = [];      // Trips booked by the traveler
  providerBookings: Booking[] = [];  // Requests received by the vehicle owner

  // --- Rating Modal State ---
  showRatingModal: boolean = false;
  selectedBooking: Booking | null = null;
  tempRating: number = 0;           // Number of stars selected (1-5)
  tempComment: string = '';         // Review text typed by the user
  showSuccessMessage: boolean = false; 
  
  // Event to tell the parent component to switch back to the search page
  @Output() switchTab = new EventEmitter<'search' | 'bookings'>();

  constructor(
    private transportBookingService: TransportBookingService,
    private transportVehicleService: TransportVehicleService
  ) {}

  // Load the bookings as soon as the page opens
  ngOnInit() {
    this.loadBookings(); 
  }

  /**
   * Fetches the correct list of bookings from the database based on who is logged in.
   */
  loadBookings() {
    if (this.role === 'user') {
      // Load trips for the traveler (using mock user ID 'u1')
      this.transportBookingService.getUserBookings('u1').subscribe(res => {
        this.userBookings = res;
        this.enrichBookings(this.userBookings);
      });
    } else {
      // Load trip requests for the vehicle owner (using mock provider ID 'p1')
      this.transportBookingService.getProviderBookings('p1').subscribe(res => {
        this.providerBookings = res;
        this.enrichBookings(this.providerBookings);
      });
    }
  }

  /**
   * Sometimes booking records are missing the provider's phone number.
   * This helper function looks up the vehicle details to fill in the missing info.
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
    this.showSuccessMessage = false;
    this.showRatingModal = true;
  }

  closeModal() {
    this.showRatingModal = false;
    this.selectedBooking = null;
  }

  // Sets the star rating (1 to 5)
  setRating(rating: number) {
    this.tempRating = rating;
  }

  /**
   * Saves the user's review and marks the booking as "Rated" so they can't review it twice.
   */
  submitReview() {
    if (!this.selectedBooking || !this.selectedBooking.id) return;
    
    // Validation: Stars are mandatory
    if (this.tempRating === 0) {
      Swal.fire('Rating Required', 'Please select a star rating.', 'warning');
      return;
    }

    // Validation: Comment must be at least 10 characters long
    if (!this.tempComment || this.tempComment.trim().length < 10) {
      Swal.fire('Comment Too Short', 'Please write at least 10 characters.', 'warning');
      return;
    }
    
    // Validation: Comment cannot exceed 500 characters
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

    // Step 1: Save the review to the vehicle's profile
    this.transportVehicleService.addVehicleReview(this.selectedBooking.vehicleId, reviewData).subscribe({
      next: () => {
        // Step 2: Update the booking record to remember it has been rated
        if (this.selectedBooking?.id) {
          this.transportBookingService.markBookingAsRated(this.selectedBooking.id).subscribe({
            next: () => {
              this.showSuccessMessage = true;
              if (this.selectedBooking) this.selectedBooking.hasBeenRated = true;
              
              // Close the popup after a short success pause
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
        this.transportBookingService.deleteBooking(booking.id).subscribe(() => {
          Swal.fire('Removed', 'The booking has been removed.', 'success');
          this.loadBookings();
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
