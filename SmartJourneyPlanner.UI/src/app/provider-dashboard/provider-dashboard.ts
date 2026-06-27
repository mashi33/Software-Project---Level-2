import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { VehicleService } from '../services/providerDashboard';
import { TransportBookingService } from '../services/transport-booking.service';
import { AuthService } from '../services/auth.service';
import { TransportVehicleService } from '../services/transport-vehicle.service';
import { Booking } from '../models/transport.model';

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './provider-dashboard.html',
  styleUrls: ['./provider-dashboard.css']
})
export class ProviderDashboardComponent implements OnInit {
  
  stats: any = { totalVehicles: 0, totalBookings: 0, rating: 0, totalRevenue: 0 };
  vehicles: any[] = [];
  bookings: Booking[] = [];
  filteredVehicles: any[] = [];
  filteredBookings: Booking[] = [];
  currentBooking: any = null;
  providerId: string | null = null;
  userName: string = '';

  // Filter properties
  vehicleSearchTerm: string = '';
  vehicleStatusFilter: string = '';
  bookingSearchTerm: string = '';
  bookingStatusFilter: string = '';

  constructor(
    private vehicleService: VehicleService,
    private transportVehicleService: TransportVehicleService,
    private bookingService: TransportBookingService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.providerId = this.authService.getUserEmail() || this.authService.getUserName();
    if (!this.providerId) {
      console.error('❌ Failed to extract provider identifier from authentication context.');
      this.router.navigate(['/login']);
      return;
    }
    this.userName = this.authService.getUserName() || 'Provider';
    this.loadAll();
  }

  loadAll() {
    // Load stats
    this.vehicleService.getStats().subscribe(data => {
      this.stats = data;
    });

    // Load vehicles
    this.vehicleService.getVehicles().subscribe((data: any) => {
      if (Array.isArray(data)) {
        const approvedFleetOnly = data.filter((vehicle: any) => {
          const currentStatus = vehicle.Status || vehicle.status || '';
          return currentStatus.trim() !== 'Pending Approval';
        });

        this.vehicles = approvedFleetOnly.map((vehicle: any) => ({
          ...vehicle,
          id: vehicle.id || vehicle._id
        }));
        
        // Apply initial filter
        this.filterVehicles();
      } else {
        this.vehicles = [];
        this.filteredVehicles = [];
      }
    });

    // Load bookings for this provider only
    if (this.providerId) {
      console.log('Sending providerId to API:', this.providerId);
      this.bookingService.getProviderBookings(this.providerId).subscribe(data => {
        this.bookings = data;
        console.log('Raw API Response data received:', data);
        // Find current booking in progress (Confirmed and within date range)
        const today = new Date();
        this.currentBooking = this.bookings.find((booking: any) => {
          if (booking.status !== 'Confirmed') return false;
          const startDate = new Date(booking.startDate);
          const endDate = new Date(booking.endDate);
          return today >= startDate && today <= endDate;
        }) || null;
        // Apply initial filter
        this.filterBookings();
      });
    }
  }

  // Filter vehicles based on search term and status
  filterVehicles() {
    this.filteredVehicles = this.vehicles.filter((vehicle: any) => {
      const searchTerm = this.vehicleSearchTerm.toLowerCase();
      const statusFilter = this.vehicleStatusFilter;
      
      // Filter by search term (model name, class, year)
      const matchesSearch = !searchTerm || 
        (vehicle.ModelName || vehicle.modelName || '').toLowerCase().includes(searchTerm) ||
        (vehicle.VehicleClass || vehicle.vehicleClass || '').toLowerCase().includes(searchTerm) ||
        (vehicle.YearOfManufacture || vehicle.yearOfManufacture || '').toString().includes(searchTerm);
      
      // Filter by status
      const currentStatus = vehicle.Status || vehicle.status || '';
      const matchesStatus = !statusFilter || currentStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }

  // Filter bookings based on search term and status
  filterBookings() {
    this.filteredBookings = this.bookings.filter((booking: any) => {
      const searchTerm = this.bookingSearchTerm.toLowerCase();
      const statusFilter = this.bookingStatusFilter;
      
      // Filter by search term (user name, vehicle name)
      const matchesSearch = !searchTerm || 
        (booking.userName || '').toLowerCase().includes(searchTerm) ||
        (booking.vehicleName || '').toLowerCase().includes(searchTerm);
      
      // Filter by status
      const matchesStatus = !statusFilter || booking.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }

  // Refresh all data
  refreshData() {
    this.loadAll();
  }

  // Logout
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  toggleAvailability(vehicle: any) {
    const targetId = vehicle.id || vehicle._id;
    
    // Force read both uppercase and lowercase properties cleanly
    const currentStatus = vehicle.Status || vehicle.status || '';
    
    // If it's currently Available, flip it to Unavailable. Otherwise, set it to Available.
    const nextStatus = (currentStatus === 'Available') ? 'Unavailable' : 'Available';

    // Optimistically update the property value in frontend memory so the checkmark changes instantly
    if (vehicle.hasOwnProperty('Status')) {
      vehicle.Status = nextStatus;
    } else {
      vehicle.status = nextStatus;
    }

    // Call your service to update MongoDB
    this.vehicleService.updateAvailability(targetId, nextStatus === 'Available').subscribe({
      next: () => {
        console.log(`⚡ Availability status successfully synchronized to: ${nextStatus}`);
        this.loadAll(); // Reload metrics and stats
      },
      error: (err) => {
        console.error('Error saving checkbox state:', err);
        this.loadAll(); // Revert back if database save fails
      }
    });
  }

  editVehicle(id: string) {
  if (!id) return;
  this.router.navigate(['/edit-vehicle', id]);
}

  deleteVehicle(id: string) {
    if (confirm('Are you sure you want to delete this vehicle?')) {
      // Points directly to your TransportVehicleService api/TransportVehicles controller endpoint
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
    this.router.navigate(['/booking-details', id]);
  }
}
