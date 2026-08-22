import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';

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
          this.success = true; // මේකෙන් HTML එකේ success-box එක පෙන්වයි

          // තත්පර 3 කින් Login පේජ් එකට යැවීම
          setTimeout(() => {
            this.goToLogin();
          }, 3000);
        },
        error: (err: any) => {
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

  goToLogin() {
    if (this.tripId) {
      this.router.navigate(['/login'], {
        queryParams: { tripId: this.tripId, role: this.role }
      });
    } else {
      this.router.navigate(['/login']);
    }
  }
}