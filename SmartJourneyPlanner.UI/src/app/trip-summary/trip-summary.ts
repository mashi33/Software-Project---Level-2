import { Component, OnInit } from '@angular/core';
import { TripService } from '../services/trip.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { WeatherService } from '../services/weather.service';
import { AuthService } from '../services/auth.service';
import Swal from 'sweetalert2';

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
  userRole: string = 'owner';
  tripId: string = '';
  loading = true;

  savedHotels: any[] = [];
  savedRestaurants: any[] = [];
  savedPlacesCount = 0;
  membersCount = 0;
  tripDurationDays = 0;

  summaryWeather: any = null;
  summarySuggestion: any = null;
  loadingWeather = false;
  isLastYearWeather = false;

  constructor(
    private tripService: TripService,
    private route: ActivatedRoute,
    private router: Router,
    private weatherService: WeatherService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const tripIdFromUrl = this.route.snapshot.paramMap.get('id');
    const roleFromUrl = this.route.snapshot.queryParamMap.get('role');

    this.tripId = tripIdFromUrl || '';

    if (roleFromUrl) {
      this.userRole = roleFromUrl.toLowerCase();
    }

    if (this.tripId) {
      this.tripService.getTripById(this.tripId).subscribe({
        next: (data: any) => {
          this.tripDetails = data;
          this.editHistory = data.editHistory || data.EditHistory || [];
          this.determineUserRole();
          this.computeTripMeta();
          this.filterSavedPlaces();
          this.loadTripWeather();
          this.loading = false;
        },
        error: () => {
          this.loadFromTemp();
          this.loading = false;
        }
      });
    } else {
      this.loadFromTemp();
      this.loading = false;
    }
  }

  get tripName(): string {
    return this.tripDetails?.tripName || this.tripDetails?.TripName || 'Trip Summary';
  }

  get destination(): string {
    return this.tripDetails?.destination || this.tripDetails?.Destination || '';
  }

  get departFrom(): string {
    return this.tripDetails?.departFrom || this.tripDetails?.DepartFrom || '';
  }

  get startDate(): string | Date | null {
    return this.tripDetails?.startDate || this.tripDetails?.StartDate || null;
  }

  get endDate(): string | Date | null {
    return this.tripDetails?.endDate || this.tripDetails?.EndDate || null;
  }

  get budget(): string {
    return this.tripDetails?.budgetLimit || this.tripDetails?.BudgetLimit ||
      this.tripDetails?.budget || this.tripDetails?.Budget || 'Not set';
  }

  get description(): string {
    return this.tripDetails?.description || this.tripDetails?.Description || 'No description available.';
  }

  get transportMode(): string {
    return this.tripDetails?.transportMode || this.tripDetails?.TransportMode || '';
  }

  get isEcoTransport(): boolean {
    return ['Cycle', 'Public Transport', 'Walking'].includes(this.transportMode);
  }

  get isOwner(): boolean {
    return this.userRole === 'owner';
  }

  get isViewer(): boolean {
    return this.userRole === 'viewer';
  }

  get canEdit(): boolean {
    return this.userRole === 'owner' || this.userRole === 'editor';
  }

  determineUserRole(): void {
    if (this.route.snapshot.queryParamMap.get('role')) return;

    const userId = this.authService.getUserId();
    const userEmail = this.authService.getUserEmail()?.toLowerCase();
    const createdBy = (this.tripDetails?.createdBy || this.tripDetails?.CreatedBy || '').toLowerCase();

    if (userId && createdBy && (createdBy === userId.toLowerCase() || createdBy === userEmail)) {
      this.userRole = 'owner';
      return;
    }

    const members = this.tripDetails?.members || this.tripDetails?.Members || [];
    const memberMatch = members.find((m: any) =>
      (m.email || m.Email || '').toLowerCase() === userEmail
    );

    if (memberMatch) {
      this.userRole = (memberMatch.role || memberMatch.Role || 'viewer').toLowerCase();
    }
  }

  computeTripMeta(): void {
    const start = this.startDate ? new Date(this.startDate) : null;
    const end = this.endDate ? new Date(this.endDate) : null;

    if (start && end) {
      const diff = end.getTime() - start.getTime();
      this.tripDurationDays = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
    }

    const members = this.tripDetails?.members || this.tripDetails?.Members || [];
    this.membersCount = members.length;

    const places = this.tripDetails?.savedPlaces || this.tripDetails?.SavedPlaces || [];
    this.savedPlacesCount = places.length;
  }

  loadTripWeather() {
    const destination = this.destination;
    const rawDate = this.startDate;

    if (!destination || !rawDate) return;

    let startDateStr = typeof rawDate === 'string'
      ? rawDate.split('T')[0]
      : new Date(rawDate).toISOString().split('T')[0];

    this.isLastYearWeather = false;

    const today = new Date();
    const maxForecastDate = new Date();
    maxForecastDate.setDate(today.getDate() + 14);

    const targetTripDate = new Date(startDateStr);

    if (targetTripDate > maxForecastDate) {
      this.isLastYearWeather = true;
      const lastYear = targetTripDate.getFullYear() - 1;
      const month = String(targetTripDate.getMonth() + 1).padStart(2, '0');
      const day = String(targetTripDate.getDate()).padStart(2, '0');
      startDateStr = `${lastYear}-${month}-${day}`;
    }

    this.loadingWeather = true;

    this.weatherService.getCoordinates(destination).subscribe({
      next: (geoRes) => {
        if (!geoRes?.length) {
          this.loadingWeather = false;
          return;
        }

        const latStr = geoRes[0].lat.toString();
        const lonStr = geoRes[0].lon.toString();

        this.weatherService.getProcessedWeather(latStr, lonStr, startDateStr).subscribe({
          next: (weather) => {
            this.summaryWeather = weather;
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

  navigateToBudget() {
    if (this.tripId) {
      this.router.navigate(['/budget'], { queryParams: { tripId: this.tripId } });
    }
  }

  loadHistory(id: string) {
    this.tripService.getTripHistory(id).subscribe({
      next: (data) => { this.editHistory = data; },
      error: (err) => console.error('History load error:', err)
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
    this.savedPlacesCount = places.length;
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
    this.determineUserRole();
    this.computeTripMeta();
    this.filterSavedPlaces();
    this.loadTripWeather();
  }

  navigateToChat() {
    if (this.tripId) {
      this.router.navigate(['/groupChat'], { queryParams: { tripId: this.tripId } });
    }
  }

  navigateToRouteOptimization() {
    this.router.navigate(['/explore/route-optimization'], {
      queryParams: {
        start: this.departFrom,
        end: this.destination
      }
    });
  }

  navigateToHotels() {
    this.router.navigate(['/explore/hotel-restaurant-finder'], {
      queryParams: { city: this.destination }
    });
  }

  navigateToTimeline() {
    this.router.navigate(['/timeline'], {
      queryParams: { tripId: this.tripId }
    });
  }

  navigateToWeather() {
    this.router.navigate(['/weather']);
  }

  confirmAndSave() {
    Swal.fire({
      icon: 'success',
      title: 'Trip Saved!',
      text: 'Your trip details are confirmed.',
      confirmButtonColor: '#0284c7'
    }).then(() => {
      this.router.navigate(['/traveller-dashboard']);
    });
  }

  deleteTrip() {
    if (!this.tripId) return;

    Swal.fire({
      title: 'Delete this trip?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it'
    }).then(result => {
      if (result.isConfirmed) {
        this.tripService.deleteTrip(this.tripId).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Your trip has been removed.', 'success')
              .then(() => this.router.navigate(['/traveller-dashboard']));
          },
          error: () => Swal.fire('Error', 'Could not delete the trip.', 'error')
        });
      }
    });
  }
}
