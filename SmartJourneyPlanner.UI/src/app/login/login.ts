import { Component, OnInit } from '@angular/core';
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
export class LoginComponent implements OnInit {
  // Data model to store user input from the login form
  loginData = {
    email: '',
    password: ''
  };

  // Holds invitation metadata extracted from the URL to handle deep-linking
  invitedTripId: string | null = null;
  invitedRole: string = 'viewer';

  constructor(
    private authService: AuthService,
    private router: Router,
    public route: ActivatedRoute
  ) { }

  ngOnInit() {
    // Extract invitation parameters immediately when the component loads
    this.invitedTripId = this.route.snapshot.queryParamMap.get('tripId');
    this.invitedRole = this.route.snapshot.queryParamMap.get('role') || 'viewer';
  }

  /**
   * Handles the login process, session persistence, and dynamic redirection.
   */
  onLogin() {
    this.authService.login(this.loginData).subscribe({
      next: (response: any) => {
        console.log('Login Response:', response);

        // 1. Persist token, user type, and full name inside AuthService
        this.authService.saveToken(response.token, response.userType, response.username, response.profilePic);

        // Store user identifier for session referencing
        const id = response.userId || response.id;
        if (id) {
          localStorage.setItem('userId', id);
        }

        console.log('Login Success!', response);
        alert('Login Successful!');

        /**
         * CONDITIONAL REDIRECT LOGIC
         */
        if (this.invitedTripId) {
          console.log(`Redirecting to invited trip: ${this.invitedTripId} as ${this.invitedRole}`);
          this.router.navigate(['/trip-summary', this.invitedTripId], { //
            queryParams: { role: this.invitedRole }
          });
        }
        else {
          const currentUserType = this.authService.getUserSystemType();

          if (currentUserType === 'TransportProvider' || currentUserType === 'Provider') {
            this.router.navigate(['/provider-dashboard']);
          }
          else if (currentUserType === 'Traveller' || currentUserType === 'Traveler') {
            this.router.navigate(['/traveller-dashboard']);
          }
          else {
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