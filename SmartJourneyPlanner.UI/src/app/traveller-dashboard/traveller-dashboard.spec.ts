import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { of, throwError } from 'rxjs';

import { TravelerDashboardComponent } from './traveller-dashboard';
import { AuthService } from '../services/auth.service';
import { TravellerDashboardService } from '../services/travellerDashboard';
import { WeatherService } from '../services/weather.service';
import { MemoryService } from '../services/memory';

// ---------- GLOBAL MOCKS ----------
const mockSwal = {
  fire: jasmine.createSpy('fire').and.returnValue(
    Promise.resolve({ isConfirmed: true })
  ),
  close: jasmine.createSpy('close'),
  getPopup: jasmine.createSpy('getPopup').and.returnValue({
    style: {}
  })
};

// ---------- SERVICE MOCKS ----------
class MockAuthService {
  getUserId() {
    return 'user-123';
  }
  getUserName() {
    return 'Test Traveller';
  }
}

class MockTravellerDashboardService {
  getDashboardData() {
    return of({
      ongoingCount: 1,
      upcomingCount: 2,
      completedCount: 3,
      memoriesCount: 5,
      ongoingTrips: [
        {
          id: 't1',
          tripName: 'Kandy Escape',
          destination: 'Kandy',
          startDate: '2026-08-20',
          endDate: '2026-08-25',
          role: 'Organizer'
        }
      ],
      upcomingTrips: [
        {
          id: 't2',
          tripName: 'Galle Fort Weekend',
          destination: 'Galle',
          startDate: '2026-09-10',
          endDate: '2026-09-12',
          role: 'Member'
        },
        {
          id: 't3',
          tripName: 'Ella Adventure',
          destination: 'Ella',
          startDate: '2026-10-01',
          endDate: '2026-10-05',
          role: 'Organizer'
        }
      ],
      completedTrips: [
        {
          id: 't4',
          tripName: 'Colombo City Tour',
          destination: 'Colombo',
          startDate: '2026-06-01',
          endDate: '2026-06-03',
          role: 'Member'
        }
      ]
    });
  }

  getCustomerAlerts(userId: string) {
    return of([
      {
        _id: 'alert-1',
        bookingId: 'b-100',
        message: 'Vehicle was declined by admin.',
        vehicleInfo: 'Toyota Prius',
        dismissed: false
      }
    ]);
  }

  dismissAlert(alertId: string) {
    return of(void 0);
  }

  cancelBooking(bookingId: string) {
    return of(void 0);
  }
}

class MockWeatherService {
  getCoordinates(city: string) {
    return of({
      results: [
        {
          name: city,
          country: 'Sri Lanka',
          country_code: 'lk',
          latitude: 6.0535,
          longitude: 80.2210
        }
      ]
    });
  }

  getProcessedWeather(lat: string, lon: string, date: string) {
    return of({
      avgTemp: '28.5',
      humidity: 75,
      windSpeed: '12.0',
      precipitation: '0.5',
      condition: 'Cloudy',
      emoji: '☁️'
    });
  }
}

class MockMemoryService {
  getMemoryCount(userId: string) {
    return of({ count: 7 });
  }
}

