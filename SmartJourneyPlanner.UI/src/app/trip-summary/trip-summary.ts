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
  tripDetails: any;
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
    const tripIdFromUrl = this.route.snapshot.paramMap.get('id');
    const roleFromUrl = this.route.snapshot.queryParamMap.get('role');
    
    this.tripId = tripIdFromUrl || '';
    
    if (roleFromUrl) {
      this.userRole = roleFromUrl;
    }

    if (this.tripId) {
      this.tripService.getTripById(this.tripId).subscribe({
        next: (data: any) => {
          this.tripDetails = data;
          if (data.editHistory && data.editHistory.length > 0) {
            this.editHistory = data.editHistory;
          } else {
            this.loadHistory(this.tripId);
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
}