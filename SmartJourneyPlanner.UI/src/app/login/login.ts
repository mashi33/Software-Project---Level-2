import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit {
  showPassword: boolean = false;
  isLoading: boolean = false;

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
    if (this.isLoading) {
      return;
    }

    if (!this.loginData.email || !this.loginData.password) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please enter both email and password.',
        confirmButtonColor: '#F4A261'
      });
      return;
    }

    this.isLoading = true;

    this.authService.login(this.loginData).subscribe({
      next: (response: any) => {
        this.authService.saveToken(
          response.token,
          response.userType,
          response.username,
          response.profilePic
        );

        const id = response.userId || response.id;
        if (id) {
          localStorage.setItem('userId', id);
        }

        const currentUserType = this.authService.getUserSystemType() || '';
        const lowerType = currentUserType.toLowerCase();

        if (lowerType === 'transportprovider' || lowerType === 'provider' || lowerType.includes('provider')) {
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
            return;
          }

          Swal.fire({
            icon: 'success',
            title: 'Welcome Back!',
            html: `<div style="font-size:15px;"><p>Login successful.</p><p>Redirecting to your dashboard.</p></div>`,
            confirmButtonText: 'Continue',
            confirmButtonColor: '#00A86B',
            allowOutsideClick: false
          }).then(() => {
            this.router.navigate(['/transport-provider-dashboard']);
          });

          this.isLoading = false;
          return;
        }

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
          if (this.invitedTripId) {
            this.router.navigate(
              ['/trip-summary', this.invitedTripId],
              { queryParams: { role: this.invitedRole } }
            );
            return;
          }

          if (currentUserType === 'Admin') {
            this.router.navigate(['/admin-dashboard']);
          } else if (
            currentUserType === 'Traveller' ||
            currentUserType === 'Traveler'
          ) {
            this.router.navigate(['/traveller-dashboard']);
          } else {
            this.router.navigate(['/']);
          }
        });
      },

      error: (err) => {
        this.isLoading = false;

        let errorMessage = 'Please check your email and password.';
        if (err?.error?.message) {
          errorMessage = err.error.message;
        }

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