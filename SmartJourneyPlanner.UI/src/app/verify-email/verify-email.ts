import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';
import Swal from 'sweetalert2';

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
  ) { }

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    this.tripId = this.route.snapshot.queryParamMap.get('tripId');
    this.role = this.route.snapshot.queryParamMap.get('role');

    if (token) {
      this.http.get(`${environment.apiUrl}/Auth/verify-email?token=${token}`).subscribe({
        next: (res: any) => {
          this.loading = false;
          this.success = true;

          // සාර්ථක වූ පසු SweetAlert පෝප්-අප් එක පෙන්වීම
          Swal.fire({
            icon: 'success',
            title: '🎉 Email Verified Successfully!',
            text: 'Your account is now fully active. You can now log in.',
            confirmButtonText: 'Go to Login',
            confirmButtonColor: '#1a73e8',
            allowOutsideClick: false,
            allowEscapeKey: false
          }).then((result) => {
            if (result.isConfirmed) {
              this.goToLogin();
            }
          });
        },
        error: (err: any) => {
          this.loading = false;
          this.error = true;
          if (err.error && err.error.message) {
            this.errorMessage = err.error.message;
          }

          Swal.fire({
            icon: 'error',
            title: '❌ Verification Failed',
            text: this.errorMessage,
            confirmButtonColor: '#1a73e8'
          });
        }
      });
    } else {
      this.loading = false;
      this.error = true;
      this.errorMessage = 'Secure token is missing from your verification link!';

      Swal.fire({
        icon: 'error',
        title: '❌ Link Error',
        text: this.errorMessage,
        confirmButtonColor: '#1a73e8'
      });
    }
  }

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