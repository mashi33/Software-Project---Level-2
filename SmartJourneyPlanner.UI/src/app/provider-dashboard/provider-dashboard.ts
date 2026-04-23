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
    
    // Bookings
    this.bookingService.getProviderBookings('p1').subscribe(data => {
      this.bookings = data;
    });
  }

  // --- Vehicle Actions ---
  toggleAvailability(vehicle: any) {
    this.vehicleService.updateAvailability(vehicle.id, !vehicle.available).subscribe(() => this.loadAll());
  }

  deleteVehicle(id: string) {
    if(confirm('Are you sure you want to delete this vehicle?')) {
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
    const booking = this.bookings.find(b => b.id === id);
    if (!booking) return;

    Swal.fire({
      title: 'Booking Request Details',
      width: '700px',
      html: `
        <div class="text-start" style="font-size: 0.9rem; color: #333;">
          <h6 class="mb-2 text-primary fw-bold" style="font-size: 0.95rem;"><i class="bi bi-person-lines-fill me-2"></i>Customer Details</h6>
          <div class="bg-light p-3 rounded-3 mb-3 border">
            <p class="mb-1"><strong>Name:</strong> ${booking.userName}</p>
            <p class="mb-1"><strong>Phone:</strong> ${booking.contactNumber || 'N/A'}</p>
            <p class="mb-0"><strong>Status:</strong> <span class="badge bg-warning text-dark">${booking.status}</span></p>
          </div>

          <h6 class="mb-2 text-primary fw-bold" style="font-size: 0.95rem;"><i class="bi bi-geo-alt-fill me-2"></i>Trip Itinerary</h6>
          <div class="bg-light p-3 rounded-3 mb-3 border">
            <p class="mb-1"><strong>Travel Dates:</strong> ${new Date(booking.startDate).toLocaleDateString()} to ${new Date(booking.endDate).toLocaleDateString()} (${booking.days} Days)</p>
            <p class="mb-1"><strong>Pickup:</strong> ${booking.pickupAddress || 'N/A'}</p>
            <p class="mb-0"><strong>Route:</strong> ${booking.destinations?.join(' <i class="bi bi-arrow-right mx-1 text-secondary"></i> ') || booking.destinationAddress || 'N/A'}</p>
          </div>
          
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
            <i class="bi bi-info-circle me-1"></i> Extra KM charges are to be collected directly from the customer based on actual mileage.
          </p>
        </div>
      `,
      confirmButtonText: 'Close',
      confirmButtonColor: '#0c92f4'
    });
  }
}