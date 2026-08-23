import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { AuthService } from '../services/auth.service';
import { TravellerDashboardService } from '../services/travellerDashboard';
import { WeatherService } from '../services/weather.service';
import { MemoryService } from '../services/memory';

@Component({
  selector: 'app-traveler-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule
  ],
  templateUrl: './traveller-dashboard.html',
  styleUrls: ['./traveller-dashboard.css'],
  providers: [DatePipe] 
})
export class TravelerDashboardComponent implements OnInit, OnDestroy {

  userId: string | null = '';
  userName: string | null = '';

  ongoingTripsCount = 0;
  upcomingTripsCount = 0;
  completedTripsCount = 0;
  memoriesCount = 0;

  completedTrips: any[] = [];
  upcomingTrips: any[] = [];
  ongoingTrips: any[] = [];

  visibleOngoingTrips: any[] = [];
  visibleUpcomingTrips: any[] = [];
  visibleCompletedTrips: any[] = [];

  showOngoingList = false;
  showUpcomingList = false;
  showCompletedList = false;

  nextTrip: any = null;
  searchQuery = '';
  weather: any = null;
  daysLeft = 0;

  // Alert notifications variables
  customerAlerts: any[] = [];
  showAlerts = false;
  
  private countdownInterval: any;
  private alertsInterval: any;

  constructor(
    private router: Router,
    private authService: AuthService,
    private dashboardService: TravellerDashboardService,
    private weatherService: WeatherService,
    private datePipe: DatePipe,
    private memoryService: MemoryService
  ) {}

  ngOnInit() {
    this.userId = this.authService.getUserId();
    this.userName = this.authService.getUserName();

    if (!this.userId) {
      this.router.navigate(['/login']);
      return;
    }

    this.showOngoingList = true;
    this.loadDashboardData();

    // Load booking/vehicle restriction alerts and poll every 30 seconds
    this.loadCustomerAlerts();
    this.alertsInterval = setInterval(() => {
      this.loadCustomerAlerts();
    }, 30000);

    this.countdownInterval = setInterval(() => {
      if (this.nextTrip) {
        this.calculateCountdown(this.nextTrip.startDate);
      }
    }, 3600000);
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    if (this.alertsInterval) {
      clearInterval(this.alertsInterval);
    }
  }

  // --- CUSTOMER ALERT SYSTEM FOR VEHICLE REJECTIONS / SERVICE PERIODS ---

  loadCustomerAlerts() {
    if (!this.userId) return;
    
    // Try to load customer alerts from backend API
    this.dashboardService.getCustomerAlerts(this.userId).subscribe({
      next: (alerts) => {
        this.customerAlerts = alerts || [];
        
        // Merge with any local storage fallback alerts
        const localAlerts = this.getLocalAlerts();
        this.customerAlerts = [...this.customerAlerts, ...localAlerts];
        
        // Filter out already dismissed alerts
        this.customerAlerts = this.customerAlerts.filter(a => !a.dismissed);
        this.showAlerts = this.customerAlerts.length > 0;
        
        if (this.customerAlerts.length > 0) {
          this.showBookingAlertPopup();
        }
      },
      error: (err) => {
        console.error('Error loading customer alerts from API, fallback to localStorage:', err);
        const localAlerts = this.getLocalAlerts();
        this.customerAlerts = localAlerts.filter(a => !a.dismissed);
        this.showAlerts = this.customerAlerts.length > 0;
        
        if (this.customerAlerts.length > 0) {
          this.showBookingAlertPopup();
        }
      }
    });
  }

  getLocalAlerts(): any[] {
    try {
      const alertsKey = `customer_alerts_${this.userId}`;
      return JSON.parse(localStorage.getItem(alertsKey) || '[]');
    } catch (err) {
      console.error('Error reading local alerts:', err);
      return [];
    }
  }

