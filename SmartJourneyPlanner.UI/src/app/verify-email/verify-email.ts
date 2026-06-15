import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verify-email.html', 
  styleUrl: './verify-email.css'     
})
export class VerifyEmailComponent implements OnInit {
  loading = true;
  success = false;
  error = false;
  errorMessage = 'The verification link may be invalid or has already expired.';

  tripId: string | null = null;
  role: string | null = null;

  constructor(
    private route: ActivatedRoute, 
    private http: HttpClient, 
    private router: Router
  ) {}

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    this.tripId = this.route.snapshot.queryParamMap.get('tripId');
    this.role = this.route.snapshot.queryParamMap.get('role');

    if (token) {
      this.http.get(`http://localhost:5233/api/Auth/verify-email?token=${token}`).subscribe({
        next: (res: any) => {
          this.loading = false;
          this.success = true;
          
          setTimeout(() => {
            this.goToLogin();
          }, 4000);
        },
        error: (err) => {
          this.loading = false;
          this.error = true;
          if (err.error && err.error.message) {
            this.errorMessage = err.error.message;
          }
        }
      });
    } else {
      this.loading = false;
      this.error = true;
      this.errorMessage = 'Secure token is missing from your verification link!';
    }
  }

  // Method to navigate to the login page, including any trip invitation details if they exist, to ensure a seamless user experience after email verification
  goToLogin() {
    if (this.tripId) {
      console.log('Navigating to login with trip details:', this.tripId);
      this.router.navigate(['/login'], { 
        queryParams: { tripId: this.tripId, role: this.role } 
      });
    } else {
      this.router.navigate(['/login']);
    }
  }
}