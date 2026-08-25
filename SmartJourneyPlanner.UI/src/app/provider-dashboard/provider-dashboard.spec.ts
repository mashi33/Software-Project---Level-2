import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ProviderDashboardComponent } from './provider-dashboard'; // adjust path if needed
import { VehicleService } from '../services/providerDashboard';
import { TransportBookingService } from '../services/transport-booking.service';
import { AuthService } from '../services/auth.service';
import { TransportVehicleService } from '../services/transport-vehicle.service';
import { Booking } from '../models/transport.model';

// ---------- MOCKS ----------
const mockSwal = {
  fire: jasmine.createSpy('fire').and.returnValue(Promise.resolve({ isConfirmed: true }))
};

class MockVehicleService {
  getFullDashboard() {
    return of({
      stats: {
        totalVehicles: 2,
        totalBookings: 3,
        rating: 4.5,
        totalRevenue: 15000,
        acceptedVehicles: 1,
        pendingVehicles: 1,
        pendingBookings: 1,
        acceptedBookings: 1,
        completedBookings: 1,
        rejectedBookings: 0,
        canceledBookings: 0,
        pendingComplete: 0
      },
      vehicles: [
        {
          id: 'v1',
          _id: 'v1',
          ModelName: 'Toyota Prius',
          modelName: 'Toyota Prius',
          VehicleClass: 'Sedan',
          YearOfManufacture: 2022,
          isAvailableForBooking: true,
          IsAvailableForBooking: true,
          adminVerificationStatus: 'Approved',
          Reviews: [{ rating: 5 }, { rating: 4 }]
        },
        {
          id: 'v2',
          _id: 'v2',
          ModelName: 'Honda Civic',
          modelName: 'Honda Civic',
          VehicleClass: 'Sedan',
          YearOfManufacture: 2021,
          isAvailableForBooking: false,
          IsAvailableForBooking: false,
          adminVerificationStatus: 'Pending',
          Reviews: []
        }
      ],
      bookings: [
        {
          id: 'b1',
          userName: 'John Doe',
          vehicleName: 'Toyota Prius',
          status: 'Pending',
          startDate: '2026-09-01',
          endDate: '2026-09-03',
          totalAmount: 15000,
          statusChangedDate: null
        },
        {
          id: 'b2',
          userName: 'Jane Smith',
          vehicleName: 'Honda Civic',
          status: 'Confirmed',
          startDate: '2026-08-20',
          endDate: '2026-08-25',
          totalAmount: 25000,
          statusChangedDate: '2026-08-15T10:00:00Z'
        },
        {
          id: 'b3',
          userName: 'Bob Wilson',
          vehicleName: 'Toyota Prius',
          status: 'Completed',
          startDate: '2026-07-01',
          endDate: '2026-07-05',
          totalAmount: 20000,
          statusChangedDate: '2026-07-06T12:00:00Z'
        }
      ]
    });
  }

  updateAvailability(id: string, available: boolean) {
    return of(void 0);
  }

  getBlockedDateRanges(vehicleId: string) {
    return of([
      { id: 'br1', startDate: '2026-09-10', endDate: '2026-09-12', reason: 'Maintenance' }
    ]);
  }

  addBlockedDateRange(vehicleId: string, start: string, end: string, reason: string) {
    return of({ id: 'br-new' });
  }

  editBlockedDateRange(
    vehicleId: string,
    rangeId: string,
    start: string,
    end: string,
    reason: string
  ) {
    return of(void 0);
  }

  deleteBlockedDateRange(vehicleId: string, rangeId: string) {
    return of(void 0);
  }
}

class MockTransportVehicleService {
  deleteVehicle(id: string) {
    return of(void 0);
  }
}

class MockTransportBookingService {
  updateBookingStatus(id: string, status: string, cancelledBy?: string) {
    return of(void 0);
  }
}

class MockAuthService {
  getUserEmail() {
    return 'provider@example.com';
  }
  getUserName() {
    return 'Test Provider';
  }
}

