import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Use the new dynamic role check
  if (authService.getUserRole() === 'Admin') {
    return true; 
  }

  // Redirect unauthorized users
  router.navigate(['/login']); 
  return false;
};