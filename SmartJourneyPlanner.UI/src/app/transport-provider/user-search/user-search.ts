import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { VehicleType, Vehicle, VehicleClass } from '../../models/transport.model';
import { TransportCalculationService } from '../../services/transport-calculation.service';
import { TransportVehicleService } from '../../services/transport-vehicle.service';
import Swal from 'sweetalert2';

interface CalendarDay {
  date: Date;
  day: number;
  isPast: boolean;
  isBooked: boolean;
  isSelectedStart: boolean;
  isSelectedEnd: boolean;
  isInRange: boolean;
  isBlank: boolean;
}

@Component({
  selector: 'app-user-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './user-search.html',
  styleUrl: './user-search.css'
})
/**
 * This component handles the search and discovery of transport vehicles.
 * Users can filter by category, date, location, and features.
 * It also includes a custom calendar for date range selection.
 */
export class UserSearch implements OnInit {
  // --- SEARCH FILTERS ---
  searchQuery: string = ''; // Text search (e.g. "BMW", "Bus")
  selectedCategory: string = 'All Categories'; // Budget/Luxury/Group filter
  passengerCount: number = 1; // Number of people traveling
  startDate: string = ''; // Format: YYYY-MM-DD
  endDate: string = ''; // Format: YYYY-MM-DD
  todayStr: string = ''; // Used to prevent selecting past dates
  pickupArea: string = ''; // City/Town name
  showLanguageDropdown: boolean = false; // UI toggle
  showCityDropdown: boolean = false; // UI toggle
  sortBy: string = 'Default'; // Sorting logic (Price/Rating)

  // --- STATE VARIABLES ---
  isLoading: boolean = false; // Shows loading spinner
  errorMessage: string | null = null;
  
  // List of cities for the location filter dropdown
  sriLankanCities: string[] = [
    'Colombo', 'Kandy', 'Galle', 'Matara', 'Negombo', 'Jaffna', 'Kurunegala', 'Anuradhapura',
    'Ratnapura', 'Badulla', 'Trincomalee', 'Batticaloa', 'Kalutara', 'Gampaha', 'Puttalam',
    'Nuwara Eliya', 'Hambantota', 'Vavuniya', 'Mullaitivu', 'Mannar', 'Kilinochchi', 'Ampara'
  ];
  filteredCities: string[] = []; // Cities matching user input
  
  // List of languages available for driver filters
  languagesList = [
    { name: 'Sinhala', flag: '🇱🇰' },
    { name: 'English', flag: '🇬🇧' },
    { name: 'Tamil', flag: '🇮🇳' },
    { name: 'French', flag: '🇫🇷' },
    { name: 'German', flag: '🇩🇪' },
    { name: 'Japanese', flag: '🇯🇵' },
    { name: 'Chinese', flag: '🇨🇳' },
    { name: 'Italian', flag: '🇮🇹' }
  ];
  selectedLanguages: { [key: string]: boolean } = {}; // Tracks which languages are checked
  
  // Advanced features filter (e.g. Wi-Fi, Safety)
  featureFilters = { luggage: false, safety: false, entertainment: false, wifi: false, airbags: false };

  // Total duration of the trip calculated from dates
  bookingDays: number = 2;
  bookingNights: number = 1;

  // Stores all vehicles from API and the filtered list shown on UI
  allVehicles: Vehicle[] = [];
  filteredVehicles: Vehicle[] = [];
  vehicleCategories = ['All Categories', ...Object.values(VehicleType)];

  // --- CALENDAR UI STATE ---
  showCalendarModal = false;
  currentCalendarMonth: Date = new Date();
  calendarDays: CalendarDay[] = [];
  targetVehicleForCalendar: Vehicle | null = null;
  tempStart: Date | null = null; // Start date being selected in modal
  tempEnd: Date | null = null; // End date being selected in modal
  hoveredDate: Date | null = null; // For range selection visuals

  constructor(
    public calcService: TransportCalculationService,
    private transportVehicleService: TransportVehicleService
  ) {
    // Initialize languages as unchecked
    this.languagesList.forEach(l => this.selectedLanguages[l.name] = false);
    
    // Set default dates (Today and Tomorrow)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.todayStr = `${year}-${month}-${day}`;
    
    this.startDate = this.todayStr;
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.endDate = tomorrow.toISOString().split('T')[0];
  }

