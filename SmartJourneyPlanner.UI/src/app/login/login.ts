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
  /**
   * Data model to store user input from the login form.
   */
  loginData = {
    email: '',
    password: ''
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    public route: ActivatedRoute
  ) { }

  /**
   * Handles the login submission.
   * On success, manages user sessions and redirects to the appropriate dashboard or trip.
   */
  onLogin() {
    this.authService.login(this.loginData).subscribe({
      next: (response) => {
        // Logging the raw response for debugging purposes
        console.log('Login Response:', response);

        // Session Management: Persisting authentication and user data
        this.authService.saveToken(response.token);
        localStorage.setItem('userType', response.userType);

        // Store Unique Identifier for the user
        const id = response.userId || response.id;
        if (id) {
          localStorage.setItem('userId', id);
        }

        // Generate and store a display name based on email prefix
        const nameFromEmail = this.loginData.email.split('@')[0];
        localStorage.setItem('userName', nameFromEmail);

        console.log('Login Success!', response);
        alert('Login Successful!');

        /**
         * REDIRECT LOGIC FOR INVITATIONS
         * Extracts tripId and role from the query parameters to handle deep links.
         */
        const tripId = this.route.snapshot.queryParamMap.get('tripId');
        const inviteRole = this.route.snapshot.queryParamMap.get('role') || 'viewer';

        if (tripId) {
          // Case 1: Redirection for users arriving via invitation links
          console.log(`Redirecting to invited trip: ${tripId} as ${inviteRole}`);
          this.router.navigate(['/trip-summary', tripId], {
            queryParams: { role: inviteRole }
          });
        }
        else {
          /**
           * STANDARD REDIRECT LOGIC
           * Case 2: Redirection based on defined user roles (TransportProvider, Traveller, Admin)
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
            // Default fallback for unknown user types
            this.router.navigate(['/']);
          }
        }
      },
      error: (err) => {
        // Log authentication error details for troubleshooting
        console.error('Login Failed', err);
        alert('Login Failed! Please check your Email and Password.');
      }
    });
  }
}