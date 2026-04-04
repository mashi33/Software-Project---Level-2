import { Component, OnInit, HostListener } from '@angular/core';
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
  startDate: string = '';
  endDate: string = '';
  customerName: string = '';
  customerPhone: string = '';
  customerEmail: string = '';
  specialRequests: string = '';
  pickupAddress: string = '';
  destinationAddress: string = ''; // Keeping for single match or primary
  destinations: string[] = [];
  newDestination: string = '';
  passengerCount: number | null = null;
  luggageCount: number | null = null;
  
  // Auto-suggestion data
  sriLankanLocations: string[] = [
    'Colombo', 'Kandy', 'Galle', 'Negombo', 'Anuradhapura', 'Jaffna', 'Nuwara Eliya', 
    'Ella', 'Sigiriya', 'Dambulla', 'Trincomalee', 'Batticaloa', 'Polonnaruwa', 'Badulla', 
    'Kurunegala', 'Ratnapura', 'Kuruwita', 'Matara', 'Kalutara', 'Bentota', 'Hikkaduwa', 
    'Unawatuna', 'Mirissa', 'Weligama', 'Tangalle', 'Tissamaharama', 'Kataragama', 
    'Hambantota', 'Katunayake', 'Mt. Lavinia', 'Dehiwala', 'Moratuwa', 'Panadura', 
    'Avissawella', 'Kegalle', 'Gampola', 'Nawalapitiya', 'Hatton', 'Talawakelle', 
    'Bandarawela', 'Haputale', 'Ampara', 'Pottuvil', 'Arugam Bay', 'Mannar', 'Vavuniya'
  ];
  filteredPickupSuggestions: string[] = [];
  filteredDestSuggestions: string[] = [];
  
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
        this.startDate = start;
        this.endDate = end;
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

  onDateChange() {
    if (this.startDate && this.endDate) {
      this.calculateDuration(this.startDate, this.endDate);
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

  addDestination() {
    if (this.newDestination.trim()) {
      this.destinations.push(this.newDestination.trim());
      this.newDestination = '';
    }
  }

  removeDestination(index: number) {
    this.destinations.splice(index, 1);
  }

  // Location suggestions logic
  onLocationInput(type: 'pickup' | 'dest') {
    const input = type === 'pickup' ? this.pickupAddress : this.newDestination;
    if (input.length < 2) {
      if (type === 'pickup') this.filteredPickupSuggestions = [];
      else this.filteredDestSuggestions = [];
      return;
    }

    const filtered = this.sriLankanLocations.filter(loc => 
      loc.toLowerCase().includes(input.toLowerCase())
    ).slice(0, 5); // Show top 5 matches

    if (type === 'pickup') this.filteredPickupSuggestions = filtered;
    else this.filteredDestSuggestions = filtered;
  }

  selectLocation(location: string, type: 'pickup' | 'dest') {
    if (type === 'pickup') {
      this.pickupAddress = location;
      this.filteredPickupSuggestions = [];
    } else {
      this.newDestination = location;
      this.filteredDestSuggestions = [];
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Close suggestions if clicking elsewhere
    this.filteredPickupSuggestions = [];
    this.filteredDestSuggestions = [];
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
    if (!this.startDate || !this.endDate || !this.customerName || !this.customerPhone || !this.customerEmail || !this.pickupAddress || this.destinations.length === 0) {
      Swal.fire('Missing Information', 'Please fill in all mandatory fields (*). You must add at least one destination and travel dates.', 'warning');
      return;
    }

    if (!this.vehicle) return;

    const dailyTotal = this.vehicle.standardDailyRate * this.bookingDays;
    const nightTotal = this.vehicle.driverNightOutFee * this.bookingNights;
    const subtotal = dailyTotal + nightTotal;

    Swal.fire({
      title: 'Booking Request Summary',
      width: '700px',
      html: `
        <div class="text-start" style="font-size: 0.9rem;">
          <h6 class="mb-2 text-secondary fw-bold" style="font-size: 0.95rem;"><i class="bi bi-person-lines-fill me-2"></i>Passenger Details</h6>
          <div class="bg-light p-2 rounded-2 mb-2 border text-dark">
            <p class="mb-0"><strong>Name:</strong> ${this.customerName}</p>
            <p class="mb-0"><strong>Phone:</strong> ${this.customerPhone}</p>
            ${this.customerEmail ? `<p class="mb-0"><strong>Email:</strong> ${this.customerEmail}</p>` : ''}
            ${this.specialRequests ? `<p class="mb-0 text-muted" style="font-size: 0.85rem;"><i class="bi bi-chat-text me-1"></i><i>"${this.specialRequests}"</i></p>` : ''}
          </div>

          <h6 class="mb-2 text-secondary fw-bold" style="font-size: 0.95rem;"><i class="bi bi-geo-alt-fill me-2"></i>Trip Itinerary</h6>
          <div class="bg-light p-2 rounded-2 mb-3 border text-dark">
            <p class="mb-0"><strong>Vehicle:</strong> ${this.vehicle.description}</p>
            <p class="mb-0"><strong>Travel Dates:</strong> ${this.startDate} to ${this.endDate} (${this.bookingDays} Days)</p>
            <p class="mb-0"><strong>Pickup:</strong> ${this.pickupAddress}</p>
            <p class="mb-0"><strong>Route:</strong> ${this.destinations.join(' <i class="bi bi-arrow-right mx-1 text-secondary"></i> ')}</p>
          </div>
          
          <h6 class="mb-2 text-secondary fw-bold" style="font-size: 0.95rem;"><i class="bi bi-receipt me-2"></i>Pricing Breakdown</h6>
          <table class="table table-bordered table-dark table-sm text-start mb-2">
            <tbody>
              <tr>
                <td class="py-1">Daily Rental (${this.vehicle.standardDailyRate} x ${this.bookingDays} Days)</td>
                <td class="text-end text-light py-1">Rs. ${dailyTotal.toLocaleString()}</td>
              </tr>
              <tr>
                <td class="py-1">Driver Night Fee (${this.vehicle.driverNightOutFee} x ${this.bookingNights} Nights)</td>
                <td class="text-end text-light py-1">Rs. ${nightTotal.toLocaleString()}</td>
              </tr>
              <tr class="table-active">
                <th class="py-1"><strong>Subtotal (Estimated)</strong></th>
                <th class="text-end text-primary py-1" style="font-size: 1rem;"><strong>Rs. ${subtotal.toLocaleString()}</strong></th>
              </tr>
            </tbody>
          </table>

          <div class="alert alert-info mt-2 mb-2 p-2" style="font-size: 0.85rem;">
            <i class="bi bi-info-circle-fill me-2"></i> Your request including the route and passenger details will be sent to <strong>${this.vehicle.providerProfile.name}</strong> for approval.
          </div>

          <div class="alert alert-warning mb-0 p-2" style="font-size: 0.85rem;">
            <i class="bi bi-exclamation-triangle-fill"></i> <strong>Disclaimer:</strong> This subtotal covers a minimum of ${this.vehicle.freeKMLimit || 150}km per day. Extra mileage will be charged based on the final route at Rs. ${this.vehicle.extraKMRate}/km.
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-send me-2"></i> Send Request to Provider',
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
