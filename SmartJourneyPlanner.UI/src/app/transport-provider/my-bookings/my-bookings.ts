import { Component, OnInit, Input } from '@angular/core';
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

  ngOnInit() {
    this.loadMockBookings();
  }

  loadMockBookings() {
    // Mock User Bookings
    this.userBookings = [
      {
        id: 'b1', vehicleId: 'Toyota Prius (Budget)', userId: 'u1',
        startDate: '2026-03-30', endDate: '2026-04-01', days: 3, nights: 2,
        totalAmount: 28000, contactNumber: '+94 77 123 4567',
        status: 'Pending', createdAt: new Date().toISOString()
      },
      {
        id: 'b2', vehicleId: 'Mercedes Benz E-Class (Luxury)', userId: 'u1',
        startDate: '2026-04-10', endDate: '2026-04-12', days: 3, nights: 2,
        totalAmount: 85000, contactNumber: '+94 71 987 6543',
        status: 'Confirmed', createdAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'b3', vehicleId: 'Toyota Commuter Van (Group)', userId: 'u1',
        startDate: '2026-03-20', endDate: '2026-03-22', days: 3, nights: 2,
        totalAmount: 45000, contactNumber: '+94 77 555 6666',
        status: 'Completed', createdAt: new Date(Date.now() - 604800000).toISOString(),
        hasBeenRated: false
      }
    ];

    // Mock Provider Received Bookings
    this.providerBookings = [
      {
        id: 'p1', vehicleId: 'Toyota Prius (Budget) - Assigned to you', userId: 'usr_99',
        startDate: '2026-05-01', endDate: '2026-05-05', days: 5, nights: 4,
        totalAmount: 48000, contactNumber: '+94 76 555 1234',
        status: 'Pending', createdAt: new Date().toISOString()
      },
      {
        id: 'p2', vehicleId: 'Toyota Prius (Budget) - Assigned to you', userId: 'usr_102',
        startDate: '2026-04-15', endDate: '2026-04-16', days: 2, nights: 1,
        totalAmount: 18000, contactNumber: '+94 70 888 9999',
        status: 'Confirmed', createdAt: new Date(Date.now() - 86400000).toISOString()
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
}
