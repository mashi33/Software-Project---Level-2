import { TestBed } from '@angular/core/testing';

import { Trip } from './trip';

describe('Trip', () => {
  let service: Trip;
  
  /**
   * Setup phase: Runs before each test case.
   * Initializes the Angular testing module and injects the TripService instance.
   */
  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Trip);
  });
  
  /**
   * Basic Test Case: Verifies that the service instance is created successfully.
   */
  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