  showBookingAlertPopup() {
    const latestAlert = this.customerAlerts[0];
    const bookingId = latestAlert.bookingId || latestAlert.bookingId;

    Swal.fire({
      title: '🚨 Vehicle Service / Booking Notice',
      width: '580px',
      padding: '2em',
      html: `
        <div style="font-family: inherit; text-align: left; color: #1e293b;">
          <div style="background: #fef2f2; border-left: 5px solid #ef4444; padding: 14px; border-radius: 8px; margin-bottom: 16px;">
            <strong style="color: #b91c1c; font-size: 15px; display: block; margin-bottom: 4px;">Attention Required</strong>
            <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.5;">
              ${latestAlert.message || 'The vehicle you booked has been declined by the admin. Please choose a new vehicle.'}
            </p>
          </div>
          <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #64748b;">
            <div><strong>Vehicle:</strong> ${latestAlert.vehicleInfo || latestAlert.vehicleName || 'Selected Transport'}</div>
            <div style="margin-top: 4px;"><strong>Action:</strong> Click below to find a new vehicle.</div>
          </div>
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: 'Find New Vehicle', 
      confirmButtonColor: '#ef4444',
      showCancelButton: false, 
      allowOutsideClick: false
    }).then((result) => {
      if (result.isConfirmed) {
        if (bookingId) {
          this.dashboardService.cancelBooking(bookingId).subscribe({
            next: () => {
              console.log('Booking cancelled successfully:', bookingId);
              this.dismissAlert(latestAlert._id || latestAlert.id);
              this.router.navigate(['/transport']);
            },
            error: (err) => {
              console.error('Failed to cancel booking:', err);
              this.dismissAlert(latestAlert._id || latestAlert.id);
              this.router.navigate(['/transport']);
            }
          });
        } else {
          this.dismissAlert(latestAlert._id || latestAlert.id);
          this.router.navigate(['/transport']);
        }
      }
    });
  }

  dismissAlert(alertId: string) {
    if (!alertId) return;

    if (alertId.startsWith('local_')) {
      this.dismissLocalAlert(alertId);
    } else {
      this.dashboardService.dismissAlert(alertId).subscribe({
        next: () => {
          this.customerAlerts = this.customerAlerts.filter(a => (a._id || a.id) !== alertId);
          this.showAlerts = this.customerAlerts.length > 0;
        },
        error: (err) => {
          console.error('Error dismissing alert via API:', err);
          this.dismissLocalAlert(alertId);
        }
      });
    }
  }

  dismissLocalAlert(alertId: string) {
    try {
      const alertsKey = `customer_alerts_${this.userId}`;
      const alerts = JSON.parse(localStorage.getItem(alertsKey) || '[]');
      const updatedAlerts = alerts.map((a: any) => {
        if ((a._id || a.id) === alertId) {
          return { ...a, dismissed: true };
        }
        return a;
      });
      localStorage.setItem(alertsKey, JSON.stringify(updatedAlerts));
      
      this.customerAlerts = this.customerAlerts.filter(a => (a._id || a.id) !== alertId);
      this.showAlerts = this.customerAlerts.length > 0;
    } catch (err) {
      console.error('Error dismissing local alert:', err);
    }
  }

    loadDashboardData() {
    this.dashboardService.getDashboardData()
      .subscribe({
        next: (data) => {
          this.ongoingTripsCount = data.ongoingCount || 0;
          this.upcomingTripsCount = data.upcomingCount || 0;
          this.completedTripsCount = data.completedCount || 0;
          this.memoriesCount = data.memoriesCount || 0;

          this.completedTrips = data.completedTrips || [];
          this.upcomingTrips = data.upcomingTrips || [];
          this.ongoingTrips = data.ongoingTrips || [];

          this.visibleOngoingTrips = this.ongoingTrips.slice(0, 2);
          this.visibleUpcomingTrips = this.upcomingTrips.slice(0, 2);
          this.visibleCompletedTrips = this.completedTrips.slice(0, 2);

          this.setNextTrip(this.upcomingTrips);
          this.loadMemoriesCount();
        },
        error: (err) => {
          console.error('Dashboard error:', err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load dashboard data. Please try again.',
            confirmButtonColor: '#3b82f6'
          });
        }
      });
  }

  loadMemoriesCount() {
    if (!this.userId) return;

    this.memoryService.getMemoryCount(this.userId).subscribe({
      next: (res: any) => {
        this.memoriesCount = res?.count || 0;
      },
      error: (err) => {
        console.error('Failed to load memory count:', err);
      }
    });
  }

  toggleList(category: string) {
    this.showOngoingList = category === 'ongoing';
    this.showUpcomingList = category === 'upcoming';
    this.showCompletedList = category === 'completed';
  }

  filterTrips(): void {
    const query = this.searchQuery.toLowerCase().trim();

    if (!query) {
      this.visibleOngoingTrips = this.ongoingTrips.slice(0, 2);
      this.visibleUpcomingTrips = this.upcomingTrips.slice(0, 2);
      this.visibleCompletedTrips = this.completedTrips.slice(0, 2);
      return;
    }

    const matchesQuery = (trip: any) =>
    trip.tripName?.toLowerCase().includes(query) ||
    trip.destination?.toLowerCase().includes(query) ||
    trip.role?.toLowerCase().includes(query) ||          // member role
    trip.memberRole?.toLowerCase().includes(query);     // alternative property name (if used)

  this.visibleOngoingTrips = this.ongoingTrips
    .filter(matchesQuery)
    .slice(0, 2);

  this.visibleUpcomingTrips = this.upcomingTrips
    .filter(matchesQuery)
    .slice(0, 2);

  this.visibleCompletedTrips = this.completedTrips
    .filter(matchesQuery)
    .slice(0, 2);
}

  showTripsPopup(type: 'ongoing' | 'upcoming' | 'completed'): void {
    let title = '';
    let tripsList: any[] = [];
    let accentColor = '#3b82f6'; 
    let bgGradient = 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)';
    let iconHtml = '<i class="fas fa-plane"></i>';
    let badgeText = '';

    if (type === 'ongoing') {
      title = 'Ongoing Journeys';
      tripsList = this.ongoingTrips;
      accentColor = '#3b82f6';
      bgGradient = 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)';
      iconHtml = '<i class="fas fa-plane-departure"></i>';
      badgeText = 'Active Now';
    } else if (type === 'upcoming') {
      title = 'Upcoming Adventures';
      tripsList = this.upcomingTrips;
      accentColor = '#10b981'; 
      bgGradient = 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)';
      iconHtml = '<i class="fas fa-compass"></i>';
      badgeText = 'Planned';
    } else if (type === 'completed') {
      title = 'Past Memories';
      tripsList = this.completedTrips;
      accentColor = '#6366f1'; 
      bgGradient = 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)';
      iconHtml = '<i class="fas fa-award"></i>';
      badgeText = 'Completed';
    }

    if (!tripsList || tripsList.length === 0) {
      Swal.fire({
        title: title,
        text: `Your ${type} trip list is currently empty.`,
        icon: 'info',
        confirmButtonColor: accentColor
      });
      return;
    }

    let containerHtml = `<div class="premium-swal-container" style="max-height: 420px; overflow-y: auto; padding: 10px 5px; scrollbar-width: thin;">`;

        tripsList.forEach(trip => {
      const startDayName = this.datePipe.transform(trip.startDate, 'EEEE');
      const startDateFormatted = this.datePipe.transform(trip.startDate, 'MMM d, yyyy');
      const endDateFormatted = this.datePipe.transform(trip.endDate, 'MMM d, yyyy');
      const roleLabel = trip.role || trip.Role || '';

      containerHtml += `
        <div class="premium-trip-card" data-id="${trip.id || trip.Id}"
             style="display: flex; align-items: center; justify-content: space-between;
                    background: #ffffff; border: 1px solid #e2e8f0; border-left: 5px solid ${accentColor};
                    padding: 16px; margin-bottom: 14px; border-radius: 16px; cursor: pointer;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
                    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;"
             onmouseenter="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 10px 15px -3px rgba(0,0,0,0.1)'; this.style.background='#f8fafc';"
             onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.05)'; this.style.background='#ffffff';">
         
          <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
            <div style="background: ${bgGradient}; color: ${accentColor}; width: 46px; height: 46px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
              ${iconHtml}
            </div>
           
            <div style="text-align: left; flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px; flex-wrap: wrap;">
                <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${trip.tripName}</h4>
                <span style="background: ${accentColor}15; color: ${accentColor}; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; flex-shrink: 0;">${badgeText}</span>
                ${roleLabel ? `<span style="background: #e2e8f0; color: #334155; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; flex-shrink: 0;">${roleLabel}</span>` : ''}
              </div>
             
              <p style="margin: 0; font-size: 13px; color: #475569; font-weight: 500; display: flex; align-items: center; gap: 4px;">
                <i class="fas fa-map-marker-alt" style="color: #94a3b8;"></i> ${trip.destination}
              </p>
             
              <span style="font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 5px; margin-top: 6px; font-weight: 400;">
                <i class="far fa-calendar-alt" style="color: #94a3b8;"></i>
                <span>${startDateFormatted}</span>
                <span style="color: #cbd5e1;">➔</span>
                <span>${endDateFormatted}</span>
              </span>
            </div>
          </div>

          <div style="padding-left: 12px; flex-shrink: 0; text-align: right;">
            <div style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 10px; padding: 6px 12px; text-align: center; min-width: 85px;">
              <span style="font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: 700; display: block; letter-spacing: 0.5px; margin-bottom: 1px;">Starts On</span>
              <span style="font-size: 13px; color: #1e293b; font-weight: 700; display: block;">${startDayName}</span>
            </div>
          </div>

        </div>
      `;
    });

    containerHtml += `</div>`;

    Swal.fire({
      title: `<div style="text-align: left; padding-left: 5px; font-size: 22px; font-weight: 800; color: #0f172a; font-family: system-ui;">${title}</div>`,
      html: containerHtml,
      showCloseButton: true,
      showConfirmButton: false, 
      width: '560px', 
      background: '#ffffff',
      customClass: {
        popup: 'premium-modern-popup'
      },
      didOpen: () => {
        const popup = Swal.getPopup();
        if (popup) {
          popup.style.borderRadius = '24px';
        }

        const cards = document.querySelectorAll('.premium-trip-card');
        cards.forEach(card => {
          card.addEventListener('click', () => {
            const id = card.getAttribute('data-id');
            if (id) {
              Swal.close();
              this.openTripSummary(id);
            }
          });
        });
      }
    });
  }

  setNextTrip(upcomingTrips: any[]) {
    this.nextTrip = [...upcomingTrips]
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];

    if (!this.nextTrip) return;

    this.calculateCountdown(this.nextTrip.startDate);

    let startDateStr = this.nextTrip.startDate.split('T')[0];

    const today = new Date();
    const maxForecastDate = new Date();
    maxForecastDate.setDate(today.getDate() + 16); 

    const targetTripDate = new Date(startDateStr);

    // set last year weather if date is after more than 16 days
    if (targetTripDate > maxForecastDate) {
      const lastYear = targetTripDate.getFullYear() - 1;
      const month = String(targetTripDate.getMonth() + 1).padStart(2, '0');
      const day = String(targetTripDate.getDate()).padStart(2, '0');
      startDateStr = `${lastYear}-${month}-${day}`;

    }

    this.weatherService
      .getCoordinates(this.nextTrip.destination)
      .subscribe({
        next: (res: any) => {
          if (!res || !res.results || !res.results.length) {
            this.weather = null;
            return;
          }
          // Filter for Sri Lanka cities only 
          const sriLankaResults = res.results.filter((r: any) => {
            const country = (r.country || '').toLowerCase();
            const countryCode = (r.country_code || '').toLowerCase();
            return country === 'sri lanka' || countryCode === 'lk';
          });

          if (sriLankaResults.length === 0) {
            this.weather = null;
            return;
          }

          const lat = sriLankaResults[0].latitude;
          const lon = sriLankaResults[0].longitude;
          this.loadWeather(lat, lon, startDateStr);
        },
        error: () => {
          this.weather = null;
        }
      });
  }

  calculateCountdown(tripDate: string) {
    const today = new Date();
    const trip = new Date(tripDate);
    const diffTime = trip.getTime() - today.getTime();
    this.daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  loadWeather(lat: string, lon: string, date: string) {
    this.weatherService
      .getProcessedWeather(lat, lon, date)
      .subscribe({
        next: (weather: any) => {
          this.weather = weather;
        },
        error: (err) => {
        console.error('Weather API Error Details:', err); 
        Swal.fire({
            icon: 'error',
            title: 'Weather Error',
            text: 'Failed to load weather information.',
            confirmButtonColor: '#3b82f6'
          });
        }
      });
  }

  navigateToWeather() { this.router.navigate(['/weather']); }
  navigateToMemories() { this.router.navigate(['/memories']); }

  openTripSummary(tripId: string) {
    if (!tripId) return;
    this.router.navigate(['/trip-summary', tripId]);
  }
}