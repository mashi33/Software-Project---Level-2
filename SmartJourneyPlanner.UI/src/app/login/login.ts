import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit {

  /**
   * Stores user credentials entered in the login form.
   */
  loginData = {
    email: '',
    password: ''
  };

  /**
   * Stores trip invitation information if the user
   * accesses the login page through an invitation link.
   */
  invitedTripId: string | null = null;
  invitedRole: string = 'viewer';

  constructor(
    private authService: AuthService,
    private router: Router,
    public route: ActivatedRoute
  ) { }

  /**
   * Lifecycle hook executed when the component loads.
   * Retrieves invitation details from URL query parameters.
   */
  ngOnInit(): void {

    // Get trip ID from invitation link if available
    this.invitedTripId =
      this.route.snapshot.queryParamMap.get('tripId');

    // Get invited role from URL or use viewer as default
    this.invitedRole =
      this.route.snapshot.queryParamMap.get('role') || 'viewer';
  }

  onLogin(): void {

    // Basic form validation
    if (!this.loginData.email || !this.loginData.password) {

      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please enter both email and password.',
        confirmButtonColor: '#F4A261'
      });

      return;
    }

    // Send login request to backend API
    this.authService.login(this.loginData).subscribe({

      next: (response: any) => {

        console.log('Login Success!', response);

        /**
         * Save authentication details in local storage
         * to maintain the user session.
         */
        this.authService.saveToken(
          response.token,
          response.userType,
          response.username,
          response.profilePic
        );

        // Store user ID for future operations
        const id = response.userId || response.id;

        if (id) {
          localStorage.setItem('userId', id);
        }

        /**
         * Retrieve the logged-in user's role early to enforce provider-specific redirection.
         */
        const currentUserType = this.authService.getUserSystemType() || '';

        // If the user is a transport provider, always send them to the transport-provider dashboard
        const lowerType = currentUserType.toLowerCase();
        if (lowerType === 'transportprovider' || lowerType === 'provider' || lowerType.includes('provider')) {
          // If the user came via an invitation link, show a specific informational message before redirecting
          if (this.invitedTripId) {
            Swal.fire({
              icon: 'info',
              title: 'Welcome!',
              text: 'Welcome! You are logged in as a Transport Provider. Trip invitation links are for Travellers. You have been redirected to your Provider Dashboard.',
              confirmButtonText: 'OK',
              confirmButtonColor: '#00A86B',
              allowOutsideClick: false
            }).then(() => {
              this.router.navigate(['/transport-provider-dashboard']);
            });

            return; // Prevent any other redirect logic (including invited trip) from running
          }

          // Default provider login flow (no invitation link)
          Swal.fire({
            icon: 'success',
            title: 'Welcome Back!',
            html: `<div style="font-size:15px;"><p>Login successful.</p><p>Redirecting to your dashboard.</p></div>`,
            confirmButtonText: 'Continue',
            confirmButtonColor: '#00A86B',
            allowOutsideClick: false
          }).then(() => {
            // Use the transport-provider-dashboard route as requested
            this.router.navigate(['/transport-provider-dashboard']);
          });

          return; // Prevent any other redirect logic (including invited trip) from running
        }

        /**
         * Display login success notification for non-provider users.
         */
        Swal.fire({
          icon: 'success',
          title: 'Welcome Back!',
          html: `
            <div style="font-size:15px;">
              <p>Login successful.</p>
              <p>Enjoy planning your next journey with Smart Journey Planner.</p>
            </div>
          `,
          confirmButtonText: 'Continue',
          confirmButtonColor: '#00A86B',
          allowOutsideClick: false
        }).then(() => {

          /**
           * If the user arrived through an invitation link,
           * redirect them directly to the shared trip.
           */
          if (this.invitedTripId) {

            console.log(
              'Redirecting invited user to trip:',
              this.invitedTripId
            );

            this.router.navigate(
              ['/trip-summary', this.invitedTripId],
              {
                queryParams: {
                  role: this.invitedRole
                }
              }
            );

            return;
          }

          // Redirect admin
          if (currentUserType === 'Admin') {
            this.router.navigate(['/admin-dashboard']);
          }

          // Redirect travellers
          else if (
            currentUserType === 'Traveller' ||
            currentUserType === 'Traveler'
          ) {
            this.router.navigate(['/traveller-dashboard']);
          }

          // Fallback route
          else {
            this.router.navigate(['/']);
          }
        });
      },

      error: (err) => {

        console.error('Login Failed', err);

        /**
         * Default error message.
         */
        let errorMessage =
          'Please check your email and password.';

        /**
         * Use backend error message if available.
         */
        if (err?.error?.message) {
          errorMessage = err.error.message;
        }

        /**
         * Display login failure notification.
         */
        Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: errorMessage,
          confirmButtonText: 'Try Again',
          confirmButtonColor: '#E63946'
        });
      }
    });
  }
}