import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BudgetDashboard } from './budget-dashboard';
import { BudgetService } from '../services/budget';
import { TripService } from '../services/trip.service';
import { AuthService } from '../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

describe('BudgetDashboard', () => {
  let component: BudgetDashboard;
  let fixture: ComponentFixture<BudgetDashboard>;

  const mockBudgetService = {
    getBudget: () => of({ totalSpent: 0, expenses: [] }),
    getUserTripsForDropdown: () => of([])
  };

  const mockTripService = {
    getAllTrips: () => of([])
  };

  const mockAuthService = {
    getUserRole: () => 'traveler',
    getUserSystemType: () => 'web'
  };

  const mockActivatedRoute = {
    queryParams: of({})
  };

  const mockRouter = {
    navigate: jasmine.createSpy('navigate')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BudgetDashboard],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BudgetService, useValue: mockBudgetService },
        { provide: TripService, useValue: mockTripService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BudgetDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the budget dashboard component', () => {
    expect(component).toBeTruthy();
  });

  it('should extract logged-in user and set default values on init', () => {
    expect(component.userRole).toEqual('traveler');
    expect(component.isViewer).toBeFalsy();
  });
});
