import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {//if user is logged in, allow access to the route
    return true; 
  } else {
    alert('Please login first to access this page!');
    router.navigate(['/login']); 
    return false;
  }
};