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
  userRole: string = 'owner';

  savedHotels: any[] = [];
  savedRestaurants: any[] = [];

  constructor(
    private tripService: TripService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    /**
     * 1. Extract the Trip ID from the route path parameter (/trip-summary/:id)
     * 2. Extract the User Role from query parameters (/trip-summary/:id?role=viewer)
     */
    const tripId = this.route.snapshot.paramMap.get('id');
    const roleFromUrl = this.route.snapshot.queryParamMap.get('role');

    if (roleFromUrl) {
      this.userRole = roleFromUrl;
      console.log('Current User Role:', this.userRole);
    }

    if (tripId) {
      console.log('Fetching database data for ID:', tripId);
      this.tripService.getTripById(tripId).subscribe({
        next: (data) => {
          this.tripDetails = data;
          console.log('Data received from database:', data);
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

  /**
   * Filters savedPlaces array into hotels and restaurants separately.
   */
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
    this.filterSavedPlaces();
  }
}