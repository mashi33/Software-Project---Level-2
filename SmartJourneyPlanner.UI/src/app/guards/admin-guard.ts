import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard = () => {
  // Manual injection is required here because we are in a function, not a class
  const authService = inject(AuthService);
  const router = inject(Router);

  /* Dynamic role check ensures that even if a user manually types '/admin' 
     in the URL, they are blocked unless their JWT/Profile specifically says 'Admin' */
  if (authService.getUserRole() === 'Admin') {
    return true; 
  }

  /* Security Fallback. If they aren't an admin, we kick them back to login 
    instead of showing a blank screen or a broken page */
  router.navigate(['/login']); 
  return false;
};