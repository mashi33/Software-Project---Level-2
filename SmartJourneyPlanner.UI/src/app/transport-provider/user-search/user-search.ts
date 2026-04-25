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
export class UserSearch implements OnInit {
  // Search Filters
  searchQuery: string = '';
  selectedCategory: string = 'All Categories'; // Budget/Luxury/Group
  passengerCount: number = 1;
  startDate: string = '';
  endDate: string = '';
  todayStr: string = ''; // Used for date validation
  pickupArea: string = '';
  showLanguageDropdown: boolean = false;
  showCityDropdown: boolean = false;
  sortBy: string = 'Default'; // Default, Price: Low to High, Price: High to Low, Best Rated

  // State Variables
  isLoading: boolean = false;
  errorMessage: string | null = null;
  
  sriLankanCities: string[] = [
    'Colombo', 'Kandy', 'Galle', 'Matara', 'Negombo', 'Jaffna', 'Kurunegala', 'Anuradhapura',
    'Ratnapura', 'Badulla', 'Trincomalee', 'Batticaloa', 'Kalutara', 'Gampaha', 'Puttalam',
    'Nuwara Eliya', 'Hambantota', 'Vavuniya', 'Mullaitivu', 'Mannar', 'Kilinochchi', 'Ampara'
  ];
  filteredCities: string[] = [];
  
  // Advanced Filters
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
  selectedLanguages: { [key: string]: boolean } = {};
  
  featureFilters = { luggage: false, safety: false, entertainment: false, wifi: false, airbags: false };

  // Booking Calculator Inputs
  bookingDays: number = 2;
  bookingNights: number = 1;

  // Dynamic Vehicle Data
  allVehicles: Vehicle[] = [];
  filteredVehicles: Vehicle[] = [];
  vehicleCategories = ['All Categories', ...Object.values(VehicleType)];

  // Calendar State
  showCalendarModal = false;
  currentCalendarMonth: Date = new Date();
  calendarDays: CalendarDay[] = [];
  targetVehicleForCalendar: Vehicle | null = null;
  tempStart: Date | null = null;
  tempEnd: Date | null = null;
  hoveredDate: Date | null = null;

  getSelectedLangs(): string[] {
    return Object.keys(this.selectedLanguages).filter(l => this.selectedLanguages[l]);
  }

  toggleLanguageDropdown() {
    this.showLanguageDropdown = !this.showLanguageDropdown;
  }

  toggleLanguage(langName: string) {
    this.selectedLanguages[langName] = !this.selectedLanguages[langName];
    this.applyFilters();
  }

  filterCities() {
    this.showCityDropdown = true;
    if (!this.pickupArea) {
      this.filteredCities = [...this.sriLankanCities];
    } else {
      this.filteredCities = this.sriLankanCities.filter(city => 
        city.toLowerCase().includes(this.pickupArea.toLowerCase())
      );
    }
  }

