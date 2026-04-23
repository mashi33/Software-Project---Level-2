import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { VehicleService } from '../services/providerDashboard';
import { TransportBookingService } from '../services/transport-booking.service';
import { Booking } from '../models/transport.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './provider-dashboard.html',
  styleUrls: ['./provider-dashboard.css']
})
export class ProviderDashboardComponent implements OnInit {
  
  // Data variables to store statistics, vehicles, and bookings
  stats: any = { totalVehicles: 0, totalBookings: 0, rating: 0 };
  vehicles: any[] = [];
  bookings: Booking[] = [];

  constructor(
    private vehicleService: VehicleService,
    private bookingService: TransportBookingService,
    private router: Router
  ) {}

  // This runs when the page loads
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

  // --- Vehicle Actions ---
  
  // Turn vehicle availability ON or OFF
  toggleAvailability(vehicle: any) {
    this.vehicleService.updateAvailability(vehicle.id, !vehicle.available).subscribe(() => this.loadAll());
  }

  // Remove a vehicle from the provider's list
  deleteVehicle(id: string) {
    if(confirm('Are you sure you want to delete this vehicle?')) {
      this.vehicleService.deleteVehicle(id).subscribe(() => this.loadAll());
    }
  }

  // --- Booking Actions ---

  // Accept a customer's booking request
  acceptBooking(booking: Booking) {
    if (!booking.id) return;
    this.bookingService.updateBookingStatus(booking.id, 'Confirmed').subscribe(() => {
      this.loadAll(); // Refresh the list
    });
  }

  // Mark a trip as successfully completed
  completeBooking(booking: Booking) {
    if (!booking.id) return;
    this.bookingService.updateBookingStatus(booking.id, 'Completed').subscribe({
      next: () => this.loadAll(),
      error: (err) => console.error('Error completing booking:', err)
    });
  }

  // Reject a customer's booking request
  rejectBooking(booking: Booking) {
    if (!booking.id) return;
    
    if (confirm('Are you sure you want to reject this booking?')) {
      this.bookingService.updateBookingStatus(booking.id, 'Rejected').subscribe({
        next: () => this.loadAll(),
        error: (err) => console.error('Error rejecting:', err)
      });
    }
  }

  // Show a popup with full details for a specific booking
  viewBookingDetails(id: string | undefined) {
    const booking = this.bookings.find(b => b.id === id);
    if (!booking) return;

    // Use SweetAlert2 to show a clean, detailed summary modal
    Swal.fire({
      title: 'Booking Request Details',
      width: '700px',
      html: `
        <div class="text-start" style="font-size: 0.9rem; color: #333;">
          <!-- Customer Info -->
          <h6 class="mb-2 text-primary fw-bold" style="font-size: 0.95rem;"><i class="bi bi-person-lines-fill me-2"></i>Customer Details</h6>
          <div class="bg-light p-3 rounded-3 mb-3 border">
            <p class="mb-1"><strong>Name:</strong> ${booking.userName}</p>
            <p class="mb-1"><strong>Phone:</strong> ${booking.contactNumber || 'N/A'}</p>
            <p class="mb-0"><strong>Status:</strong> <span class="badge bg-warning text-dark">${booking.status}</span></p>
          </div>

          <!-- Trip Info -->
          <h6 class="mb-2 text-primary fw-bold" style="font-size: 0.95rem;"><i class="bi bi-geo-alt-fill me-2"></i>Trip Itinerary</h6>
          <div class="bg-light p-3 rounded-3 mb-3 border">
            <p class="mb-1"><strong>Travel Dates:</strong> ${new Date(booking.startDate).toLocaleDateString()} to ${new Date(booking.endDate).toLocaleDateString()} (${booking.days} Days)</p>
            <p class="mb-1"><strong>Pickup:</strong> ${booking.pickupAddress || 'N/A'}</p>
            <p class="mb-0"><strong>Route:</strong> ${booking.destinations?.join(' <i class="bi bi-arrow-right mx-1 text-secondary"></i> ') || booking.destinationAddress || 'N/A'}</p>
          </div>
          
          <!-- Price Info -->
          <h6 class="mb-2 text-primary fw-bold" style="font-size: 0.95rem;"><i class="bi bi-receipt me-2"></i>Pricing Breakdown</h6>
          <table class="table table-bordered table-sm text-start mb-0">
            <thead class="table-light">
              <tr>
                <th>Item</th>
                <th class="text-end">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Daily Rental (LKR ${booking.pricingSummary?.dailyRate?.toLocaleString()} x ${booking.days} Days)</td>
                <td class="text-end">LKR ${booking.pricingSummary?.dailyRental?.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Driver Night Fee (LKR ${booking.pricingSummary?.nightlyRate?.toLocaleString()} x ${booking.nights} Nights)</td>
                <td class="text-end">LKR ${booking.pricingSummary?.driverNightOut?.toLocaleString()}</td>
              </tr>
              <tr class="table-info">
                <th><strong>Total Earnings (Estimated)</strong></th>
                <th class="text-end" style="font-size: 1.1rem; color: #0c92f4;"><strong>LKR ${booking.totalAmount?.toLocaleString()}</strong></th>
              </tr>
            </tbody>
          </table>
          <p class="text-muted extra-small mt-2 italic">
            <i class="bi bi-info-circle me-1"></i> Extra KM charges are collected separately based on usage.
          </p>
        </div>
      `,
      confirmButtonText: 'Close',
      confirmButtonColor: '#0c92f4'
    });
  }
}