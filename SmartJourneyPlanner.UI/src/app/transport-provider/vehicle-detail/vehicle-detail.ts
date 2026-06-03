/**
 * This component displays the detailed profile page for a single vehicle.
 * It allows travelers to:
 * - See interior and exterior photos.
 * - View customer reviews and ratings.
 * - Check rental prices and fees.
 * - Submit a formal booking request with their trip itinerary.
 */

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
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './vehicle-detail.html',
    styleUrl: './vehicle-detail.css'
})
export class VehicleDetailComponent implements OnInit {
  // --- VEHICLE DATA ---
  vehicle: Vehicle | undefined;
  mainImage: string = ''; // The large image currently shown in the center of the gallery
  currentView: 'exterior' | 'interior' = 'exterior'; 
  
  // --- TRIP DURATION ---
  bookingDays: number = 1;
  bookingNights: number = 0;
  
  // --- BOOKING FORM DATA ---
  startDate: string = '';
  endDate: string = '';
  minDate: string = ''; // Used to prevent selecting past dates in the calendar
  customerName: string = '';
  customerPhone: string = '';
  customerEmail: string = '';
  specialRequests: string = '';
  pickupAddress: string = '';
  destinations: string[] = []; // List of all stops planned for the trip
  newDestination: string = ''; // Temporary storage for the input field when adding a stop
  passengerCount: number | null = null;
  luggageCount: number | null = null;
  
  // --- PAGE STATE ---
  isLoading: boolean = false;
  errorMessage: string | null = null;
  isFormSubmitted: boolean = false; // Tracks if the user clicked "Send Request"
  
  // Major Sri Lankan cities for the location autocomplete suggestions
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
  isReviewsExpanded: boolean = false; // Controls the "Accordion" for reviews section

  constructor(
    private route: ActivatedRoute,
    private transportVehicleService: TransportVehicleService,
    private transportBookingService: TransportBookingService,
    public calcService: TransportCalculationService
  ) {
    // Set the minimum selectable date to "Today"
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.minDate = `${year}-${month}-${day}`;
  }