  /**
   * Listen for clicks on the entire document.
   * If the user clicks outside of a dropdown, we close it.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    
    // If the click is not inside a 'custom-dropdown', close both dropdowns
    if (!target.closest('.custom-dropdown')) {
      this.showLanguageDropdown = false;
      this.showCityDropdown = false;
    }
  }

  // Lifecycle hook: loads data when component starts
  ngOnInit() {
    this.loadAvailableVehicles();
    this.calculateDays();
    this.applyFilters();
  }

  /**
   * Calculates how many days and nights the trip will last based on selected dates.
   */
  calculateDays() {
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      
      if (end < start) {
        this.bookingDays = 0;
        this.bookingNights = 0;
        return;
      }

      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      this.bookingDays = diffDays + 1;
      this.bookingNights = diffDays;
    }
  }

  /**
   * Runs whenever the user changes the start or end date in the search bar.
   * Includes validation to prevent past dates or invalid ranges.
   */
  onDateChange() {
    if (this.startDate && this.startDate < this.todayStr) {
      this.startDate = this.todayStr;
    }

    if (this.startDate && this.endDate && this.endDate < this.startDate) {
      this.endDate = this.startDate;
    }

    this.calculateDays();
    this.applyFilters();
  }

  /**
   * Returns a list of languages that are currently selected in the filter.
   */
  getSelectedLangs(): string[] {
    return Object.keys(this.selectedLanguages).filter(l => this.selectedLanguages[l]);
  }

  /**
   * Ensures the passenger count input stays within realistic limits (1-60).
   */
  validatePassengerCount() {
    if (this.passengerCount < 1) {
      this.passengerCount = 1;
    } else if (this.passengerCount > 60) {
      this.passengerCount = 60;
    }
    this.applyFilters();
  }

  /**
   * Fetches all vehicles from the backend API.
   */
  loadAvailableVehicles() {
    this.isLoading = true;
    this.errorMessage = null;
    
    this.transportVehicleService.getVehicles().subscribe({
      next: (vehicles) => {
        this.allVehicles = vehicles;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Could not load vehicles. Please try again.';
        this.isLoading = false;
        Swal.fire('Error', this.errorMessage, 'error');
      }
    });
  }

  /**
   * The core filtering logic. It matches vehicles against all selected criteria:
   * Category, Capacity, Text Search, City, Features, Languages, and Date Availability.
   */
  applyFilters() {
    const cleanQuery = this.searchQuery.trim().toLowerCase();

    this.filteredVehicles = this.allVehicles.filter(v => {
      // Basic match checks
      const matchCategory = this.selectedCategory === 'All Categories' || v.type === this.selectedCategory;
      const matchCapacity = v.seatCount >= this.passengerCount;
      const matchSearch = v.description.toLowerCase().includes(cleanQuery) || 
                          v.vehicleClass.toLowerCase().includes(cleanQuery);
      const matchPickup = !this.pickupArea || v.providerProfile.location.toLowerCase().includes(this.pickupArea.trim().toLowerCase());

      // Feature match check (e.g. must have safety features if filter is ON)
      let matchFeatures = true;
      if (this.featureFilters.luggage && v.features.luggage < 1) matchFeatures = false;
      if (this.featureFilters.safety && !v.features.safety) matchFeatures = false;
      if (this.featureFilters.entertainment && !v.features.entertainment) matchFeatures = false;
      if (this.featureFilters.wifi && !v.features.wifi) matchFeatures = false;
      if (this.featureFilters.airbags && !v.features.airbags) matchFeatures = false;

      // Language match check
      const selectedLangs = this.getSelectedLangs();
      let matchLangs = true;
      if (selectedLangs.length > 0) {
        matchLangs = selectedLangs.some((lang: string) => v.languages.includes(lang));
      }

      // Check if any date in the user's range is already BOOKED for this vehicle
      let dateConflict = false;
      if (this.startDate && this.endDate && v.bookedDates) {
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        let current = new Date(start);
        
        while (current <= end) {
          const dateStr = current.toISOString().split('T')[0];
          if (v.bookedDates.includes(dateStr)) {
            dateConflict = true;
            break;
          }
          current.setDate(current.getDate() + 1);
        }
      }

      return matchCategory && matchCapacity && matchSearch && matchPickup && matchFeatures && matchLangs && !dateConflict;
    });

    // Final sorting based on Price or Rating
    if (this.sortBy === 'Price: Low to High') {
      this.filteredVehicles.sort((a, b) => a.standardDailyRate - b.standardDailyRate);
    } else if (this.sortBy === 'Price: High to Low') {
      this.filteredVehicles.sort((a, b) => b.standardDailyRate - a.standardDailyRate);
    } else if (this.sortBy === 'Best Rated') {
      this.filteredVehicles.sort((a, b) => this.getAverageRating(b) - this.getAverageRating(a));
    }
  }

  /**
   * Resets all search inputs to their default values.
   */
  resetFilters() {
    this.searchQuery = '';
    this.selectedCategory = 'All Categories';
    this.passengerCount = 1;
    this.pickupArea = '';
    this.sortBy = 'Default';
    this.startDate = this.todayStr;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.endDate = tomorrow.toISOString().split('T')[0];

    Object.keys(this.selectedLanguages).forEach(key => this.selectedLanguages[key] = false);
    this.featureFilters = { luggage: false, safety: false, entertainment: false, wifi: false, airbags: false };

    this.calculateDays();
    this.applyFilters();
  }

  /**
   * Toggles the driver language filter dropdown visibility.
   */
  toggleLanguageDropdown() {
    this.showLanguageDropdown = !this.showLanguageDropdown;
    if (this.showLanguageDropdown) {
      this.showCityDropdown = false;
    }
  }

  /**
   * Toggles a specific language on or off in the search filter.
   */
  toggleLanguage(langName: string) {
    this.selectedLanguages[langName] = !this.selectedLanguages[langName];
    this.applyFilters();
  }

  /**
   * Filters the list of Sri Lankan cities based on what the user is typing.
   */
  filterCities() {
    this.showCityDropdown = true;
    this.showLanguageDropdown = false;
    const query = this.pickupArea.toLowerCase().trim();
    if (query === '') {
      this.filteredCities = this.sriLankanCities.slice(0, 8);
    } else {
      this.filteredCities = this.sriLankanCities.filter(city => 
        city.toLowerCase().includes(query)
      );
    }
  }

  /**
   * Sets the pickup area filter when a city is selected from the dropdown.
   */
  selectCity(city: string) {
    this.pickupArea = city;
    this.showCityDropdown = false;
    this.applyFilters();
  }

  /**
   * Triggers the search logic manually when the 'Find' button is clicked.
   */
  onSearch() {
    this.applyFilters();
  }

  /**
   * Helper to calculate the star rating average for a vehicle.
   */
  getAverageRating(vehicle: Vehicle): number {
    if (!vehicle.reviews || vehicle.reviews.length === 0) return 0;
    const sum = vehicle.reviews.reduce((acc, rev) => acc + rev.rating, 0);
    return sum / vehicle.reviews.length;
  }

  // --- CALENDAR UI LOGIC ---

  /**
   * Opens the calendar modal to allow visual date range selection.
   */
  openCalendar(vehicle: Vehicle) {
    this.targetVehicleForCalendar = vehicle;
    this.tempStart = new Date(this.startDate);
    this.tempEnd = new Date(this.endDate);
    this.currentCalendarMonth = new Date(this.tempStart);
    this.generateCalendar();
    this.showCalendarModal = true;
  }

  closeCalendar() {
    this.showCalendarModal = false;
  }

  /**
   * Confirms the dates selected in the calendar and updates the search filters.
   */
  applyCalendarDates() {
    if (this.tempStart && this.tempEnd) {
      this.startDate = this.tempStart.toISOString().split('T')[0];
      this.endDate = this.tempEnd.toISOString().split('T')[0];
      this.calculateDays();
      this.applyFilters();
      this.closeCalendar();
    } else {
      Swal.fire('Incomplete', 'Please select both start and end dates.', 'warning');
    }
  }

  /**
   * Generates the day objects for the current month shown in the calendar.
   * Handles blanks, past dates, and booked dates (grayed out).
   */
  generateCalendar() {
    this.calendarDays = [];
    const year = this.currentCalendarMonth.getFullYear();
    const month = this.currentCalendarMonth.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    // Fill empty slots for days before the 1st of the month
    for (let i = 0; i < firstDayIndex; i++) {
       this.calendarDays.push({ date: new Date(), day: 0, isPast: true, isBooked: false, isSelectedStart: false, isSelectedEnd: false, isInRange: false, isBlank: true });
    }

    const today = new Date();
    today.setHours(0,0,0,0);

    // Create days 1 through 28/30/31
    for (let i = 1; i <= lastDate; i++) {
       const d = new Date(year, month, i);
       d.setHours(0,0,0,0);
       
       const dateString = d.toISOString().split('T')[0];
       const isBookedStr = this.targetVehicleForCalendar?.bookedDates?.includes(dateString) || false;
       
       let isStart = false;
       let isEnd = false;
       let inRange = false;

       if (this.tempStart && d.getTime() === this.tempStart.getTime()) isStart = true;
       if (this.tempEnd && d.getTime() === this.tempEnd.getTime()) isEnd = true;
       if (this.tempStart && this.tempEnd && d > this.tempStart && d < this.tempEnd) inRange = true;

       // Highlight range while hovering
       if (this.tempStart && !this.tempEnd && this.hoveredDate && d > this.tempStart && d <= this.hoveredDate) {
         inRange = true;
       }

       this.calendarDays.push({
         date: d,
         day: i,
         isPast: d < today,
         isBooked: isBookedStr,
         isSelectedStart: isStart,
         isSelectedEnd: isEnd,
         isInRange: inRange,
         isBlank: false
       });
    }
  }

  nextMonth() {
    this.currentCalendarMonth = new Date(this.currentCalendarMonth.getFullYear(), this.currentCalendarMonth.getMonth() + 1, 1);
    this.generateCalendar();
  }

  prevMonth() {
    this.currentCalendarMonth = new Date(this.currentCalendarMonth.getFullYear(), this.currentCalendarMonth.getMonth() - 1, 1);
    this.generateCalendar();
  }

  /**
   * Handles clicking a day in the calendar.
   * Logic: First click selects START, second click selects END.
   */
  selectDate(d: CalendarDay) {
    if (d.isBlank || d.isPast || d.isBooked) return;

    if (!this.tempStart || (this.tempStart && this.tempEnd)) {
      this.tempStart = d.date;
      this.tempEnd = null;
    } else {
      if (d.date < this.tempStart) {
        this.tempStart = d.date;
      } else {
        // Ensure no booked days exist between start and selected end
        let valid = true;
        let checkDate = new Date(this.tempStart);
        while(checkDate <= d.date) {
           const str = checkDate.toISOString().split('T')[0];
           if (this.targetVehicleForCalendar?.bookedDates?.includes(str)) { valid = false; break; }
           checkDate.setDate(checkDate.getDate() + 1);
        }
        if (valid) {
          this.tempEnd = d.date;
        } else {
          Swal.fire('Unavailable', 'Part of your range is already booked.', 'warning');
          this.tempStart = d.date;
        }
      }
    }
    this.generateCalendar();
  }

  /**
   * Highlights the range in the calendar while the user is choosing an end date.
   */
  onDayHover(d: CalendarDay) {
    if (d.isBlank || d.isPast || d.isBooked) {
      this.hoveredDate = null;
    } else {
      this.hoveredDate = d.date;
    }
    this.generateCalendar();
  }

  // --- BOOKING LOGIC ---

  /**
   * Shows a confirmation summary with price breakdown before submitting a booking request.
   */
  requestBooking(vehicle: Vehicle) {
    if (this.bookingDays <= 0) {
      Swal.fire('Invalid Dates', 'Please select valid travel dates.', 'warning');
      return;
    }

    const dailyTotal = vehicle.standardDailyRate * this.bookingDays;
    const nightTotal = vehicle.driverNightOutFee * this.bookingNights;
    const subtotal = dailyTotal + nightTotal;

    Swal.fire({
      title: 'Confirm Booking Request',
      width: '600px',
      html: `
        <div class="text-start">
          <p><strong>Vehicle:</strong> ${vehicle.modelName}</p>
          <hr>
          <h5 class="mb-3">Price Summary</h5>
          <table class="table table-sm">
            <tr><td>Rental (${this.bookingDays} Days)</td><td class="text-end">Rs. ${dailyTotal.toLocaleString()}</td></tr>
            <tr><td>Driver Night Fee (${this.bookingNights} Nights)</td><td class="text-end">Rs. ${nightTotal.toLocaleString()}</td></tr>
            <tr class="fw-bold"><td>Estimated Total</td><td class="text-end text-primary">Rs. ${subtotal.toLocaleString()}</td></tr>
          </table>
          <div class="small text-muted italic mt-2">Extra KM charges apply after ${vehicle.freeKMLimit}km/day.</div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Send Request',
      confirmButtonColor: '#0c92f4'
    }).then((result) => {
      if (result.isConfirmed) {
        // In a real app, this would call the booking API
        Swal.fire('Request Sent!', 'The provider will review your request.', 'success');
      }
    });
  }
}

