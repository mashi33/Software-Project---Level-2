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
  // To hold the trip details fetched from the database or temporary storage
  tripDetails: any;
  editHistory: any[] = [];
  isDropdownOpen = false;

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }
  // To store the current user's role (e.g., 'owner' or 'viewer')
  userRole: string = 'owner'; 

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
          this.loadHistory(tripId);
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
  }
}