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
  @Input() role: 'user' | 'provider' = 'user'; // Determines if we show the user view or provider view
  
  userBookings: Booking[] = []; // List of bookings for the traveler
  providerBookings: Booking[] = []; // List of bookings for the transport owner

  // Variables for the rating/review popup
  showRatingModal: boolean = false;
  selectedBooking: Booking | null = null;
  tempRating: number = 0;
  tempComment: string = '';
  showSuccessMessage: boolean = false;
  
  @Output() switchTab = new EventEmitter<'search' | 'bookings'>();

  constructor(
    private transportBookingService: TransportBookingService,
    private transportVehicleService: TransportVehicleService
  ) {}

  ngOnInit() {
    this.loadBookings(); // Load data when the component starts
  }

  // Fetch bookings from the server based on the user's role
  loadBookings() {
    if (this.role === 'user') {
      // Load bookings for the traveler
      this.transportBookingService.getUserBookings('u1').subscribe(res => {
        this.userBookings = res;
      });
    } else {
      // Load bookings for the transport owner
      this.transportBookingService.getProviderBookings('p1').subscribe(res => {
        this.providerBookings = res;
      });
    }
  }

  // Cancel a booking request (only if it's still pending)
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
        this.transportBookingService.updateBookingStatus(booking.id, 'Cancelled').subscribe(() => {
          booking.status = 'Cancelled';
          Swal.fire('Cancelled', 'Your booking has been cancelled.', 'success');
        });
      }
    });
  }

  // Show the review popup for a completed trip
  openRatingModal(booking: Booking) {
    this.selectedBooking = booking;
    this.tempRating = 0;
    this.tempComment = '';
    this.showSuccessMessage = false;
    this.showRatingModal = true;
  }

  // Close the review popup
  closeModal() {
    this.showRatingModal = false;
    this.selectedBooking = null;
  }

  // Set the star rating number
  setRating(rating: number) {
    this.tempRating = rating;
  }

  // Save the review and update the booking status
  submitReview() {
    if (!this.selectedBooking || !this.selectedBooking.id) return;
    
    const reviewData = {
      userName: this.selectedBooking.userName || 'Anonymous User',
      rating: this.tempRating,
      comment: this.tempComment,
      date: new Date().toISOString().split('T')[0]
    };

    // 1. Add the review to the vehicle's record
    this.transportVehicleService.addVehicleReview(this.selectedBooking.vehicleId, reviewData).subscribe({
      next: () => {
        // 2. Mark the booking as rated so the button disappears
        if (this.selectedBooking?.id) {
          this.transportBookingService.markBookingAsRated(this.selectedBooking.id).subscribe({
            next: () => {
              this.showSuccessMessage = true;
              if (this.selectedBooking) {
                this.selectedBooking.hasBeenRated = true;
              }
              
              setTimeout(() => {
                this.closeModal();
                this.loadBookings(); // Refresh the list
              }, 1500);
            },
            error: (err) => {
              console.error('Error marking booking as rated:', err);
              Swal.fire('Error', 'Failed to update booking status.', 'error');
            }
          });
        }
      },
      error: (err) => {
        console.error('Error adding review:', err);
        Swal.fire('Error', 'Failed to submit review.', 'error');
      }
    });
  }

  // Transport Owner: Accept a booking request
  acceptBooking(booking: Booking) {
    Swal.fire({
      title: 'Accept Request?',
      text: 'You are confirming availability for these dates. The user will be notified.',
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
          Swal.fire('Accepted', 'The booking is now confirmed. You can view the traveler\'s contact details.', 'success');
        });
      }
    });
  }

  // Transport Owner: Reject a booking request
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

  // Go back to the transport search page
  goToSearch() {
    this.switchTab.emit('search');
  }

  // Refresh the booking list manually
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
