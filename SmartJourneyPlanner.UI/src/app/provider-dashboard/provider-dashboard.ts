import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { VehicleService } from '../services/providerDashboard';
import { TransportBookingService } from '../services/transport-booking.service';
import { TransportVehicleService } from '../services/transport-vehicle.service'; // 🔑 ADD THIS LINE
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
    private transportVehicleService: TransportVehicleService,
    private bookingService: TransportBookingService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    // 1. Leave your stats method completely untouched
    this.vehicleService.getStats().subscribe(data => this.stats = data);
    
    // 2. 🔑 THE CORE FIX: Safely map MongoDB _id fields directly to frontend id properties!
    this.vehicleService.getVehicles().subscribe((data: any) => {
      if (Array.isArray(data)) {
        this.vehicles = data.map((vehicle: any) => ({
          ...vehicle,
          id: vehicle.id || vehicle._id // Maps MongoDB native _id onto standard id property
        }));
      } else {
        this.vehicles = [];
      }
      console.log("📊 Cleaned Vehicles state loaded into Dashboard UI:", this.vehicles);
    });
    
    // 3. Leave your bookings method completely untouched
    this.bookingService.getProviderBookings('p1').subscribe(data => {
      this.bookings = data;
    });
  }

  toggleAvailability(vehicle: any) {
    const targetId = vehicle.id || vehicle._id;
    const currentStatus = vehicle.Status || vehicle.status || '';
    const isCurrentlyAvailable = currentStatus === 'Available' || vehicle.available === true;
    
    // 1. Invert the logical state string cleanly
    const nextStatus = isCurrentlyAvailable ? 'Unavailable' : 'Available';

    // 2. Optimistically update local property to prevent the toggle visual jumping out of sync
    if (vehicle.hasOwnProperty('Status')) {
      vehicle.Status = nextStatus;
    } else {
      vehicle.status = nextStatus;
    }
    vehicle.available = !isCurrentlyAvailable;

    // 3. 🔑 FIXED: Use vehicleService to update state string parameter
    this.vehicleService.updateAvailability(targetId, nextStatus === 'Available').subscribe({
      next: () => this.loadAll(),
      error: (err) => {
        console.error('Error updating status:', err);
        this.loadAll(); // Revert UI if DB write drops
      }
    });
  }

  deleteVehicle(id: string) {
    if (confirm('Are you sure you want to delete this vehicle?')) {
      // 🔑 FIXED: Points directly to your TransportVehicleService api/TransportVehicles controller endpoint
      this.transportVehicleService.deleteVehicle(id).subscribe({
        next: () => {
          console.log(`🗑️ Asset ${id} successfully removed.`);
          this.loadAll();
        },
        error: (err) => console.error('Error deleting asset:', err)
      });
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

  this.router.navigate(['', id]);
}
}
