import { Component, OnInit } from '@angular/core';
import { TripService } from '../services/trip.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute,Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-trip-summary',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './trip-summary.html',
  styleUrls: ['./trip-summary.css']
})

export class TripSummaryComponent implements OnInit {
  // To hold the trip details fetched from the database or temporary storage
  tripDetails: any;
  editHistory: any[] = [];
  isDropdownOpen = false;

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }
  // To store the current user's role (e.g., 'owner' or 'viewer')
  userRole: string = 'owner'; 
 

  tripId: string = '';
  // Filtered lists separated from savedPlaces array
  savedHotels: any[] = [];
  savedRestaurants: any[] = [];

  constructor(
    private tripService: TripService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {

    this.tripId = this.route.snapshot.paramMap.get('id') || '';
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
          this.loadHistory(tripId);
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
  loadHistory(id: string) {
    this.tripService.getTripHistory(id).subscribe({
      next: (data) => {
        this.editHistory = data;
        console.log('Edit history loaded:', this.editHistory);
      },
      error: (err) => {
        console.error('History load error:', err);
      }
    });
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

  navigateToChat() {
  if (this.tripId) {
    this.router.navigate(['/groupChat'], { queryParams: { tripId: this.tripId } });
  } else {
    Swal.fire('Error', 'Trip ID not found!', 'error');
  }
}
}