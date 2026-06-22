import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { VehicleService } from '../services/providerDashboard';
import { TransportBookingService } from '../services/transport-booking.service';
import { AuthService } from '../services/auth.service';
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
  providerId: string | null = null;

  constructor(
    private vehicleService: VehicleService,
    private bookingService: TransportBookingService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.providerId = this.authService.getUserId();
    if (!this.providerId) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadAll();
  }

  loadAll() {
    if (!this.providerId) return;

    this.vehicleService.getStats().subscribe(data => this.stats = data);
    this.vehicleService.getVehicles().subscribe(data => this.vehicles = data);
    
    this.bookingService.getProviderBookings(this.providerId).subscribe(data => {
      this.bookings = data;
    });
  }

  toggleAvailability(vehicle: any) {
    // Inverts current state to avoid needing separate UI state tracking
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
    if (!id) return;
    this.router.navigate(['/booking-details', id]);
  }
}
