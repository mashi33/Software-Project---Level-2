import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Router, RouterLink, ActivatedRoute } from '@angular/router'; 

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  // Model to capture login credentials from the form
  loginData = {
    email: '',
    password: ''
  };

  constructor(
    private authService: AuthService, 
    private router: Router,
    public route: ActivatedRoute // Injected to read query parameters from the URL
  ) { }

  onLogin() {
    this.authService.login(this.loginData).subscribe({
      next: (response) => {
        // 1. Save authentication token and user type in local storage for session management
        localStorage.setItem('token', response.token);
        localStorage.setItem('userType', response.userType);

        console.log('Login Success!', response);
        alert('Login Successful!');

        /**
         * REDIRECT LOGIC FOR INVITATIONS
         * Check if the URL contains a 'tripId' (e.g., /login?tripId=123)
         * This happens when a user clicks an invitation link from their email.
         */
        const tripId = this.route.snapshot.queryParamMap.get('tripId');
        const inviteRole = this.route.snapshot.queryParamMap.get('role') || 'viewer';

        if (tripId) {
          // If a tripId exists, redirect directly to the Trip Summary page
          // We also pass the role as a query parameter to handle permissions in the summary page
          console.log(`Redirecting to invited trip: ${tripId} as ${inviteRole}`);
          this.router.navigate(['/trip-summary', tripId], { 
            queryParams: { role: inviteRole } 
          });
        } 
        else {
          /**
           * STANDARD REDIRECT LOGIC
           * If no tripId is found, redirect based on the user's role/type
           */
          if (response.userType === 'TransportProvider') {
            this.router.navigate(['/provider-dashboard']);
          } 
          else if (response.userType === 'Traveller') {
            this.router.navigate(['/traveller-dashboard']);
          } 
          else if (response.userType === 'Admin') {
            this.router.navigate(['/admin-dashboard']);
          } 
          else {
            // Default fallback if userType is unrecognized
            this.router.navigate(['/']); 
          }
        }
      },
      error: (err) => {
        console.error('Login Failed', err);
        alert('Login Failed! Please check your Email and Password.');
      }
    });
  }
}