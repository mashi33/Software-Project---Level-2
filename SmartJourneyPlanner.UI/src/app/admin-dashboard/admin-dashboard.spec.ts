import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminDashboard } from './admin-dashboard';

describe('AdminDashboard', () => {
  let component: AdminDashboard;
  let fixture: ComponentFixture<AdminDashboard>;

  /*use 'beforeEach' to reset the testing environment before every single test case.
   This ensures that if one test fails or modifies the data, it doesn't break the others.*/
  beforeEach(async () => {

    /*to simulate how the real browser handles the 
     HTML templates and CSS styles during development.*/
    await TestBed.configureTestingModule({
      imports: [AdminDashboard]
    })
    .compileComponents();

    // It lets us trigger things like button clicks or check if a title is visible
    fixture = TestBed.createComponent(AdminDashboard);

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
