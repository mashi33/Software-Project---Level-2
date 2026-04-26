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
  // main details of the trip
  tripDetails: any;
  // array to hold the edit history of the trip, which can be displayed in the UI to show past changes and versions
  editHistory: any[] = [];
  isDropdownOpen = false;
  savedHotels: any[] = [];
  savedRestaurants: any[] = [];
  userRole: string = 'owner';
  tripId: string = '';

  constructor(
    private tripService: TripService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

ngOnInit(): void {
    // 1. URL එකෙන් Trip ID එක සහ User Role එක ගන්න
    const tripId = this.route.snapshot.paramMap.get('id');

    const roleFromUrl = this.route.snapshot.queryParamMap.get('role');
    this.tripId = this.route.snapshot.paramMap.get('id') || '';
    if (roleFromUrl) {
      this.userRole = roleFromUrl;
      console.log('Current User Role:', this.userRole);
    }

    if (tripId) {
      console.log('Fetching data for ID:', tripId);
      
      // get deatails of the trip from database using the ID from URL
      this.tripService.getTripById(tripId).subscribe({
        next: (data: any) => {
          this.tripDetails = data;
          console.log('Data received from database:', data);

          // FIX: Call filterSavedPlaces() after data is loaded
          this.filterSavedPlaces();

          //check if edit history is already included in the main trip data, if not then make a separate call to fetch it. This is to optimize data loading and avoid unnecessary calls if history is already present.
          if (data.editHistory && data.editHistory.length > 0) {
            this.editHistory = data.editHistory;
            console.log('History loaded from main object:', this.editHistory);
          } else {
            // if history is not included in the main trip data, then make a separate call to fetch it. This ensures that we still get the history data even if it's not included in the initial response.
            this.loadHistory(tripId);
          }
        },
        error: (err) => {
          console.error('Data load error:', err);
          this.loadFromTemp(); // If there's an error fetching from the database, load from temporary storage or show sample data. This provides a fallback to ensure the user still sees something instead of a blank page.
        }
      });
    } else {
      this.loadFromTemp();
    }
  }

  // Method to load the edit history of the trip by making a call to the TripService. This is used to populate the edit history section in the UI, allowing users to see past changes and versions of the trip details.
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

  filterSavedPlaces() {
    const places = this.tripDetails?.savedPlaces || this.tripDetails?.SavedPlaces || [];

    console.log('All saved places:', places);

    this.savedHotels = places.filter((p: any) => {
      const cat = (p.category || p.Category || '').toLowerCase();
      return cat.includes('hotel') || cat.includes('lodging');
    });

    this.savedRestaurants = places.filter((p: any) => {
      const cat = (p.category || p.Category || '').toLowerCase();
      return cat.includes('restaurant') || cat.includes('food') || cat.includes('dining');
    });

    console.log('Filtered Hotels:', this.savedHotels);
    console.log('Filtered Restaurants:', this.savedRestaurants);
  }

  loadFromTemp() {
    this.tripDetails = this.tripService.getTempTripData();
    if (!this.tripDetails) {
      console.warn('No data found! Showing sample data.');
      this.tripDetails = {
        tripName: 'Nuwara Eliya Trip',
        destination: 'Nuwara Eliya',
        departFrom: 'Colombo',
        startDate: '2026-05-10',
        endDate: '2026-05-15',
        description: 'Enjoying the cold weather and tea estates.'
      };
    }
    this.filterSavedPlaces();
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