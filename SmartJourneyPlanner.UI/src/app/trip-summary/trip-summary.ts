import { Component, OnInit } from '@angular/core';
import { TripService } from '../services/trip.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { WeatherService } from '../services/weather.service';

@Component({
  selector: 'app-trip-summary',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './trip-summary.html',
  styleUrls: ['./trip-summary.css']
})
export class TripSummaryComponent implements OnInit {
  // variable to hold the trip details fetched from the backend or temp storage
  tripDetails: any;
  // variable to hold the edit history
  editHistory: any[] = [];
  isDropdownOpen = false;
  userRole: string = 'owner'; 

  tripId: string = '';
  // Filtered lists separated from savedPlaces array
  savedHotels: any[] = [];
  savedRestaurants: any[] = [];
  

  // =========================
// SUMMARY PAGE WEATHER
// =========================

summaryWeather: any = null;

summarySuggestion: any = null;

forecastDays: any[] = [];

loadingWeather = false;
isLastYearWeather: boolean = false;

  constructor(
    private tripService: TripService,
    private route: ActivatedRoute,
    private router: Router,
    private weatherService: WeatherService
  ) {}

  ngOnInit(): void {
    // 1. Get the trip ID from the URL parameters to know which trip's details to fetch
     //this.tripId = this.route.snapshot.paramMap.get('id') || '';
    //const roleFromUrl = this.route.snapshot.queryParamMap.get('role');
    
    const tripIdFromUrl = this.route.snapshot.paramMap.get('id');
    const roleFromUrl = this.route.snapshot.queryParamMap.get('role');
    
    this.tripId = tripIdFromUrl || '';
    
    if (roleFromUrl) {
      this.userRole = roleFromUrl;
    }

    if (this.tripId) {
      console.log('Fetching data for ID:', this.tripId);

      this.tripService.getTripById(this.tripId).subscribe({
        next: (data: any) => {
          this.tripDetails = data;
          console.log('Data received from database:', data);

          // Call filterSavedPlaces() after data is loaded
          this.filterSavedPlaces();

          this.loadTripWeather();

          //check if edit history is already included in the main trip data, if not then make a separate call to fetch it. This is to optimize data loading and avoid unnecessary calls if history is already present.
          this.tripDetails = data;
          if (data.editHistory && data.editHistory.length > 0) {
            this.editHistory = data.editHistory;
          } else {
            this.loadHistory(this.tripId);
          }
        },
        error: (err) => {
          console.error('Data load error:', err);
          this.loadFromTemp();
        }
      });
    } else {
      // Fallback if no tripId is present in URL
      this.loadFromTemp();
    }
  }

// =========================
  // LOAD TRIP WEATHER
  // =========================
 loadTripWeather() {
  const destination = this.tripDetails?.Destination || this.tripDetails?.destination;
  const rawDate = this.tripDetails?.StartDate || this.tripDetails?.startDate;

  if (!destination || !rawDate) {
    return;
  }

  // 1. Clean the incoming date format safely
  let startDateStr = typeof rawDate === 'string' ? rawDate.split('T')[0] : new Date(rawDate).toISOString().split('T')[0];

  // Reset the fallback tracker flag on execution
  this.isLastYearWeather = false;

  // 2. Calculate thresholds to detect deep-future timelines
  const today = new Date();
  const maxForecastDate = new Date();
  maxForecastDate.setDate(today.getDate() + 14); // Open-Meteo's absolute maximum limit

  const targetTripDate = new Date(startDateStr);

  // === HIGHLIGHTED LOGIC: SHIFT TIMELINE IF OUTSIDE FORECAST WINDOW ===
  if (targetTripDate > maxForecastDate) {
    this.isLastYearWeather = true;
    
    // Subtract exactly 1 year from the target trip date
    const lastYear = targetTripDate.getFullYear() - 1;
    const month = String(targetTripDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetTripDate.getDate()).padStart(2, '0');
    
    startDateStr = `${lastYear}-${month}-${day}`; // Changes target route request parameter string
  }

  this.loadingWeather = true;

  // 3. Acquire location details
  this.weatherService.getCoordinates(destination).subscribe({
    next: (geoRes) => {
      if (!geoRes?.length) {
        this.loadingWeather = false;
        return;
      }

      const latStr = geoRes[0].lat.toString();
      const lonStr = geoRes[0].lon.toString();

      // 4. Fetch the weather data matrix
      this.weatherService.getProcessedWeather(latStr, lonStr, startDateStr).subscribe({
        next: (weather) => {
          this.summaryWeather = weather;

          if (this.buildForecastCards) {
            this.buildForecastCards(weather);
          }

          // 5. Fetch recommendations using the calculated weather metrics
          this.weatherService.getSuggestions(
            Number(weather.avgTemp),
            weather.condition,
            startDateStr
          ).subscribe({
            next: (suggestion) => {
              this.summarySuggestion = suggestion;
              this.loadingWeather = false;
            },
            error: () => { this.loadingWeather = false; }
          });
        },
        error: () => { this.loadingWeather = false; }
      });
    },
    error: () => { this.loadingWeather = false; }
  });
}

