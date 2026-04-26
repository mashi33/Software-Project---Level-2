import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Profile } from './profile';
 
// Test suite for the Profile component
describe('Profile', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;
  
  /**
   * Test Setup: Runs before each individual test case.
   * Configures the testing module and initializes the Profile component.
   */
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Profile]
    })
    .compileComponents();
    
    // Create component instance and trigger initial data binding
    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  
  // Test case to verify that the Profile component is created successfully
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