describe('TravelerDashboardComponent', () => {
  let component: TravelerDashboardComponent;
  let fixture: ComponentFixture<TravelerDashboardComponent>;
  let authService: AuthService;
  let dashboardService: TravellerDashboardService;
  let weatherService: WeatherService;
  let memoryService: MemoryService;
  let router: Router;

  const mockRouter = {
    navigate: jasmine.createSpy('navigate')
  };

  beforeEach(async () => {
    localStorage.clear();
    (window as any).Swal = mockSwal;

    await TestBed.configureTestingModule({
      imports: [
        TravelerDashboardComponent,
        CommonModule,
        FormsModule,
        RouterModule
      ],
      providers: [
        DatePipe,
        { provide: AuthService, useClass: MockAuthService },
        { provide: TravellerDashboardService, useClass: MockTravellerDashboardService },
        { provide: WeatherService, useClass: MockWeatherService },
        { provide: MemoryService, useClass: MockMemoryService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TravelerDashboardComponent);
    component = fixture.componentInstance;

    authService = TestBed.inject(AuthService);
    dashboardService = TestBed.inject(TravellerDashboardService);
    weatherService = TestBed.inject(WeatherService);
    memoryService = TestBed.inject(MemoryService);
    router = TestBed.inject(Router);

    mockSwal.fire.calls.reset();
    mockRouter.navigate.calls.reset();
  });

  afterEach(() => {
    if ((component as any).countdownInterval) {
      clearInterval((component as any).countdownInterval);
    }
    if ((component as any).alertsInterval) {
      clearInterval((component as any).alertsInterval);
    }
    localStorage.clear();
  });

  // ====================== BASIC ======================
  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  // ====================== ngOnInit ======================
  it('should redirect to login when userId is missing', () => {
    spyOn(authService, 'getUserId').and.returnValue(null);

    fixture.detectChanges();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should load dashboard data and alerts on init when authenticated', fakeAsync(() => {
    spyOn(component, 'loadDashboardData').and.callThrough();
    spyOn(component, 'loadCustomerAlerts').and.callThrough();

    fixture.detectChanges();
    tick();

    expect(component.userId).toBe('user-123');
    expect(component.userName).toBe('Test Traveller');
    expect(component.showOngoingList).toBeTrue();
    expect(component.loadDashboardData).toHaveBeenCalled();
    expect(component.loadCustomerAlerts).toHaveBeenCalled();
  }));

  // ====================== DASHBOARD DATA ======================
  it('should populate trip lists and counts from dashboard service', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.ongoingTripsCount).toBe(1);
    expect(component.upcomingTripsCount).toBe(2);
    expect(component.completedTripsCount).toBe(3);
    expect(component.ongoingTrips.length).toBe(1);
    expect(component.upcomingTrips.length).toBe(2);
    expect(component.completedTrips.length).toBe(1);
    expect(component.visibleOngoingTrips.length).toBe(1);
    expect(component.visibleUpcomingTrips.length).toBe(2);
    expect(component.nextTrip).toBeTruthy();
    expect(component.nextTrip.tripName).toBe('Galle Fort Weekend');
  }));

  it('should show error Swal when dashboard data fails', fakeAsync(() => {
    spyOn(dashboardService, 'getDashboardData').and.returnValue(
      throwError(() => new Error('API down'))
    );

    component.loadDashboardData();
    tick();

    expect(mockSwal.fire).toHaveBeenCalled();
    const callArgs = mockSwal.fire.calls.mostRecent().args[0];
    expect(callArgs.icon).toBe('error');
  }));

  // ====================== MEMORIES COUNT ======================
  it('should load memories count from MemoryService', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.memoriesCount).toBe(7);
  }));

  // ====================== TOGGLE LIST ======================
  it('should toggle visible list category correctly', () => {
    component.toggleList('upcoming');
    expect(component.showUpcomingList).toBeTrue();
    expect(component.showOngoingList).toBeFalse();
    expect(component.showCompletedList).toBeFalse();

    component.toggleList('completed');
    expect(component.showCompletedList).toBeTrue();
    expect(component.showUpcomingList).toBeFalse();
  });

  // ====================== SEARCH / FILTER ======================
  it('should filter trips by search query', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.searchQuery = 'galle';
    component.filterTrips();

    expect(component.visibleUpcomingTrips.length).toBe(1);
    expect(component.visibleUpcomingTrips[0].destination.toLowerCase()).toContain('galle');
    expect(component.visibleOngoingTrips.length).toBe(0);
  }));

  it('should reset visible trips when search query is empty', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.searchQuery = 'something';
    component.filterTrips();

    component.searchQuery = '';
    component.filterTrips();

    expect(component.visibleOngoingTrips.length).toBe(1);
    expect(component.visibleUpcomingTrips.length).toBe(2);
  }));

  // ====================== CUSTOMER ALERTS ======================
  it('should load customer alerts and show popup', fakeAsync(() => {
    spyOn(component, 'showBookingAlertPopup').and.callThrough();

    component.userId = 'user-123';
    component.loadCustomerAlerts();
    tick();

    expect(component.customerAlerts.length).toBeGreaterThan(0);
    expect(component.showAlerts).toBeTrue();
    expect(component.showBookingAlertPopup).toHaveBeenCalled();
  }));

  it('should fall back to localStorage alerts when API fails', fakeAsync(() => {
    const localAlert = {
      id: 'local_1',
      message: 'Local alert',
      dismissed: false
    };
    localStorage.setItem(
      'customer_alerts_user-123',
      JSON.stringify([localAlert])
    );

    spyOn(dashboardService, 'getCustomerAlerts').and.returnValue(
      throwError(() => new Error('API error'))
    );

    component.userId = 'user-123';
    component.loadCustomerAlerts();
    tick();

    expect(component.customerAlerts.length).toBe(1);
    expect(component.customerAlerts[0].message).toBe('Local alert');
  }));

  it('should dismiss an API alert', fakeAsync(() => {
    component.userId = 'user-123';
    component.customerAlerts = [
      { _id: 'alert-1', message: 'Test', dismissed: false }
    ];
    component.showAlerts = true;

    spyOn(dashboardService, 'dismissAlert').and.returnValue(of(void 0));

    component.dismissAlert('alert-1');
    tick();

    expect(component.customerAlerts.length).toBe(0);
    expect(component.showAlerts).toBeFalse();
  }));

  it('should dismiss a local alert', () => {
    component.userId = 'user-123';
    const alert = { id: 'local_99', message: 'Local', dismissed: false };
    localStorage.setItem(
      'customer_alerts_user-123',
      JSON.stringify([alert])
    );
    component.customerAlerts = [alert];
    component.showAlerts = true;

    component.dismissLocalAlert('local_99');

    expect(component.customerAlerts.length).toBe(0);
    expect(component.showAlerts).toBeFalse();
  });

  // ====================== NEXT TRIP & WEATHER ======================
  it('should set nextTrip and calculate countdown', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.nextTrip).toBeTruthy();
    expect(component.daysLeft).toBeGreaterThan(0);
  }));

  it('should load weather for next trip destination', fakeAsync(() => {
    spyOn(weatherService, 'getCoordinates').and.callThrough();
    spyOn(weatherService, 'getProcessedWeather').and.callThrough();

    fixture.detectChanges();
    tick();

    expect(weatherService.getCoordinates).toHaveBeenCalled();
    expect(component.weather).toBeTruthy();
    expect(component.weather.condition).toBe('Cloudy');
  }));

  it('should handle weather coordinate failure gracefully', fakeAsync(() => {
    spyOn(weatherService, 'getCoordinates').and.returnValue(
      throwError(() => new Error('Geo error'))
    );

    component.setNextTrip([
      {
        id: 't99',
        tripName: 'Test',
        destination: 'Unknown',
        startDate: '2026-09-15',
        endDate: '2026-09-17'
      }
    ]);
    tick();

    expect(component.weather).toBeNull();
  }));

  // ====================== NAVIGATION ======================
  it('should navigate to weather page', () => {
    component.navigateToWeather();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/weather']);
  });

  it('should navigate to memories page', () => {
    component.navigateToMemories();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/memories']);
  });

  it('should navigate to trip summary', () => {
    component.openTripSummary('trip-42');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/trip-summary', 'trip-42']);
  });

  it('should not navigate when tripId is empty', () => {
    component.openTripSummary('');
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  // ====================== TRIPS POPUP ======================
  it('should show info Swal when trip list is empty', () => {
    component.ongoingTrips = [];
    component.showTripsPopup('ongoing');

    expect(mockSwal.fire).toHaveBeenCalled();
    const args = mockSwal.fire.calls.mostRecent().args[0];
    expect(args.icon).toBe('info');
  });

  it('should open trips popup with list when data exists', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.showTripsPopup('upcoming');
    expect(mockSwal.fire).toHaveBeenCalled();
  }));

  // ====================== CLEANUP ======================
  it('should clear intervals on destroy', () => {
    fixture.detectChanges();

    const countdownSpy = spyOn(window, 'clearInterval');
    component.ngOnDestroy();

    expect(countdownSpy).toHaveBeenCalled();
  });
});