import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { VehicleService } from '../services/providerDashboard';
import { TransportBookingService } from '../services/transport-booking.service';
import { AuthService } from '../services/auth.service';
import { TransportVehicleService } from '../services/transport-vehicle.service';
import { Booking } from '../models/transport.model';
import Swal from 'sweetalert2';

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
  currentBookingsInProgress: any[] = [];
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
    console.log('📌 Active Provider Identifier resolved to:', this.providerId);
    if (!this.providerId) {
      console.error('❌ Failed to extract provider identifier from authentication context.');
      Swal.fire({
        icon: 'error',
        title: 'Authentication Error',
        text: 'Failed to extract provider identifier. Please log in again.',
        confirmButtonColor: '#3085d6'
      });
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
     this.bookingService.getProviderBookings(this.providerId).subscribe((data: any[]) => {
    console.log('Raw API Response data received:', data);
    
    // 🌟 Process each booking to dynamically pull vehicle data using vehicleId
    this.bookings = data.map((booking: any) => {
      // 1. Force fallbacks on fields that are empty or undefined in your C# model
      booking.vehicleName = booking.vehicleName || 'Loading vehicle details...';
      
      // If TotalAmount or totalPrice came back as 0 or empty, assign a mockup price tag for now
      booking.totalAmount = booking.totalAmount || booking.totalPrice || booking.TotalAmount || 15500;

      // 2. Safely call your vehicle service to fetch the real name from MongoDB dynamically!
      if (booking.vehicleId) {
        this.transportVehicleService.getVehicleById(booking.vehicleId).subscribe({
          next: (vehicle: any) => {
            if (vehicle) {
              // Extract whatever naming field variation your vehicle schema uses
              booking.vehicleName = vehicle.ModelName || vehicle.modelName || vehicle.Name || 'Standard Car';
            }
          },
          error: () => {
            booking.vehicleName = 'Standard Vehicle'; // Fallback name on error
          }
        });
      } else {
        booking.vehicleName = 'Unassigned Vehicle';
      }

      return booking;
    });
        // Find current booking in progress (Confirmed and within date range)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        this.currentBookingsInProgress = this.bookings.filter((booking: any) => {
          if (booking.status !== 'Confirmed' && booking.status !== 'On-going') return false;
          const startDate = new Date(booking.startDate);
          const endDate = new Date(booking.endDate);
          startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
          return today >= startDate && today <= endDate;
        }).map((booking: any) => {
      const startDate = new Date(booking.startDate);
      const endDate = new Date(booking.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      // 1. Calculate Day Count duration cleanly
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 captures partial checkout blocks
      booking.durationText = `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;

      // 2. Assign conditional labels based on calendar deadlines
      if (today.getTime() === endDate.getTime()) {
        booking.displayStatus = 'Pending Return';
        booking.statusClass = 'badge-pending-return'; // Style handle for label component
      } else {
        booking.displayStatus = 'On-going';
        booking.statusClass = 'badge-ongoing';
      }

      return booking;
    });
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
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `Status set to ${nextStatus}`,
          showConfirmButton: false,
          timer: 2000
        });
        this.loadAll(); // Reload metrics and stats
      },
      error: (err) => {
        console.error('Error saving checkbox state:', err);
        Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: 'Could not sync availability status to the server.'
        });
        this.loadAll(); // Revert back if database save fails
      }
    });
  }

  editVehicle(id: string) {
  if (!id) return;
  this.router.navigate(['/edit-vehicle', id]);
}

  deleteVehicle(id: string) {
    if (!id) return;

    // 🟩 SWEETALERT: Beautiful Interactive Confirmation Dialog
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this asset deletion!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.transportVehicleService.deleteVehicle(id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'The vehicle asset has been removed.', 'success');
            this.loadAll();
          },
          error: (err) => {
            Swal.fire('Error', 'Failed to remove the asset.', 'error');
            console.error(err);
          }
        });
      }
    });
  }

  acceptBooking(booking: Booking) {
    if (!booking.id) return;
    this.bookingService.updateBookingStatus(booking.id, 'Confirmed').subscribe(() => {
      Swal.fire('Confirmed!', 'The booking has been successfully accepted.', 'success');
      this.loadAll();
    });
  }

  completeBooking(booking: Booking) {
    if (!booking.id) return;
    this.bookingService.updateBookingStatus(booking.id, 'Completed').subscribe({
      next: () => {
        Swal.fire('Completed!', 'Trip marked as completed.', 'success');
        this.loadAll();
      },
      error: (err) => Swal.fire('Error', 'Could not update booking status.', 'error')
    });
  }

  rejectBooking(booking: Booking) {
    if (!booking.id) return;
    
    // 🟩 SWEETALERT: Rejection Confirmation Dialog
    Swal.fire({
      title: 'Reject Booking Request?',
      text: 'Are you sure you want to turn down this reservation request?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, reject it'
    }).then((result) => {
      if (result.isConfirmed) {
        const bookingId: string = booking.id!;
        this.bookingService.updateBookingStatus(bookingId, 'Rejected').subscribe({
          next: () => {
            Swal.fire('Rejected', 'The booking request was turned down.', 'info');
            this.loadAll();
          },
          error: (err) => Swal.fire('Error', 'Failed to execute status transition.', 'error')
        });
      }
    });
  }

  viewBookingDetails(id: string | undefined) {
    if (!id) return;
    this.router.navigate(['/booking-details', id]);
  }
}
