import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Booking } from '../../models/transport.model';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-bookings.html',
  styleUrl: './my-bookings.css'
})
export class MyBookings implements OnInit {
  @Input() role: 'user' | 'provider' = 'user';
  
  userBookings: Booking[] = [];
  providerBookings: Booking[] = [];

  // Rating Modal State
  showRatingModal: boolean = false;
  selectedBooking: Booking | null = null;
  tempRating: number = 0;
  tempComment: string = '';
  showSuccessMessage: boolean = false;
  
  @Output() switchTab = new EventEmitter<'search' | 'bookings'>();

  ngOnInit() {
    this.loadMockBookings();
  }

  loadMockBookings() {
    // Mock User Bookings
    this.userBookings = [];

    // Mock Provider Received Bookings
    this.providerBookings = [
      {
        id: 'P001',
        vehicleId: 'Toyota Prius (Budget)',
        userId: 'u1',
        startDate: '2023-12-05',
        endDate: '2023-12-07',
        days: 3,
        nights: 2,
        totalAmount: 30000,
        createdAt: new Date().toISOString(),
        destinationAddress: 'Mirissa Beach Resort',
        destinations: ['Galle Fort', 'Mirissa Beach Resort', 'Hikkaduwa'],
        passengerCount: 4,
        luggageCount: 3,
        status: 'Pending',
        location: 'Colombo',
        vehicleImage: 'images/vehicles/prius.png',
        userName: 'Kamal Perera'
      }
    ];
  }

  // User Actions
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
        booking.status = 'Cancelled';
        Swal.fire('Cancelled', 'Your booking has been cancelled.', 'success');
      }
    });
  }

  // Rating Methods
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

  submitReview() {
    if (!this.selectedBooking) return;
    
    // Simulate API call
    console.log('Submitting Review:', {
      bookingId: this.selectedBooking.id,
      rating: this.tempRating,
      comment: this.tempComment
    });

    this.showSuccessMessage = true;
    
    // After 2 seconds, close modal and update booking state
    setTimeout(() => {
      if (this.selectedBooking) {
        this.selectedBooking.hasBeenRated = true;
      }
      this.closeModal();
    }, 2000);
  }

  // Provider Actions
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
        booking.status = 'Confirmed';
        Swal.fire('Accepted', 'The booking is now confirmed. You can view the traveler\'s contact details.', 'success');
      }
    });
  }

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
        booking.status = 'Cancelled';
        Swal.fire('Rejected', 'The booking request was rejected.', 'success');
      }
    });
  }

  // Navigation & Mock Loading
  goToSearch() {
    this.switchTab.emit('search');
  }

  refreshBookings() {
    // Simulating a refresh
    Swal.fire({
      title: 'Refreshing...',
      timer: 1000,
      timerProgressBar: true,
      didOpen: () => {
        Swal.showLoading();
      }
    }).then(() => {
      this.loadMockBookings();
    });
  }
}
