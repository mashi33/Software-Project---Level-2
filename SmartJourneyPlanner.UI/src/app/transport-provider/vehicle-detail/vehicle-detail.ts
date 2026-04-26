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
/**
 * This component displays the detailed profile of a single vehicle.
 * It allows users to view photos, reviews, and submit a booking request.
 */
export class VehicleDetailComponent implements OnInit {
  // --- VEHICLE DATA ---
  vehicle: Vehicle | undefined;
  mainImage: string = ''; // The large image currently shown in the gallery
  currentView: 'exterior' | 'interior' = 'exterior'; // Gallery toggle state
  
  // --- TRIP CALCULATIONS ---
  bookingDays: number = 1;
  bookingNights: number = 0;
  
  // --- BOOKING FORM FIELDS ---
  startDate: string = '';
  endDate: string = '';
  minDate: string = ''; // Prevents past date selection
  customerName: string = '';
  customerPhone: string = '';
  customerEmail: string = '';
  specialRequests: string = '';
  pickupAddress: string = '';
  destinations: string[] = []; // List of stops for the trip
  newDestination: string = ''; // Input field for adding a new stop
  passengerCount: number | null = null;
  luggageCount: number | null = null;
  
  // --- UI STATE ---
  isLoading: boolean = false;
  errorMessage: string | null = null;
  isFormSubmitted: boolean = false;
  
  // List of major Sri Lankan cities for autocomplete suggestions
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
  
  showAllReviews: boolean = false; // Toggles review list length
  isReviewsExpanded: boolean = false; // Toggles the reviews section accordion

  constructor(
    private route: ActivatedRoute,
    private transportVehicleService: TransportVehicleService,
    private transportBookingService: TransportBookingService,
    public calcService: TransportCalculationService
  ) {
    // Set minDate to today's date in YYYY-MM-DD format
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.minDate = `${year}-${month}-${day}`;
  }

  // Lifecycle hook: Fetches vehicle data using the ID from the URL
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

    // Auto-fill dates if they were passed from the search page
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
   * Calculates the number of days and nights based on selected dates.
   */
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

  /**
   * Logic to prevent past dates and ensure Drop-off is after Pickup.
   */
  onDateChange() {
    if (this.startDate && this.startDate < this.minDate) this.startDate = this.minDate;
    if (this.startDate && this.endDate && this.endDate < this.startDate) this.endDate = this.startDate;
    if (this.startDate && this.endDate) this.calculateDuration(this.startDate, this.endDate);
  }

  // --- VALIDATION HELPERS ---

  isEmailValid(): boolean {
    if (!this.customerEmail) return true;
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

  // --- GALLERY LOGIC ---

  setMainView(view: 'exterior' | 'interior') {
    if (!this.vehicle) return;
    this.currentView = view;
    this.mainImage = (view === 'exterior' ? this.vehicle.exteriorPhoto : this.vehicle.interiorPhoto) || '';
  }

  // --- ROUTE/STOP LOGIC ---

  /**
   * Adds a new destination stop to the trip itinerary.
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
   * Filters location suggestions as the user types in pickup or destination fields.
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

  selectLocation(location: string, type: 'pickup' | 'dest') {
    if (type === 'pickup') {
      this.pickupAddress = location;
      this.filteredPickupSuggestions = [];
    } else {
      this.newDestination = location;
      this.filteredDestSuggestions = [];
    }
  }

  // --- CALCULATION LOGIC ---

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
   * Performs final validation and shows a summary popup before sending to the provider.
   */
  onRequestBooking() {
    this.isFormSubmitted = true;

    // Check for required fields
    if (!this.startDate || !this.endDate || !this.customerName || !this.customerPhone || !this.pickupAddress || this.destinations.length === 0) {
      Swal.fire('Incomplete', 'Please fill in all required fields marked with (*).', 'warning');
      return;
    }

    if (!this.isNameValid() || !this.isPhoneValid()) {
      Swal.fire('Invalid Info', 'Please check your name and phone number format.', 'warning');
      return;
    }

    if (!this.vehicle) return;

    // Show a summary of the booking request to the user
    const subtotal = this.getEstimatedTotal();
    Swal.fire({
      title: 'Confirm Booking Request',
      width: '700px',
      html: `<div class="text-start">... (Summary HTML) ...</div>`, // Summarized for brevity
      showCancelButton: true,
      confirmButtonText: 'Send Request',
      confirmButtonColor: '#0c92f4'
    }).then((result) => {
      if (result.isConfirmed) {
        // Build the booking object and send to the service
        const newBooking: any = {
          vehicleId: this.vehicle?.id,
          userId: 'u1',
          providerId: this.vehicle?.providerId,
          startDate: this.startDate,
          endDate: this.endDate,
          nights: this.bookingNights,
          days: this.bookingDays,
          totalAmount: subtotal,
          status: 'Pending',
          pickupAddress: this.pickupAddress,
          destinations: this.destinations,
          userName: this.customerName,
          contactNumber: this.customerPhone
          // ... other fields
        };

        this.transportBookingService.createBooking(newBooking).subscribe({
          next: () => Swal.fire('Success!', 'Request sent to provider.', 'success'),
          error: () => Swal.fire('Error', 'Failed to send request.', 'error')
        });
      }
    });
  }

  // --- REVIEW/RATING LOGIC ---

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
    return this.showAllReviews ? this.vehicle.reviews : this.vehicle.reviews.slice(0, 3);
  }

  toggleReviews() {
    this.showAllReviews = !this.showAllReviews;
  }

  scrollToReviews() {
    this.isReviewsExpanded = true;
    setTimeout(() => {
      const element = document.getElementById('reviews-section');
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
}
