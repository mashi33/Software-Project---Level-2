import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TransportVehicleService } from '../../services/transport-vehicle.service';
import { TransportBookingService } from '../../services/transport-booking.service';
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
  minDate: string = '';
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
  
  // State Variables
  isLoading: boolean = false;
  errorMessage: string | null = null;
  isFormSubmitted: boolean = false;
  
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
    private transportVehicleService: TransportVehicleService,
    private transportBookingService: TransportBookingService,
    public calcService: TransportCalculationService
  ) {
    const today = new Date();
    // More robust local date calculation
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.minDate = `${year}-${month}-${day}`;
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.isLoading = true;
        this.errorMessage = null;
        
        this.transportVehicleService.getVehicleById(id).subscribe({
          next: (v) => {
            if (v && v.languages) {
              v.languages = Array.from(new Set(v.languages));
            }
            this.vehicle = v;
            if (v) {
              this.mainImage = v.exteriorPhoto || '';
              this.currentView = 'exterior';
            } else {
              this.errorMessage = 'Vehicle not found. It may have been removed or the ID is incorrect.';
            }
            this.isLoading = false;
          },
          error: (err) => {
            console.error('Error fetching vehicle:', err);
            this.errorMessage = 'Failed to load vehicle details. Please check your connection.';
            this.isLoading = false;
          }
        });
      }
    });

    // Capture query parameters for automatic calculation
    this.route.queryParams.subscribe(params => {
      let start = params['start'];
      let end = params['end'];
      
      // Auto fill from Find Transport, or default to today/tomorrow
      if (!start || !end) {
        start = this.minDate;
        const tomorrowDate = new Date(today);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const ty = tomorrowDate.getFullYear();
        const tm = String(tomorrowDate.getMonth() + 1).padStart(2, '0');
        const td = String(tomorrowDate.getDate()).padStart(2, '0');
        end = `${ty}-${tm}-${td}`;
      }

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
    const today = new Date(this.minDate);
    
    // 1. Prevent selection of past dates for Start Date
    if (this.startDate && this.startDate < this.minDate) {
      setTimeout(() => {
        this.startDate = this.minDate;
        this.onDateChange();
      }, 1500);
    }

    // 2. Ensure End Date is at least the same as Start Date
    if (this.startDate && this.endDate && this.endDate < this.startDate) {
      setTimeout(() => {
        this.endDate = this.startDate;
        this.onDateChange();
      }, 1500);
    }

    if (this.startDate && this.endDate) {
      this.calculateDuration(this.startDate, this.endDate);
    }
  }

  isEmailValid(): boolean {
    if (!this.customerEmail) return true; // Optional field
    // Enhanced regex for email validation
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(this.customerEmail.trim());
  }

  isNameValid(): boolean {
    if (!this.customerName) return false;
    const name = this.customerName.trim();
    // Must contain at least 2 letters and overall be at least 3 chars long.
    const re = /^(?=.*[a-zA-Z].*[a-zA-Z])[a-zA-Z\s\.\-]{3,}$/;
    if (!re.test(name)) return false;

    // Check if all characters are the same (e.g., "aaa")
    const cleaned = name.replace(/[\s\.\-]/g, '').toLowerCase();
    const allSame = cleaned.split('').every(char => char === cleaned[0]);
    if (allSame) return false;

    return true;
  }

  isPhoneValid(): boolean {
    if (!this.customerPhone) return false;
    const phone = this.customerPhone.trim();
    
    // Clean all non-numeric characters except +
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    // Standard international regex: starts with optional +, then 7-15 digits
    const re = /^\+?[0-9]{7,15}$/;
    if (!re.test(cleaned)) return false;

    // Additional check: Ensure it's not all the same digits (e.g., 000000000)
    const digitsOnly = cleaned.replace('+', '');
    const allSame = digitsOnly.split('').every(char => char === digitsOnly[0]);
    if (allSame && digitsOnly.length > 5) return false;

    return true;
  }

  isPickupAddressValid(): boolean {
    if (!this.pickupAddress) return false;
    const addr = this.pickupAddress.trim();
    // Must contain at least 2 letters and overall be at least 3 chars long.
    const re = /^(?=.*[a-zA-Z].*[a-zA-Z])[a-zA-Z0-9\s\.\,\-\/]{3,}$/;
    if (!re.test(addr)) return false;

    // Check if all letters are the same (e.g., "aaa")
    const lettersOnly = addr.replace(/[^a-zA-Z]/g, '').toLowerCase();
    const allSame = lettersOnly.split('').every(char => char === lettersOnly[0]);
    if (allSame) return false;

    return true;
  }

  setMainView(view: 'exterior' | 'interior') {
    if (!this.vehicle) return;
    this.currentView = view;
    this.mainImage = (view === 'exterior' ? this.vehicle.exteriorPhoto : this.vehicle.interiorPhoto) || '';
  }

  toggleGalleryView() {
    this.setMainView(this.currentView === 'exterior' ? 'interior' : 'exterior');
  }

  isDestinationValid(dest: string): boolean {
    if (!dest) return false;
    const d = dest.trim();
    // Must contain at least 2 letters and overall be at least 3 chars long.
    const re = /^(?=.*[a-zA-Z].*[a-zA-Z])[a-zA-Z0-9\s\.\,\-\/]{3,}$/;
    if (!re.test(d)) return false;

    // Check if all letters are the same (e.g., "aaa")
    const lettersOnly = d.replace(/[^a-zA-Z]/g, '').toLowerCase();
    const allSame = lettersOnly.split('').every(char => char === lettersOnly[0]);
    if (allSame) return false;

    return true;
  }

  addDestination() {
    if (this.newDestination && this.newDestination.trim() !== '') {
      if (this.isDestinationValid(this.newDestination)) {
        this.destinations.push(this.newDestination.trim());
        this.newDestination = '';
      } else {
        Swal.fire({
          title: 'Invalid Destination',
          text: 'Please enter a valid destination (no numbers only or repeated characters).',
          icon: 'warning',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
      }
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
    this.isFormSubmitted = true;

    // Check mandatory fields
    if (!this.startDate || !this.endDate || !this.customerName || !this.customerPhone || !this.pickupAddress || this.destinations.length === 0) {
      Swal.fire({
        title: 'Form Incomplete',
        text: 'Please fill in all mandatory fields (*). You must add at least one destination and valid travel dates.',
        icon: 'warning',
        confirmButtonColor: '#0c92f4'
      });
      return;
    }

    // Check custom validations
    if (!this.isNameValid()) {
      Swal.fire('Invalid Name', 'Please enter a valid full name (at least 3 letters, no numbers).', 'warning');
      return;
    }

    if (!this.isPhoneValid()) {
      Swal.fire('Invalid Phone', 'Please enter a valid phone number.', 'warning');
      return;
    }

    if (!this.isPickupAddressValid()) {
      Swal.fire('Invalid Pickup Location', 'Please enter a valid pickup address (at least 3 characters).', 'warning');
      return;
    }

    if (!this.isEmailValid()) {
      Swal.fire('Invalid Email', 'Please enter a valid email address.', 'warning');
      return;
    }

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      Swal.fire('Invalid Date', 'Pickup date cannot be in the past.', 'warning');
      return;
    }
    
    if (end < start) {
      Swal.fire('Invalid Date', 'Drop-off date cannot be earlier than the pickup date.', 'warning');
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
        const newBooking: any = {
          vehicleId: this.vehicle?.id,
          userId: 'u1', // mock user ID
          providerId: this.vehicle?.providerId,
          startDate: this.startDate,
          endDate: this.endDate,
          nights: this.bookingNights,
          days: this.bookingDays,
          totalAmount: subtotal,
          status: 'Pending',
          pickupAddress: this.pickupAddress,
          destinations: this.destinations,
          vehicleImage: this.vehicle?.exteriorPhoto,
          providerName: this.vehicle?.providerProfile.name,
          providerPhone: this.vehicle?.providerProfile.phone,
          userName: this.customerName,
          contactNumber: this.customerPhone,
          pricingSummary: {
            dailyRate: this.vehicle?.standardDailyRate || 0,
            dailyRental: dailyTotal,
            nightlyRate: this.vehicle?.driverNightOutFee || 0,
            driverNightOut: nightTotal
          }
        };

        this.transportBookingService.createBooking(newBooking).subscribe({
          next: () => {
            Swal.fire({
              title: 'Success!',
              text: 'Your booking request has been sent to the provider. They will contact you shortly.',
              icon: 'success',
              confirmButtonColor: '#000000'
            });
          },
          error: (err) => {
            console.error(err);
            Swal.fire('Error', 'Failed to send booking request.', 'error');
          }
        });
      }
    });
  }

  getAverageRating(): number {
    if (!this.vehicle || !this.vehicle.reviews || this.vehicle.reviews.length === 0) return 0;
    const total = this.vehicle.reviews.reduce((acc, r) => acc + r.rating, 0);
    return parseFloat((total / this.vehicle.reviews.length).toFixed(1));
  }

  getTotalReviews(): number {
    return this.vehicle?.reviews?.length || 0;
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
