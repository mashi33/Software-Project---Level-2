import { Component, OnInit } from '@angular/core';
import { TripService } from '../services/trip.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';

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
  

  constructor(
    private tripService: TripService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // 1. Get the trip ID from the URL parameters to know which trip's details to fetch
    const tripId = this.route.snapshot.paramMap.get('id');

    const roleFromUrl = this.route.snapshot.queryParamMap.get('role');
    
    
    
    if (roleFromUrl) {
      this.userRole = roleFromUrl;
    }

    if (tripId) {
      console.log('Fetching data for ID:', tripId);
      
      // 2. All data fetching logic is now in one place, with a fallback to temp data if the database call fails
      this.tripService.getTripById(tripId).subscribe({
        next: (data: any) => {
      this.tripDetails = data;
          console.log('Data received from database:', data);

          // FIX: Call filterSavedPlaces() after data is loaded
          this.filterSavedPlaces();

          //check if edit history is already included in the main trip data, if not then make a separate call to fetch it. This is to optimize data loading and avoid unnecessary calls if history is already present.
          if (data.editHistory && data.editHistory.length > 0) {
            this.editHistory = data.editHistory;
          } else {
            
            this.loadHistory(tripId);
            this.filterSavedPlaces();

          }
          this.filterSavedPlaces();
        },
        error: (err) => {
          console.error('Data load error:', err);
          this.loadFromTemp();
        }
      });
    } else {
      this.loadFromTemp();
    }
  }

  // ✅ The Bridge Function: Links to your Budget Dashboard
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
      next: (data) => { this.editHistory = data; },
      error: (err) => { console.error('History load error:', err); }
    });
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  /**
   * Sample data to show when there's no data in the database or when there's an error fetching data.
   * This helps in testing the UI and also provides a fallback for users.
   * Filters savedPlaces array into hotels and restaurants separately.
   */
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
  }

  navigateToChat() {
    if (this.tripId) {
      this.router.navigate(['/groupChat'], { queryParams: { tripId: this.tripId } });
    }
  }

  navigateToRouteOptimization() {
  this.router.navigate(['/explore/route-optimization'], {
    //Autofill on route optimization page using query parameters to pass 
    // the departure and destination locations from the current trip details. 
    queryParams: {
      start: this.tripDetails.departFrom, 
      end: this.tripDetails.destination   
    }
  });
}

navigateToHotels() {
  this.router.navigate(['/explore/hotel-restaurant-finder'], { 
    // Autofill on hotel finder page using query parameters
    //  to pass the destination location from the current trip details.
    queryParams: { 
      city: this.tripDetails.destination 
    } 
  });
}
}