  buildForecastCards(weather: any) {
    const baseTemp = Math.round(Number(weather.avgTemp || 28));
    this.forecastDays = [
      { day: 'Sat', icon: 'bi bi-cloud-sun-fill text-warning', temp: `${baseTemp}°C` },
      { day: 'Sun', icon: 'bi bi-cloud text-secondary', temp: `${baseTemp + 1}°C` },
      { day: 'Mon', icon: 'bi bi-cloud-drizzle text-primary', temp: `${baseTemp - 1}°C` },
      { day: 'Tue', icon: 'bi bi-brightness-high-fill text-warning', temp: `${baseTemp + 2}°C` },
      { day: 'Wed', icon: 'bi bi-cloud-fill text-secondary', temp: `${baseTemp}°C` }
    ];
  }

  // Links to Budget Dashboard
  navigateToBudget() {
    if (this.tripId) {
      this.router.navigate(['/budget'], { 
        queryParams: { tripId: this.tripId } 
      });
    } else {
      alert('Trip ID not found!');
    }
  }

  loadHistory(id: string) {
    this.tripService.getTripHistory(id).subscribe({
      next: (data) => {
        this.editHistory = data;
        console.log('Edit history loaded manually:', this.editHistory);
      },
      error: (err) => {
        console.error('History load error:', err);
      }
    });
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  filterSavedPlaces() {
    const places = this.tripDetails?.savedPlaces || this.tripDetails?.SavedPlaces || [];
    this.savedHotels = places.filter((p: any) => {
      const cat = (p.category || p.Category || '').toLowerCase();
      return cat.includes('hotel') || cat.includes('lodging');
    });
    this.savedRestaurants = places.filter((p: any) => {
      const cat = (p.category || p.Category || '').toLowerCase();
      return cat.includes('restaurant') || cat.includes('food');
    });
  }

  loadFromTemp() {
    this.tripDetails = this.tripService.getTempTripData();
    if (!this.tripDetails) {
      this.tripDetails = {
        tripName: 'Trip Summary',
        destination: 'Destination',
        departFrom: 'Origin',
        startDate: new Date(),
        endDate: new Date(),
        description: 'No description available.'
      };
    }
    this.filterSavedPlaces();

    this.loadTripWeather();
  }


 
  navigateToChat() {
    if (this.tripId) {
      this.router.navigate(['/groupChat'], { queryParams: { tripId: this.tripId } });
    } else {
      alert('Trip ID not found!');
    }
  }

  navigateToRouteOptimization() {
    this.router.navigate(['/explore/route-optimization'], {
      queryParams: {
        start: this.tripDetails?.departFrom, 
        end: this.tripDetails?.destination   
      }
    });
  }

  navigateToHotels() {
    this.router.navigate(['/explore/hotel-restaurant-finder'], { 
      queryParams: { 
        city: this.tripDetails?.destination 
      } 
    });
  }

  navigateToWeather() {
    this.router.navigate(['/weather']);
  }
}