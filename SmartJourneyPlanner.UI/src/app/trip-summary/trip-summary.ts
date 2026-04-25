import { Component, OnInit } from '@angular/core';
import { TripService } from '../services/trip.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-trip-summary',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './trip-summary.html',
  styleUrls: ['./trip-summary.css']
})
export class TripSummaryComponent implements OnInit {
  tripDetails: any;

  // Filtered lists separated from savedPlaces array
  savedHotels: any[] = [];
  savedRestaurants: any[] = [];

  // To store the current user's role (e.g., 'owner' or 'viewer')
  userRole: string = 'owner';

  constructor(
    private tripService: TripService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    /**
     * 1. Extract the Trip ID from the route path parameter (/tripsummary/:id)
     * 2. Extract the User Role from query parameters (/tripsummary/:id?role=viewer)
     */
    const tripId = this.route.snapshot.paramMap.get('id');
    const roleFromUrl = this.route.snapshot.queryParamMap.get('role');

    // Set userRole if provided in URL, otherwise defaults to 'owner'
    if (roleFromUrl) {
      this.userRole = roleFromUrl;
      console.log('Current User Role:', this.userRole);
    }

    if (tripId) {
      console.log('Fetching database data for ID:', tripId);
      // Fetch the latest trip data from the database using the service
      this.tripService.getTripById(tripId).subscribe({
        next: (data) => {
          this.tripDetails = data;
          console.log('Data received from database:', data);
          // Filter savedPlaces into hotels and restaurants after data loads
          this.filterSavedPlaces();
        },
        error: (err) => {
          console.error('Data load error:', err);
          // Fallback to temporary storage if database fetch fails
          this.loadFromTemp();
        }
      });
    } else {
      // If no ID is present in the URL, try loading from temporary storage
      this.loadFromTemp();
    }
  }

  /**
   * Filters savedPlaces array into hotels and restaurants separately.
   * Database saves category as lowercase string: 'hotel' or 'restaurant'
   */
  filterSavedPlaces() {
    // Support both camelCase (Angular JSON) and PascalCase (C# serialized) field names
    const places = this.tripDetails?.savedPlaces || this.tripDetails?.SavedPlaces || [];

    console.log('All saved places:', places);

    // Hotels: category is 'hotel' or 'lodging' (Google Places API uses both)
    this.savedHotels = places.filter((p: any) => {
      const cat = (p.category || p.Category || '').toLowerCase();
      return cat.includes('hotel') || cat.includes('lodging');
    });

    // Restaurants: category is 'restaurant' or 'food' or 'dining'
    this.savedRestaurants = places.filter((p: any) => {
      const cat = (p.category || p.Category || '').toLowerCase();
      return cat.includes('restaurant') || cat.includes('food') || cat.includes('dining');
    });

    console.log('Filtered Hotels:', this.savedHotels);
    console.log('Filtered Restaurants:', this.savedRestaurants);
  }

  /**
   * Loads trip data from the temporary service storage or shows sample data
   */
  loadFromTemp() {
    this.tripDetails = this.tripService.getTempTripData();
    if (!this.tripDetails) {
      console.warn('No data found in temp storage! Showing sample data.');
      this.tripDetails = {
        destination: 'Nuwara Eliya',
        departFrom: 'Colombo',
        startDate: '2026-05-10',
        endDate: '2026-05-15',
        description: 'Sample data description (Fallback)'
      };
    }
    // Filter savedPlaces after loading from temp storage too
    this.filterSavedPlaces();
  }
}