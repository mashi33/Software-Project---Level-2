import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  //get expected roles from route data
  const expectedRoles = route.data['expectedRoles'] as Array<string>;
  const userRole = authService.getUserRole();
  const userType = authService.getUserSystemType();

  if (expectedRoles.some(r => r === userRole || r === userType)) {
    return true;
  } else {
    alert('Unauthorized Access! You do not have permission to view this page.');
    router.navigate(['/profile']);
    return false;
  }
};