  selectCity(city: string) {
    this.pickupArea = city;
    this.showCityDropdown = false;
    this.applyFilters();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-dropdown')) {
      this.showLanguageDropdown = false;
      this.showCityDropdown = false;
    }
  }

  constructor(
    public calcService: TransportCalculationService,
    private transportVehicleService: TransportVehicleService
  ) {
    this.languagesList.forEach(l => this.selectedLanguages[l.name] = false);
    const today = new Date();
    this.todayStr = today.toISOString().split('T')[0];
    
    this.startDate = this.todayStr;
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.endDate = tomorrow.toISOString().split('T')[0];
  }

  ngOnInit() {
    this.loadAvailableVehicles();
    this.calculateDays();
    this.applyFilters();
  }

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

  onDateChange() {
    // 1. Prevent selection of past dates for Start Date
    if (this.startDate && this.startDate < this.todayStr) {
      setTimeout(() => {
        this.startDate = this.todayStr;
        this.calculateDays();
        this.applyFilters();
      }, 1500);
    }

    // 2. Ensure End Date is at least the same as Start Date
    if (this.startDate && this.endDate && this.endDate < this.startDate) {
      setTimeout(() => {
        this.endDate = this.startDate;
        this.calculateDays();
        this.applyFilters();
      }, 1500);
    }

    this.calculateDays();
    this.applyFilters();
  }

  validatePassengerCount() {
    if (this.passengerCount < 1) {
      this.passengerCount = 1;
    } else if (this.passengerCount > 60) {
      this.passengerCount = 60;
    }
    this.applyFilters();
  }

  onSearch() {
    this.searchQuery = this.searchQuery.trim();
    this.applyFilters();
    // Scroll to results or show a loading state if needed
  }

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
        console.error('Error fetching vehicles:', err);
        this.errorMessage = 'Could not load vehicles. Please check your connection or try again later.';
        this.isLoading = false;
        Swal.fire('Error', this.errorMessage, 'error');
      }
    });
  }

  applyFilters() {
    const cleanQuery = this.searchQuery.trim().toLowerCase();

    this.filteredVehicles = this.allVehicles.filter(v => {
      const matchCategory = this.selectedCategory === 'All Categories' || v.type === this.selectedCategory;
      const matchCapacity = v.seatCount >= this.passengerCount;
      const matchSearch = v.description.toLowerCase().includes(cleanQuery) || 
                          v.vehicleClass.toLowerCase().includes(cleanQuery);
      
      const matchPickup = !this.pickupArea || v.providerProfile.location.toLowerCase().includes(this.pickupArea.trim().toLowerCase());

      let matchFeatures = true;
      if (this.featureFilters.luggage && v.features.luggage < 1) matchFeatures = false;
      if (this.featureFilters.safety && !v.features.safety) matchFeatures = false;
      if (this.featureFilters.entertainment && !v.features.entertainment) matchFeatures = false;
      if (this.featureFilters.wifi && !v.features.wifi) matchFeatures = false;
      if (this.featureFilters.airbags && !v.features.airbags) matchFeatures = false;

      const selectedLangs = this.getSelectedLangs();
      let matchLangs = true;
      if (selectedLangs.length > 0) {
        matchLangs = selectedLangs.some((lang: string) => v.languages.includes(lang));
      }

      // Check if global date selection conflicts with vehicle booked dates
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

    // Handle Sorting
    if (this.sortBy === 'Price: Low to High') {
      this.filteredVehicles.sort((a, b) => a.standardDailyRate - b.standardDailyRate);
    } else if (this.sortBy === 'Price: High to Low') {
      this.filteredVehicles.sort((a, b) => b.standardDailyRate - a.standardDailyRate);
    } else if (this.sortBy === 'Best Rated') {
      this.filteredVehicles.sort((a, b) => this.getAverageRating(b) - this.getAverageRating(a));
    }
  }

  resetFilters() {
    this.searchQuery = '';
    this.selectedCategory = 'All Categories';
    this.passengerCount = 1;
    this.pickupArea = '';
    this.sortBy = 'Default';
    
    // Reset Dates to Today/Tomorrow
    this.startDate = this.todayStr;
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.endDate = tomorrow.toISOString().split('T')[0];

    // Reset Languages
    Object.keys(this.selectedLanguages).forEach(key => this.selectedLanguages[key] = false);

    // Reset Features
    this.featureFilters = { luggage: false, safety: false, entertainment: false, wifi: false, airbags: false };

    this.calculateDays();
    this.applyFilters();
  }

  getAverageRating(vehicle: Vehicle): number {
    if (!vehicle.reviews || vehicle.reviews.length === 0) return 0;
    const sum = vehicle.reviews.reduce((acc, rev) => acc + rev.rating, 0);
    return sum / vehicle.reviews.length;
  }

  getFlag(langName: string): string {
    const lang = this.languagesList.find(l => l.name === langName);
    return lang ? lang.flag : '🌐';
  }

  // --- CALENDAR LOGIC ---

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

  applyCalendarDates() {
    if (this.tempStart && this.tempEnd) {
      this.startDate = this.tempStart.toISOString().split('T')[0];
      this.endDate = this.tempEnd.toISOString().split('T')[0];
      this.calculateDays();
      this.applyFilters();
      this.closeCalendar();
    } else {
      Swal.fire('Incomplete', 'Please select a valid date range (Start and End date).', 'warning');
    }
  }

  generateCalendar() {
    this.calendarDays = [];
    const year = this.currentCalendarMonth.getFullYear();
    const month = this.currentCalendarMonth.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    // Padding blanks
    for (let i = 0; i < firstDayIndex; i++) {
       this.calendarDays.push({ date: new Date(), day: 0, isPast: true, isBooked: false, isSelectedStart: false, isSelectedEnd: false, isInRange: false, isBlank: true });
    }

    const today = new Date();
    today.setHours(0,0,0,0);

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

       // Hover range logic
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
    const today = new Date();
    const prev = new Date(this.currentCalendarMonth.getFullYear(), this.currentCalendarMonth.getMonth() - 1, 1);
    if (prev.getMonth() >= today.getMonth() || prev.getFullYear() > today.getFullYear()) {
      this.currentCalendarMonth = prev;
      this.generateCalendar();
    }
  }

  onDayHover(d: CalendarDay) {
    if (!d.isBlank && !d.isPast && !d.isBooked && this.tempStart && !this.tempEnd) {
      this.hoveredDate = d.date;
      this.generateCalendar();
    }
  }

  selectDate(d: CalendarDay) {
    if (d.isBlank || d.isPast || d.isBooked) return;

    if (!this.tempStart || (this.tempStart && this.tempEnd)) {
      this.tempStart = d.date;
      this.tempEnd = null;
      this.hoveredDate = null;
    } else if (this.tempStart && !this.tempEnd) {
      if (d.date < this.tempStart) {
        this.tempStart = d.date; // Reset start if clicked before
      } else {
        // Validate no booked dates in between
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
          Swal.fire('Unavailable', 'Your selection includes booked dates. Please try another range.', 'warning');
          this.tempStart = d.date; // reset
        }
      }
    }
    this.generateCalendar();
  }


  // --- BOOKING LOGIC ---

  requestBooking(vehicle: Vehicle) {
    if (this.bookingDays <= 0) {
      Swal.fire('Invalid Selection', 'Please select a valid date range before booking.', 'warning');
      return;
    }

    const dailyTotal = vehicle.standardDailyRate * this.bookingDays;
    const nightTotal = vehicle.driverNightOutFee * this.bookingNights;
    const subtotal = dailyTotal + nightTotal;

    Swal.fire({
      title: 'Booking Request Summary',
      width: '600px',
      html: `
        <div class="text-start">
          <p><strong>Vehicle:</strong> ${vehicle.description}</p>
          <hr>
          
          <h5 class="mb-3 text-secondary">Pricing Breakdown</h5>
          <table class="table table-bordered table-dark text-start">
            <tbody>
              <tr>
                <td>Daily Rental (${vehicle.standardDailyRate} x ${this.bookingDays} Days)</td>
                <td class="text-end text-light">Rs. ${dailyTotal.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Driver Night Fee (${vehicle.driverNightOutFee} x ${this.bookingNights} Nights)</td>
                <td class="text-end text-light">Rs. ${nightTotal.toLocaleString()}</td>
              </tr>
              <tr class="table-active">
                <th><strong>Subtotal (Estimated)</strong></th>
                <th class="text-end text-primary h5 mb-0"><strong>Rs. ${subtotal.toLocaleString()}</strong></th>
              </tr>
            </tbody>
          </table>

          <div class="alert alert-warning mt-3 small">
            <i class="bi bi-exclamation-triangle-fill"></i> <strong>Disclaimer:</strong> This subtotal covers a minimum of ${vehicle.freeKMLimit}km per day. Extra mileage will be charged at Rs. ${vehicle.extraKMRate}/km. Highway tolls and parking fees are not included and must be paid directly to the driver.
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-send me-2"></i> Confirm Booking Request',
      confirmButtonColor: '#0c92f4',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire('Requested!', 'Your booking request has been sent to the provider. Pending confirmation. You can view it in the My Bookings tab.', 'success');
      }
    });
  }
}

