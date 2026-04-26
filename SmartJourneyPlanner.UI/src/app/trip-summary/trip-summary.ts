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
    private router: Router
  ) {}

  ngOnInit(): void {
    // 1. Get the trip ID from the URL parameters to know which trip's details to fetch
    const tripId = this.route.snapshot.paramMap.get('id');
    const roleFromUrl = this.route.snapshot.queryParamMap.get('role');

    if (roleFromUrl) {
      this.userRole = roleFromUrl;
      console.log('Current User Role:', this.userRole);
    }

    if (tripId) {
      console.log('Fetching data for ID:', tripId);
      
      // 2. All data fetching logic is now in one place, with a fallback to temp data if the database call fails
      this.tripService.getTripById(tripId).subscribe({
        next: (data: any) => {
          this.tripDetails = data;
          console.log('Data received from database:', data);

          // Get data directly from the main object if available, otherwise make a separate call to get history
          if (data.editHistory && data.editHistory.length > 0) {
            this.editHistory = data.editHistory;
            console.log('History loaded from main object:', this.editHistory);
          } else {
            
            this.loadHistory(tripId);
            this.filterSavedPlaces();

          }
        },
        error: (err) => {
          console.error('Data load error:', err);
          this.loadFromTemp(); // Show temp data if there's an error fetching from the database
        }
      });
    } else {
      this.loadFromTemp();
    }
  }

  // Backup function to load edit history if it's not included in the main trip details response
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
    Swal.fire('Error', 'Trip ID not found!', 'error');
  }
}
}