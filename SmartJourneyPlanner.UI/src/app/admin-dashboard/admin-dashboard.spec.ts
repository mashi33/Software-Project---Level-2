import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminDashboardComponent } from './admin-dashboard';

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminDashboardComponent);

    //use this to check the state of variables like 'pendingProviders' or 'allUsers'
    component = fixture.componentInstance;

    //It's like a "manual refresh" for the test so the HTML matches the TS data
    fixture.detectChanges();
  });

  //It simply checks if the component can load without crashing.
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
