import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminDashboardComponent } from './admin-dashboard';
import { AdminService } from '../services/admin.service';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;

  const mockAdminService = {
    getDashboardStats: () => of({ totalExpenditure: 1000 }),
    getPendingProviders: () => of([]),
    getAllUsers: () => of([]),
    getAllUploadedMemories: () => of([]),
    getAllVehiclesDetailed: () => of({ vehicles: [], totalCount: 0 }),
    getAllBookings: () => of([]),
    getBudgetDetails: () => of({ trips: [] })
  };

  const mockAuthService = {
    getUserName: () => 'Test Admin',
    logout: () => {}
  };

  const mockNotificationService = {
    startConnection: () => {},
    addNotificationListener: () => {}
  };

  const mockRouter = {
    navigate: jasmine.createSpy('navigate')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AdminService, useValue: mockAdminService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: Router, useValue: mockRouter }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the admin dashboard component', () => {
    expect(component).toBeTruthy();
  });

  it('should load admin name on init', () => {
    expect(component.adminName).toEqual('Test Admin');
  });

  it('should correctly determine user block status label', () => {
    const activeUser = { isBlocked: false };
    expect(component.getBlockStatusLabel(activeUser)).toEqual('Active');

    const permBlockedUser = { isBlocked: true, blockType: 'Permanent' };
    expect(component.getBlockStatusLabel(permBlockedUser)).toEqual('Permanently Blocked');
  });
});