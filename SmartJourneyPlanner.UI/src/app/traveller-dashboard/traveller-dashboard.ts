import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

import { AuthService } from '../services/auth.service';
import { TravellerDashboardService } from '../services/travellerDashboard';
import { WeatherService } from '../services/weather.service';

@Component({
  selector: 'app-traveller-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HttpClientModule
  ],
  templateUrl: './traveller-dashboard.html',
  styleUrls: ['./traveller-dashboard.css']
})
export class TravelerDashboardComponent implements OnInit {

  // =========================
  // USER DATA
  // =========================
  userId: string | null = '';
  userName: string | null = '';

  // =========================
  // TRIPS DATA
  // =========================
  ongoingTripsCount: number = 0;
  upcomingTripsCount: number = 0;
  completedTripsCount: number = 0;

  completedTrips: any[] = [];
  upcomingTrips: any[] = [];
  ongoingTrips: any[] = [];

  visibleOngoingTrips: any[] = [];
  visibleUpcomingTrips: any[] = [];
  visibleCompletedTrips: any[] = [];

  showAllOngoing: boolean = false;
  showAllUpcoming: boolean = false;
  showAllCompleted: boolean = false;

  // =========================
// POPUP CONTROL
// =========================
showOngoingList: boolean = false;
showUpcomingList: boolean = false;
showCompletedList: boolean = false;

showOngoingPopup: boolean = false;
showUpcomingPopup: boolean = false;
showCompletedPopup: boolean = false;

  nextTrip: any = null;

  // =========================
  // WEATHER DATA
  // =========================
  weather: any = null;

  // =========================
  // COUNTDOWN
  // =========================
  daysLeft: number = 0;

  constructor(
    private router: Router,
    private authService: AuthService,
    private dashboardService: TravellerDashboardService,
    private weatherService: WeatherService
  ) {}

  // =========================
  // INIT
  // =========================
  ngOnInit() {

    this.userId = this.authService.getUserId();
    this.userName = this.authService.getUserName();

    if (!this.userId) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadDashboardData();

    // 🔥 auto refresh countdown every hour
    setInterval(() => {
      if (this.nextTrip) {
        this.calculateCountdown(this.nextTrip.startDate);
      }
    }, 3600000);
  }

  // =========================
  // LOAD DASHBOARD DATA
  // =========================
  loadDashboardData() {
  this.dashboardService.getDashboardData()
    .subscribe({
      next: (data) => {
        console.log("Verified Secure API Payload:", data);

        // Map counts cleanly
        this.ongoingTripsCount = data.ongoingCount || 0;
        this.upcomingTripsCount = data.upcomingCount || 0;
        this.completedTripsCount = data.completedCount || 0;

        // 🌟 HIGHLIGHT: Fallback to an empty array if data fields are null/missing
        this.completedTrips = data.completedTrips || [];
        this.upcomingTrips = data.upcomingTrips || [];
        this.ongoingTrips = data.ongoingTrips || [];

        // 🌟 HIGHLIGHT: Safely populate visible subset cards without template runtime crashes
        this.visibleOngoingTrips = this.ongoingTrips.slice(0, 3);
        this.visibleUpcomingTrips = this.upcomingTrips.slice(0, 3);
        this.visibleCompletedTrips = this.completedTrips.slice(0, 3);
        
        this.setNextTrip(this.upcomingTrips);
      },
      error: (err) => {
        console.error('Dashboard loading failed', err);
      }
    });
}


// ==========================================
  // 🌟 HIGHLIGHT: NEW TOGGLE METHOD FOR STAT CARDS
  // ==========================================
  toggleList(category: string) {
    if (category === 'ongoing') {
      this.showOngoingList = !this.showOngoingList;
      this.showUpcomingList = false;
      this.showCompletedList = false;
    } else if (category === 'upcoming') {
      this.showUpcomingList = !this.showUpcomingList;
      this.showOngoingList = false;
      this.showCompletedList = false;
    } else if (category === 'completed') {
      this.showCompletedList = !this.showCompletedList;
      this.showOngoingList = false;
      this.showUpcomingList = false;
    }
  }

  toggleUpcomingTrips() {

  this.showAllUpcoming = !this.showAllUpcoming;

  this.visibleUpcomingTrips = this.showAllUpcoming
    ? this.upcomingTrips
    : this.upcomingTrips.slice(0, 3);
}

toggleCompletedTrips() {

  this.showAllCompleted = !this.showAllCompleted;

  this.visibleCompletedTrips = this.showAllCompleted
    ? this.completedTrips
    : this.completedTrips.slice(0, 3);
}

toggleOngoingTrips() {

  this.showAllOngoing = !this.showAllOngoing;

  this.visibleOngoingTrips = this.showAllOngoing
    ? this.ongoingTrips
    : this.ongoingTrips.slice(0, 3);
}

openUpcomingPopup() {

  this.showUpcomingPopup = true;
}

closeUpcomingPopup() {

  this.showUpcomingPopup = false;
}


openOngoingPopup() {

  this.showOngoingPopup = true;
}

closeOngoingPopup() {

  this.showOngoingPopup = false;
}

openCompletedPopup() {

  this.showCompletedPopup = true;
}

closeCompletedPopup() {

  this.showCompletedPopup = false;
}

  // =========================
  // NEXT TRIP SELECTION
  // =========================
  setNextTrip(upcomingTrips: any[]) {

    this.nextTrip = upcomingTrips
      .sort((a, b) =>
        new Date(a.startDate).getTime() -
        new Date(b.startDate).getTime()
      )[0];

    if (!this.nextTrip) return;

    // =========================
    // COUNTDOWN CALCULATION
    // =========================
    this.calculateCountdown(this.nextTrip.startDate);

    // =========================
    // WEATHER LOAD FLOW
    // =========================
    this.weatherService
      .getCoordinates(this.nextTrip.destination)
      .subscribe({

        next: (res: any) => {

          if (!res || !res.length) return;

          const lat = res[0].lat;
          const lon = res[0].lon;

          const date = this.nextTrip.startDate.split('T')[0];

          this.loadWeather(lat, lon, date);
        },

        error: (err) => {
          console.error('Geo lookup failed', err);
        }
      });
  }

  // =========================
  // COUNTDOWN LOGIC
  // =========================
  calculateCountdown(tripDate: string) {

    const today = new Date();
    const trip = new Date(tripDate);

    const diffTime = trip.getTime() - today.getTime();

    this.daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // =========================
  // WEATHER LOADING
  // =========================
  loadWeather(lat: string, lon: string, date: string) {

    this.weatherService
      .getProcessedWeather(lat, lon, date)
      .subscribe({

        next: (weather: any) => {
          this.weather = weather;
          console.log('Weather Loaded', weather);
        },

        error: (err) => {
          console.error('Weather load failed', err);
        }
      });
  }

  // =========================
  // NAVIGATION
  // =========================
  navigateToWeather() {
    this.router.navigate(['/weather']);
  }

  navigateToMemories() {
    this.router.navigate(['/memories']);
  }

  openTripSummary(tripId: string) {
    if (!tripId) return;

    this.router.navigate(['/trip-summary', tripId]);
  }
}