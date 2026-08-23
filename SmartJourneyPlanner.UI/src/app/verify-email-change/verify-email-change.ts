import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-verify-email-change',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verify-email-change.html',
  styleUrl: './verify-email-change.css'
})
export class VerifyEmailChangeComponent implements OnInit {
  loading = true;
  success = false;
  error = false;
  errorMessage = 'The verification link may be invalid or has already expired.';
  newEmail = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.loading = false;
      this.error = true;
      this.errorMessage = 'Secure token is missing from your verification link!';
      return;
    }

    // Backend: GET api/users/verify-email-change?token=...
    this.http.get(`${environment.apiUrl}/users/verify-email-change`, {
      params: { token }
    }).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.success = true;
        this.newEmail = res?.newEmail || '';

        // Clear any old session — must login with NEW email
        localStorage.clear();

        setTimeout(() => this.goToLogin(), 3000);
      },
      error: (err: any) => {
        this.loading = false;
        this.error = true;
        if (err?.error?.message) {
          this.errorMessage = err.error.message;
        }
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}