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
export class MyBookings implements OnInit {
  // Determines if we are looking at the page as a Traveler (user) or as a Transport Owner (provider)
  @Input() role: 'user' | 'provider' = 'user'; 
  
  userBookings: Booking[] = []; // Bookings made by the user
  providerBookings: Booking[] = []; // Bookings received by the provider

  // Variables to manage the Rating/Review popup window
  showRatingModal: boolean = false;
  selectedBooking: Booking | null = null;
  tempRating: number = 0; // Temporary star rating (1-5)
  tempComment: string = ''; // Temporary review text
  showSuccessMessage: boolean = false;
  
  // Event to tell the main page to switch back to the search view
  @Output() switchTab = new EventEmitter<'search' | 'bookings'>();

  constructor(
    private transportBookingService: TransportBookingService,
    private transportVehicleService: TransportVehicleService
  ) {}

  // This runs automatically when the component is created
  ngOnInit() {
    this.loadBookings(); 
  }

  // Load the list of bookings from the server
  loadBookings() {
    if (this.role === 'user') {
      // Get all trips booked by this user (u1 is a test user ID)
      this.transportBookingService.getUserBookings('u1').subscribe(res => {
        this.userBookings = res;
      });
    } else {
      // Get all trips requested from this provider (p1 is a test provider ID)
      this.transportBookingService.getProviderBookings('p1').subscribe(res => {
        this.providerBookings = res;
      });
    }
  }

  // Cancel a booking request (only works if the status is still 'Pending')
  cancelBooking(booking: Booking) {
    Swal.fire({
      title: 'Cancel Booking?',
      text: 'Are you sure you want to cancel this booking request?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        if (!booking.id) return;
        // Update the status to 'Cancelled' on the server
        this.transportBookingService.updateBookingStatus(booking.id, 'Cancelled').subscribe(() => {
          booking.status = 'Cancelled';
          Swal.fire('Cancelled', 'Your booking has been cancelled.', 'success');
        });
      }
    });
  }

  // Open the modal to let the user rate their completed trip
  openRatingModal(booking: Booking) {
    this.selectedBooking = booking;
    this.tempRating = 0; // Reset stars
    this.tempComment = ''; // Reset comment
    this.showSuccessMessage = false;
    this.showRatingModal = true;
  }

  // Close the rating modal without saving
  closeModal() {
    this.showRatingModal = false;
    this.selectedBooking = null;
  }

  // Set the number of stars selected by the user
  setRating(rating: number) {
    this.tempRating = rating;
  }

  // Send the review to the server
  submitReview() {
    if (!this.selectedBooking || !this.selectedBooking.id) return;
    
    // Prepare the review data object
    const reviewData = {
      userName: this.selectedBooking.userName || 'Anonymous User',
      rating: this.tempRating,
      comment: this.tempComment,
      date: new Date().toISOString().split('T')[0] // Get today's date in YYYY-MM-DD format
    };

    // Step 1: Add the review to the vehicle's review history
    this.transportVehicleService.addVehicleReview(this.selectedBooking.vehicleId, reviewData).subscribe({
      next: () => {
        // Step 2: Mark the booking as 'Rated' so the user doesn't rate it twice
        if (this.selectedBooking?.id) {
          this.transportBookingService.markBookingAsRated(this.selectedBooking.id).subscribe({
            next: () => {
              this.showSuccessMessage = true;
              if (this.selectedBooking) {
                this.selectedBooking.hasBeenRated = true;
              }
              
              // Wait a moment then close the modal and refresh the page
              setTimeout(() => {
                this.closeModal();
                this.loadBookings();
              }, 1500);
            },
            error: (err) => {
              Swal.fire('Error', 'Failed to update booking status.', 'error');
            }
          });
        }
      },
      error: (err) => {
        const msg = err.error?.message || 'Failed to submit review.';
        Swal.fire('Error', msg, 'error');
      }
    });
  }

  // Provider: Confirm that the vehicle is available for the requested dates
  acceptBooking(booking: Booking) {
    Swal.fire({
      title: 'Accept Request?',
      text: 'You are confirming availability for these dates.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
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

  // Provider: Reject a booking if the vehicle is not available
  rejectBooking(booking: Booking) {
    Swal.fire({
      title: 'Reject Request?',
      text: 'This will decline the user\'s trip request.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
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

  // Delete a booking from the history list permanently
  removeBooking(booking: Booking) {
    Swal.fire({
      title: 'Remove Booking?',
      text: 'This will permanently remove this record from your history.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Remove'
    }).then((result) => {
      if (result.isConfirmed) {
        if (!booking.id) return;
        this.transportBookingService.deleteBooking(booking.id).subscribe(() => {
          Swal.fire('Removed', 'The booking has been removed.', 'success');
          this.loadBookings(); // Reload the list to show it's gone
        });
      }
    });
  }

  // Go back to the main search page
  goToSearch() {
    this.switchTab.emit('search');
  }

  // Manually refresh the list of bookings
  refreshBookings() {
    Swal.fire({
      title: 'Refreshing...',
      timer: 1000,
      timerProgressBar: true,
      didOpen: () => {
        Swal.showLoading();
      }
    }).then(() => {
      this.loadBookings();
    });
  }
}
