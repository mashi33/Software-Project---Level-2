import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { adminGuard } from './admin-guard';

describe('adminGuard', () => {
  // Needed to wrap functional guards so they can use 'inject()' during tests
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => adminGuard(...guardParameters));

  beforeEach(() => {
    // Provides a fresh DI container for every test case to prevent data leaks.
    TestBed.configureTestingModule({});
  });

  //Basic smoke test to ensure the guard is correctly exported/imported
  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
