import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import Swal from 'sweetalert2';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Get allowed roles from route data
  const expectedRoles =
    (route.data['expectedRoles'] as string[] || [])
      .map(role => role.trim().toLowerCase());

  // Get the actual role of the logged-in user
  const userRole =
    (authService.getUserRole() || '').trim().toLowerCase();

  const userType =
    (authService.getUserSystemType() || '').trim().toLowerCase();

  console.log('Role Guard');
  console.log('User Role:', userRole);
  console.log('User Type:', userType);
  console.log('Expected Roles:', expectedRoles);

  // Allow only if user's role matches one of the expected roles
  const hasPermission =
    expectedRoles.includes(userRole) ||
    expectedRoles.includes(userType);

  if (hasPermission) {
    return true;
  }

  // Unauthorized
  Swal.fire({
    icon: 'error',
    title: 'Access Denied',
    text: 'You do not have permission to view this page!',
    confirmButtonColor: '#3085d6',
    confirmButtonText: 'OK'
  });

  return router.createUrlTree(['/profile']);
};