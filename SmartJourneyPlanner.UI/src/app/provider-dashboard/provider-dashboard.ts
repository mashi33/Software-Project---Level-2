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
completeBooking(booking: any) {
  // 1. Safety check: make sure the ID exists
  if (!booking.id) {
    console.error('No ID found for this booking.');
    return;
  }

  // 2. Call the service to update the database
  this.bookingService.completeBooking(booking.id).subscribe({
    next: () => {
      // 3. Refresh the list to remove the completed item from the screen
      this.loadAll();
    },
    error: (err) => {
      console.error('Error completing booking:', err);
      alert('Could not complete the booking. Please try again.');
    }
  });
}
  
  // Replace the old deleteBooking with this:
// --- ACTIONS ---
rejectBooking(booking: Booking) {
  if (!booking.id) return;

  if (confirm('Are you sure you want to reject this booking?')) {
    this.bookingService.deleteBooking(booking.id).subscribe({
      next: () => {
        this.loadAll(); // Refreshes the list after rejection
      },
      error: (err: HttpErrorResponse) => { // <--- This is where your code goes
        console.error('Error Status:', err.status);
        alert('Could not reject booking. Please try again.');
      }
    });
  }
}

  viewBookingDetails(id: string | undefined) {
    if (id) {
      this.router.navigate(['/booking-details', id]);
    }
  }
}