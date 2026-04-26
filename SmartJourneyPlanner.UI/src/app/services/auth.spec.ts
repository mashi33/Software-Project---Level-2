import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth';

describe('Auth', () => {
  let service: AuthService;
  
  /**
   * Setup phase: Runs before each test case.
   * Initializes the Angular testing module and injects the AuthService.
   */
  beforeEach(() => {
    TestBed.configureTestingModule({});
    // In a real scenario, you would provide HttpClientTestingModule here
    // since AuthService depends on HttpClient.
    service = TestBed.inject(AuthService);
  });
  
  //Sanity Test: Verifies if the AuthService is successfully created.
  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
