import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { VehicleService } from '../services/providerDashboard';
import { TransportBookingService } from '../services/transport-booking.service';
import { Booking } from '../models/transport.model';

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

  // Fetch all data from the backend services
  loadAll() {
    // Get summary statistics and list of vehicles
    this.vehicleService.getStats().subscribe(data => this.stats = data);
    this.vehicleService.getVehicles().subscribe(data => this.vehicles = data);
    
    // Get all bookings for this provider (p1 is a hardcoded ID for now)
    this.bookingService.getProviderBookings('p1').subscribe(data => {
      this.bookings = data;
    });
  }

  toggleAvailability(vehicle: any) {
    this.vehicleService.updateAvailability(vehicle.id, !vehicle.available).subscribe(() => this.loadAll());
  }

  deleteVehicle(id: string) {
    if(confirm('Are you sure you want to delete this vehicle?')) {
      this.vehicleService.deleteVehicle(id).subscribe(() => this.loadAll());
    }
  }

  acceptBooking(booking: Booking) {
    if (!booking.id) return;
    this.bookingService.updateBookingStatus(booking.id, 'Confirmed').subscribe(() => {
      this.loadAll();
    });
  }

  completeBooking(booking: Booking) {
    if (!booking.id) return;
    this.bookingService.updateBookingStatus(booking.id, 'Completed').subscribe({
      next: () => this.loadAll(),
      error: (err) => console.error('Error completing booking:', err)
    });
  }

  rejectBooking(booking: Booking) {
    if (!booking.id) return;
    
    if (confirm('Are you sure you want to reject this booking?')) {
      this.bookingService.updateBookingStatus(booking.id, 'Rejected').subscribe({
        next: () => this.loadAll(),
        error: (err) => console.error('Error rejecting:', err)
      });
    }
  }

  
  viewBookingDetails(id: string | undefined) {
    const booking = this.bookings.find(booking => booking.id === id);
    if (!booking) return;
  }
}