  // Runs when the page loads: Extracts the vehicle ID from the URL and loads its data
  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.isLoading = true;
        this.transportVehicleService.getVehicleById(id).subscribe({
          next: (v) => {
            this.vehicle = v;
            if (v) {
              this.mainImage = v.exteriorPhoto || '';
              this.currentView = 'exterior';
            } else {
              this.errorMessage = 'Vehicle not found.';
            }
            this.isLoading = false;
          },
          error: () => {
            this.errorMessage = 'Failed to load details.';
            this.isLoading = false;
          }
        });
      }
    });

    // If dates were already picked on the search page, pre-fill the form
    this.route.queryParams.subscribe(params => {
      let start = params['start'];
      let end = params['end'];
      if (start && end) {
        this.startDate = start;
        this.endDate = end;
        this.calculateDuration(start, end);
      }
    });
  }

  /**
   * Automatically calculates total days and nights when dates are selected.
   */
  private calculateDuration(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end >= start) {
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      this.bookingDays = diffDays + 1; // e.g. Monday to Tuesday is 2 days
      this.bookingNights = diffDays;   // e.g. Monday to Tuesday is 1 night
    }
  }

  /**
   * Basic logic to prevent users from picking invalid date ranges.
   */
  onDateChange() {
    if (this.startDate && this.startDate < this.minDate) this.startDate = this.minDate;
    if (this.startDate && this.endDate && this.endDate < this.startDate) this.endDate = this.startDate;
    if (this.startDate && this.endDate) this.calculateDuration(this.startDate, this.endDate);
  }

  // --- FORM VALIDATION HELPERS ---

  isEmailValid(): boolean {
    if (!this.customerEmail) return true; // Optional
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(this.customerEmail.trim());
  }

  isNameValid(): boolean {
    if (!this.customerName) return false;
    const re = /^(?=.*[a-zA-Z].*[a-zA-Z])[a-zA-Z\s\.\-]{3,}$/;
    return re.test(this.customerName.trim());
  }

  isPhoneValid(): boolean {
    if (!this.customerPhone) return false;
    const cleaned = this.customerPhone.replace(/[\s\-\(\)]/g, '');
    const re = /^\+?[0-9]{7,15}$/;
    return re.test(cleaned);
  }

  isPickupAddressValid(): boolean {
    if (!this.pickupAddress) return false;
    const re = /^(?=.*[a-zA-Z].*[a-zA-Z])[a-zA-Z\s\.\,\-\/]{3,}$/;
    return re.test(this.pickupAddress.trim());
  }

  isDestinationValid(dest: string): boolean {
    if (!dest) return false;
    const re = /^(?=.*[a-zA-Z].*[a-zA-Z])[a-zA-Z\s\.\,\-\/]{3,}$/;
    return re.test(dest.trim());
  }

  // --- PHOTO GALLERY LOGIC ---

  // Switches between looking at the interior or exterior photo
  setMainView(view: 'exterior' | 'interior') {
    if (!this.vehicle) return;
    this.currentView = view;
    this.mainImage = (view === 'exterior' ? this.vehicle.exteriorPhoto : this.vehicle.interiorPhoto) || '';
  }

  toggleGalleryView() {
    this.currentView = this.currentView === 'exterior' ? 'interior' : 'exterior';
    this.setMainView(this.currentView);
  }

  getTotalReviews(): number {
    return this.vehicle?.reviews?.length || 0;
  }

  toggleReviewsAccordion() {
    this.isReviewsExpanded = !this.isReviewsExpanded;
  }


  // --- TRIP ROUTE MANAGEMENT ---

  /**
   * Adds a new stop to the traveler's planned route.
   */
  addDestination() {
    if (this.newDestination && this.newDestination.trim() !== '') {
      this.destinations.push(this.newDestination.trim());
      this.newDestination = '';
    }
  }

  removeDestination(index: number) {
    this.destinations.splice(index, 1);
  }

  /**
   * Filters the list of cities based on user input for autocomplete suggestions.
   */
  onLocationInput(type: 'pickup' | 'dest') {
    const input = type === 'pickup' ? this.pickupAddress : this.newDestination;
    if (input.length < 2) return;
    const filtered = this.sriLankanLocations.filter(loc => 
      loc.toLowerCase().includes(input.toLowerCase())
    ).slice(0, 5);
    if (type === 'pickup') this.filteredPickupSuggestions = filtered;
    else this.filteredDestSuggestions = filtered;
  }

  // Sets the selected city into the correct field
  selectLocation(location: string, type: 'pickup' | 'dest') {
    if (type === 'pickup') {
      this.pickupAddress = location;
      this.filteredPickupSuggestions = [];
    } else {
      this.newDestination = location;
      this.filteredDestSuggestions = [];
    }
  }

  // --- PRICE CALCULATIONS ---

  getEstimatedTotal(): number {
    if (!this.vehicle) return 0;
    return this.calcService.calculateEstimatedTotal(
      this.vehicle.standardDailyRate,
      this.bookingDays,
      this.vehicle.driverNightOutFee,
      this.bookingNights
    );
  }

  /**
   * Main function to submit the booking request.
   * Performs deep validation and shows a beautiful summary popup for the user to confirm.
   */
  onRequestBooking() {
    this.isFormSubmitted = true;

    // 1. Check if mandatory data is present
    if (!this.startDate || !this.endDate || !this.customerName || !this.customerPhone || !this.pickupAddress || this.destinations.length === 0) {
      Swal.fire({
        title: 'Form Incomplete',
        text: 'Please fill in all mandatory fields (*). You must add at least one destination and valid travel dates.',
        icon: 'warning',
        confirmButtonColor: '#0c92f4'
      });
      return;
    }

    // 2. Validate custom patterns (Names, Phones, Emails)
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

    // 3. Final Date Verification
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

    // Calculate final breakdown for the summary popup
    const dailyTotal = this.vehicle.standardDailyRate * this.bookingDays;
    const nightTotal = this.vehicle.driverNightOutFee * this.bookingNights;
    const subtotal = dailyTotal + nightTotal;

    // 4. Show the "Review & Confirm" Popup
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
            <i class="bi bi-info-circle-fill me-2"></i> Your request will be sent to <strong>${this.vehicle.providerProfile.name}</strong> for approval.
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-send me-2"></i> Send Request to Provider',
      confirmButtonColor: '#0c92f4',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        // Build the final booking object to be saved in the database
        const newBooking: any = {
          vehicleId: this.vehicle?.id,
          userId: 'u1', 
          providerId: this.vehicle?.providerId,
          startDate: this.startDate, endDate: this.endDate,
          nights: this.bookingNights, days: this.bookingDays,
          totalAmount: subtotal, status: 'Pending',
          pickupAddress: this.pickupAddress, destinations: this.destinations,
          vehicleImage: this.vehicle?.exteriorPhoto,
          providerName: this.vehicle?.providerProfile.name,
          providerPhone: this.vehicle?.providerProfile.phone,
          userName: this.customerName, contactNumber: this.customerPhone,
          pricingSummary: {
            dailyRate: this.vehicle?.standardDailyRate || 0, dailyRental: dailyTotal,
            nightlyRate: this.vehicle?.driverNightOutFee || 0, driverNightOut: nightTotal
          }
        };

        // 5. Send to Server
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
            Swal.fire('Error', 'Failed to send booking request.', 'error');
          }
        });
      }
    });
  }

  // --- REVIEW STATS LOGIC ---

  getAverageRating(): number {
    if (!this.vehicle?.reviews?.length) return 0;
    const total = this.vehicle.reviews.reduce((acc, r) => acc + r.rating, 0);
    return parseFloat((total / this.vehicle.reviews.length).toFixed(1));
  }

  getRatingPercentage(starLevel: number): number {
    if (!this.vehicle?.reviews?.length) return 0;
    const count = this.vehicle.reviews.filter(r => r.rating === starLevel).length;
    return (count / this.vehicle.reviews.length) * 100;
  }

  getVisibleReviews() {
    if (!this.vehicle) return [];
    // Show either all reviews or just the first 3
    return this.showAllReviews ? this.vehicle.reviews : this.vehicle.reviews.slice(0, 3);
  }

  toggleReviews() {
    this.showAllReviews = !this.showAllReviews;
  }

  // Smoothly scroll down to the reviews section when clicking the star rating
  scrollToReviews() {
    this.isReviewsExpanded = true;
    setTimeout(() => {
      const element = document.getElementById('reviews-section');
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
}
