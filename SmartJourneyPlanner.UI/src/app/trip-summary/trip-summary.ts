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
    const tripIdFromUrl = this.route.snapshot.paramMap.get('id');
    const roleFromUrl = this.route.snapshot.queryParamMap.get('role');
    
    // FIXED: Correctly mapping the variable extracted from route parameters
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