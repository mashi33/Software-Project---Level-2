import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router'; // Added Router
import { VehicleService } from '../services/providerDashboard';
import { TransportBookingService } from '../services/transport-booking.service';
import { Booking } from '../models/transport.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './provider-dashboard.html',
  styleUrls: ['./provider-dashboard.css']
})
export class ProviderDashboardComponent implements OnInit {
  
  stats: any = { totalVehicles: 0, totalBookings: 0, rating: 0 };
  vehicles: any[] = [];
  bookings: Booking[] = [];

  constructor(
    private vehicleService: VehicleService,
    private bookingService: TransportBookingService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    // Stats and Vehicles
    this.vehicleService.getStats().subscribe(data => this.stats = data);
    this.vehicleService.getVehicles().subscribe(data => this.vehicles = data);
    
    // Bookings - Using 'p1' as an example ID
    this.bookingService.getProviderBookings('p1').subscribe(data => {
      this.bookings = data;
    });
  }

  // --- Vehicle Actions ---
  toggleAvailability(vehicle: any) {
    this.vehicleService.updateAvailability(vehicle.id, !vehicle.available).subscribe(() => this.loadAll());
  }

  deleteVehicle(id: string) {
    if(confirm('Are you sure?')) {
      this.vehicleService.deleteVehicle(id).subscribe(() => this.loadAll());
    }
  }

  // --- Booking Actions ---
  acceptBooking(booking: Booking) {
    if (!booking.id) return;
    this.bookingService.updateBookingStatus(booking.id, 'Confirmed').subscribe(() => {
      this.loadAll();
    });
  }

  // Add this method to your ProviderDashboardComponent class
completeBooking(booking: Booking) {
  // 1. Safety check
  if (!booking.id) return;

  // 2. Call the service to update the status to 'Completed'
  this.bookingService.updateBookingStatus(booking.id, 'Completed').subscribe({
    next: () => {
      // 3. Refresh the dashboard list to reflect the new status
      this.loadAll();
    },
    error: (err) => {
      console.error('Error completing booking:', err);
      alert('Could not update booking status. Please try again.');
    }
  });
}
  
  // Replace the old deleteBooking with this:
// --- ACTIONS ---
rejectBooking(booking: Booking) {
  if (!booking.id) return;
  
  if (confirm('Are you sure you want to reject this booking?')) {
    // We use updateBookingStatus, NOT deleteBooking
    this.bookingService.updateBookingStatus(booking.id, 'Rejected').subscribe({
      next: () => {
        alert('Booking Rejected');
        this.loadAll(); // Refresh dashboard
      },
      error: (err) => console.error('Error rejecting:', err)
    });
  }
}

  viewBookingDetails(id: string | undefined) {
    if (id) {
      this.router.navigate(['/booking-details', id]);
    }
  }
}