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
  loginData = {
    email: '',
    password: ''
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    public route: ActivatedRoute
  ) { }

  onLogin() {
    this.authService.login(this.loginData).subscribe({
      next: (response) => {
        // --- CRITICAL: SAVE TOKEN FIRST ---
        // This ensures the interceptor is ready before any navigation happens
        this.authService.saveToken(response.token);
        
        // Save other metadata
        localStorage.setItem('userType', response.userType);

        // Standard redirects
        const tripId = this.route.snapshot.queryParamMap.get('tripId');
        const inviteRole = this.route.snapshot.queryParamMap.get('role') || 'viewer';

        if (tripId) {
          this.router.navigate(['/trip-summary', tripId], {
            queryParams: { role: inviteRole }
          });
        }
        else {
          // Route based on UserType returned from API
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
            this.router.navigate(['/']);
          }
        }
      },
      error: (err) => {
        console.error('Login Failed', err);
        alert('Login Failed! Please check your credentials.');
      }
    });
  }
}