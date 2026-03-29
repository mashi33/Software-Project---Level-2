import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VehicleService } from '../../services/vehicle.service';
import { Vehicle } from '../../models/transport.model';
import { TransportCalculationService } from '../../services/transport-calculation.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-vehicle-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './vehicle-detail.html',
  styleUrl: './vehicle-detail.css'
})
export class VehicleDetailComponent implements OnInit {
  vehicle: Vehicle | undefined;
  mainImage: string = '';
  currentView: 'exterior' | 'interior' = 'exterior';
  bookingDays: number = 1;
  bookingNights: number = 0;
  
  // Form fields
  customerName: string = '';
  customerPhone: string = '';
  customerEmail: string = '';
  specialRequests: string = '';
  showAllReviews: boolean = false;
  isReviewsExpanded: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private vehicleService: VehicleService,
    public calcService: TransportCalculationService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.vehicleService.getVehicleById(id).subscribe(v => {
          this.vehicle = v;
          if (v) {
            this.mainImage = v.exteriorPhoto || '';
            this.currentView = 'exterior';
          }
        });
      }
    });

    // Capture query parameters for automatic calculation
    this.route.queryParams.subscribe(params => {
      const start = params['start'];
      const end = params['end'];
      if (start && end) {
        this.calculateDuration(start, end);
      }
    });
  }

  private calculateDuration(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end >= start) {
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      this.bookingDays = diffDays + 1;
      this.bookingNights = diffDays;
    }
  }

  setMainView(view: 'exterior' | 'interior') {
    if (!this.vehicle) return;
    this.currentView = view;
    this.mainImage = (view === 'exterior' ? this.vehicle.exteriorPhoto : this.vehicle.interiorPhoto) || '';
  }

  toggleGalleryView() {
    this.setMainView(this.currentView === 'exterior' ? 'interior' : 'exterior');
  }

  getEstimatedTotal(): number {
    if (!this.vehicle) return 0;
    return this.calcService.calculateEstimatedTotal(
      this.vehicle.standardDailyRate,
      this.bookingDays,
      this.vehicle.driverNightOutFee,
      this.bookingNights
    );
  }

  onRequestBooking() {
    if (!this.customerName || !this.customerPhone || !this.customerEmail) {
      Swal.fire('Missing Information', 'Please fill in your name, phone, and email.', 'warning');
      return;
    }

    if (!this.vehicle) return;

    const dailyTotal = this.vehicle.standardDailyRate * this.bookingDays;
    const nightTotal = this.vehicle.driverNightOutFee * this.bookingNights;
    const subtotal = dailyTotal + nightTotal;

    Swal.fire({
      title: 'Booking Request Summary',
      width: '600px',
      html: `
        <div class="text-start">
          <p><strong>Vehicle:</strong> ${this.vehicle.description}</p>
          <hr>
          
          <h5 class="mb-3 text-secondary">Pricing Breakdown</h5>
          <table class="table table-bordered table-dark text-start">
            <tbody>
              <tr>
                <td>Daily Rental (${this.vehicle.standardDailyRate} x ${this.bookingDays} Days)</td>
                <td class="text-end text-light">Rs. ${dailyTotal.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Driver Night Fee (${this.vehicle.driverNightOutFee} x ${this.bookingNights} Nights)</td>
                <td class="text-end text-light">Rs. ${nightTotal.toLocaleString()}</td>
              </tr>
              <tr class="table-active">
                <th><strong>Subtotal (Estimated)</strong></th>
                <th class="text-end text-primary h5 mb-0"><strong>Rs. ${subtotal.toLocaleString()}</strong></th>
              </tr>
            </tbody>
          </table>

          <div class="alert alert-warning mt-3 small">
            <i class="bi bi-exclamation-triangle-fill"></i> <strong>Disclaimer:</strong> This subtotal covers a minimum of ${this.vehicle.freeKMLimit || 150}km per day. Extra mileage will be charged at <code>Rs. ${this.vehicle.extraKMRate}/km</code>. Highway tolls and parking fees are not included and must be paid directly to the driver.
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-send me-2"></i> Confirm Booking Request',
      confirmButtonColor: '#0c92f4',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Success!',
          text: 'Your booking request has been sent to the provider. They will contact you shortly.',
          icon: 'success',
          confirmButtonColor: '#000000'
        });
      }
    });
  }

  getRatingPercentage(starLevel: number): number {
    if (!this.vehicle || !this.vehicle.reviews || this.vehicle.reviews.length === 0) return 0;
    const count = this.vehicle.reviews.filter(r => r.rating === starLevel).length;
    return (count / this.vehicle.reviews.length) * 100;
  }

  getVisibleReviews() {
    if (!this.vehicle) return [];
    return this.showAllReviews ? this.vehicle.reviews : this.vehicle.reviews.slice(0, 3);
  }

  toggleReviews() {
    this.showAllReviews = !this.showAllReviews;
  }

  toggleReviewsAccordion() {
    this.isReviewsExpanded = !this.isReviewsExpanded;
  }

  scrollToReviews() {
    this.isReviewsExpanded = true;
    setTimeout(() => {
      const element = document.getElementById('reviews-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }
}