describe('ProviderDashboardComponent', () => {
  let component: ProviderDashboardComponent;
  let fixture: ComponentFixture<ProviderDashboardComponent>;
  let vehicleService: VehicleService;
  let bookingService: TransportBookingService;
  let transportVehicleService: TransportVehicleService;
  let authService: AuthService;
  let router: Router;

  const mockRouter = {
    navigate: jasmine.createSpy('navigate')
  };

  const mockActivatedRoute = {
    queryParams: of({})
  };

  beforeEach(async () => {
    (window as any).Swal = mockSwal;

    await TestBed.configureTestingModule({
      imports: [
        ProviderDashboardComponent, // standalone
        CommonModule,
        FormsModule
      ],
      providers: [
        { provide: VehicleService, useClass: MockVehicleService },
        { provide: TransportVehicleService, useClass: MockTransportVehicleService },
        { provide: TransportBookingService, useClass: MockTransportBookingService },
        { provide: AuthService, useClass: MockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProviderDashboardComponent);
    component = fixture.componentInstance;

    vehicleService = TestBed.inject(VehicleService);
    bookingService = TestBed.inject(TransportBookingService);
    transportVehicleService = TestBed.inject(TransportVehicleService);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);

    mockSwal.fire.calls.reset();
    mockRouter.navigate.calls.reset();
  });

  // ====================== CREATION & INIT ======================
  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load provider data on init when authenticated', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.providerId).toBe('provider@example.com');
    expect(component.userName).toBe('Test Provider');
    expect(component.vehicles.length).toBe(2);
    expect(component.bookings.length).toBe(3);
    expect(component.stats.totalVehicles).toBe(2);
    expect(component.filteredVehicles.length).toBeGreaterThan(0);
    expect(component.filteredBookings.length).toBeGreaterThan(0);
  }));

  it('should redirect to login when providerId is missing', fakeAsync(() => {
    spyOn(authService, 'getUserEmail').and.returnValue(null as any);
    spyOn(authService, 'getUserName').and.returnValue(null as any);

    fixture.detectChanges();
    tick();

    expect(mockSwal.fire).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  }));

  // ====================== PANEL SWITCHING ======================
  it('should switch active panel', () => {
    component.switchPanel('bookings');
    expect(component.activePanel).toBe('bookings');

    component.switchPanel('fleet');
    expect(component.activePanel).toBe('fleet');
  });

  // ====================== FILTERING ======================
  it('should filter vehicles by search term', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.vehicleSearchTerm = 'prius';
    component.filterVehicles();

    expect(component.filteredVehicles.length).toBe(1);
    expect(component.filteredVehicles[0].ModelName).toContain('Prius');
  }));

  it('should filter vehicles by availability status', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.vehicleStatusFilter = 'Available';
    component.filterVehicles();

    expect(
      component.filteredVehicles.every(
        (v) => v.isAvailableForBooking === true || v.IsAvailableForBooking === true
      )
    ).toBeTrue();
  }));

  it('should filter bookings by search term', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.bookingSearchTerm = 'john';
    component.filterBookings();

    expect(component.filteredBookings.length).toBe(1);
    expect(component.filteredBookings[0]?.userName?.toLowerCase()).toContain('john');
  }));

  it('should filter bookings by status', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.bookingStatusFilter = 'Completed';
    component.filterBookings();

    expect(
      component.filteredBookings.every(
        (b) => (b.status || (b as any).Status) === 'Completed'
      )
    ).toBeTrue();
  }));

  // ====================== AVAILABILITY TOGGLE ======================
  it('should toggle vehicle availability optimistically and call service', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const vehicle = component.vehicles[0];
    const original = vehicle.isAvailableForBooking;

    spyOn(vehicleService, 'updateAvailability').and.returnValue(of(void 0));

    component.toggleAvailability(vehicle);
    tick();

    expect(vehicle.isAvailableForBooking).toBe(!original);
    expect(vehicleService.updateAvailability).toHaveBeenCalledWith(
      vehicle.id || vehicle._id,
      !original
    );
    expect(mockSwal.fire).toHaveBeenCalled();
  }));

  it('should revert availability on service error', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const vehicle = { ...component.vehicles[0] };

    spyOn(vehicleService, 'updateAvailability').and.returnValue(
      throwError(() => new Error('Network error'))
    );
    spyOn(component, 'loadAll');

    component.toggleAvailability(vehicle);
    tick();

    expect(component.loadAll).toHaveBeenCalled();
    expect(mockSwal.fire).toHaveBeenCalled();
  }));

  // ====================== BOOKING ACTIONS ======================
  it('should accept a booking optimistically', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const booking = component.bookings.find((b) => b.status === 'Pending')!;
    const originalPending = component.stats.pendingBookings;
    const originalAccepted = component.stats.acceptedBookings;

    spyOn(bookingService, 'updateBookingStatus').and.returnValue(of(void 0));

    component.acceptBooking(booking);
    tick();

    expect(booking.status).toBe('Confirmed');
    expect(component.stats.pendingBookings).toBe(originalPending - 1);
    expect(component.stats.acceptedBookings).toBe(originalAccepted + 1);
    expect(bookingService.updateBookingStatus).toHaveBeenCalledWith(booking.id!, 'Confirmed');
  }));

  it('should complete a booking optimistically', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const booking = component.bookings.find((b) => b.status === 'Confirmed')!;
    spyOn(bookingService, 'updateBookingStatus').and.returnValue(of(void 0));

    component.completeBooking(booking);
    tick();

    expect(booking.status).toBe('Completed');
    expect(bookingService.updateBookingStatus).toHaveBeenCalledWith(booking.id!, 'Completed');
  }));

  it('should reject a booking after confirmation', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const booking = component.bookings.find((b) => b.status === 'Pending')!;
    spyOn(bookingService, 'updateBookingStatus').and.returnValue(of(void 0));

    component.rejectBooking(booking);
    tick();

    expect(booking.status).toBe('Rejected');
    expect(bookingService.updateBookingStatus).toHaveBeenCalledWith(booking.id!, 'Rejected');
  }));

  // ====================== DELETE VEHICLE ======================
  it('should delete vehicle after confirmation', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    spyOn(transportVehicleService, 'deleteVehicle').and.returnValue(of(void 0));
    spyOn(component, 'loadAll');

    component.deleteVehicle('v1');
    tick();

    expect(transportVehicleService.deleteVehicle).toHaveBeenCalledWith('v1');
    expect(component.loadAll).toHaveBeenCalled();
  }));

  // ====================== BLOCKED RANGES ======================
  it('should open blocked ranges modal and load ranges', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const vehicle = component.vehicles[0];
    spyOn(vehicleService, 'getBlockedDateRanges').and.returnValue(
      of([{ id: 'br1', startDate: '2026-09-10', endDate: '2026-09-12', reason: 'Maintenance' }])
    );

    component.openBlockedRangesModal(vehicle);
    tick();

    expect(component.showBlockedRangesModal).toBeTrue();
    expect(component.blockedRangesVehicle).toBe(vehicle);
    expect(component.blockedRangesList.length).toBe(1);
  }));

  it('should close blocked ranges modal', () => {
    component.showBlockedRangesModal = true;
    component.blockedRangesVehicle = { id: 'v1' };

    component.closeBlockedRangesModal();

    expect(component.showBlockedRangesModal).toBeFalse();
    expect(component.blockedRangesVehicle).toBeNull();
  });

  it('should add a new blocked range optimistically', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.blockedRangesVehicle = component.vehicles[0];
    component.blockedRangesStartDate = '2026-10-01';
    component.blockedRangesEndDate = '2026-10-03';
    component.blockedRangesReason = 'Holiday';
    component.editingBlockedRange = null;

    spyOn(vehicleService, 'addBlockedDateRange').and.returnValue(of({ id: 'new-br' }));

    component.addBlockedRange();
    tick();

    expect(vehicleService.addBlockedDateRange).toHaveBeenCalled();
    expect(mockSwal.fire).toHaveBeenCalled();
  }));

  // ====================== CANCEL BOOKING ======================
  it('should allow cancel only for future Confirmed bookings', () => {
    const futureBooking = {
      id: 'b-future',
      status: 'Confirmed',
      startDate: '2026-12-01',
      endDate: '2026-12-05'
    };
    const pastBooking = {
      id: 'b-past',
      status: 'Confirmed',
      startDate: '2026-01-01',
      endDate: '2026-01-05'
    };

    expect(component.canCancelBooking(futureBooking)).toBeTrue();
    expect(component.canCancelBooking(pastBooking)).toBeFalse();
  });

  it('should open cancel booking modal for eligible booking', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const booking = {
      id: 'b-cancel',
      status: 'Confirmed',
      startDate: '2026-12-01',
      endDate: '2026-12-05',
      vehicleId: 'v1'
    } as any;

    component.cancelBooking(booking);
    tick();

    expect(component.showCancelBookingModal).toBeTrue();
    expect(component.cancelBookingData).toBe(booking);
    expect(component.cancelStep).toBe('reason');
  }));

  it('should require a reason before moving to dates step', () => {
    component.cancelReason = '';
    component.onCancelReasonNext();
    expect(component.cancelStep).toBe('reason');
    expect(mockSwal.fire).toHaveBeenCalled();

    component.cancelReason = 'Emergency';
    component.onCancelReasonNext();
    expect(component.cancelStep).toBe('dates');
  });

  // ====================== RATING CALCULATION ======================
  it('should calculate provider average rating from vehicle reviews', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    component.calculateProviderAverageRating();
    expect(component.stats.rating).toBe(4.5);
  }));

  // ====================== HELPERS ======================
  it('should detect cancellation-related blocked ranges', () => {
    expect(
      component.isCancellationBlockedRange({ reason: 'Cancelled booking: emergency' })
    ).toBeTrue();
    expect(component.isCancellationBlockedRange({ reason: 'Maintenance' })).toBeFalse();
    expect(component.isCancellationBlockedRange(null)).toBeFalse();
  });

  it('should navigate to edit vehicle page', () => {
    component.editVehicle('v1');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/edit-vehicle', 'v1']);
  });

  it('should show vehicle details via Swal', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    const vehicle = component.vehicles[0];
    component.showVehicleDetails(vehicle);
    expect(mockSwal.fire).toHaveBeenCalled();
  }));

  it('should show booking status breakdown via Swal', () => {
    component.stats.rejectedBookings = 2;
    component.stats.canceledBookings = 1;
    component.showBookingStatusDetails();
    expect(mockSwal.fire).toHaveBeenCalled();
  });
});