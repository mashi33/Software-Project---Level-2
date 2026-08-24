import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class Signup {
  showPassword: boolean = false;
  isLoading: boolean = false;

  signupData = {
    FullName: '',
    Email: '',
    Password: '',
    UserType: '',
    TripId: null as string | null,
    Role: null as string | null
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  onSignup() {
    if (this.isLoading) {
      return;
    }

    // ===== 1. ALL FIELDS REQUIRED =====
    const fullName = (this.signupData.FullName || '').trim();
    const email = (this.signupData.Email || '').trim();
    const password = this.signupData.Password || '';
    const userType = this.signupData.UserType || '';

    if (!fullName) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please enter your full name.',
        confirmButtonColor: '#1a73e8'
      });
      return;
    }

    if (fullName.length < 2) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Name',
        text: 'Full name must be at least 2 characters.',
        confirmButtonColor: '#1a73e8'
      });
      return;
    }

    if (!email) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please enter your email address.',
        confirmButtonColor: '#1a73e8'
      });
      return;
    }

    // Simple email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Email',
        text: 'Please enter a valid email address.',
        confirmButtonColor: '#1a73e8'
      });
      return;
    }

    if (!password) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please enter a password.',
        confirmButtonColor: '#1a73e8'
      });
      return;
    }

    if (!userType) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please select your role (Traveller or Transport Provider).',
        confirmButtonColor: '#1a73e8'
      });
      return;
    }

    // ===== 2. PASSWORD STRENGTH =====
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(password)) {
      Swal.fire({
        icon: 'error',
        title: 'Weak Password',
        text: 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character (@$!%*?&).',
        confirmButtonColor: '#1a73e8'
      });
      return;
    }

    // ===== 3. PREPARE DATA =====
    const tripId = this.route.snapshot.queryParamMap.get('tripId');
    const role = this.route.snapshot.queryParamMap.get('role');

    this.signupData.FullName = fullName;
    this.signupData.Email = email.toLowerCase();
    this.signupData.TripId = tripId;
    this.signupData.Role = role;

    this.isLoading = true;

    this.authService.signup(this.signupData).subscribe({
      next: (response: any) => {
        this.isLoading = false;

        Swal.fire({
          icon: 'success',
          title: 'Registration Successful!',
          text: 'Please check your email inbox to verify your account before logging in.',
          confirmButtonColor: '#1a73e8'
        }).then(() => {
          if (tripId) {
            this.router.navigate(['/login'], {
              queryParams: { tripId: tripId, role: role }
            });
          } else {
            this.router.navigate(['/login']);
          }
        });
      },
      error: (err) => {
        this.isLoading = false;

        const msg = err?.error?.message || 'Email might already exist or server error occurred.';
        Swal.fire({
          icon: 'error',
          title: 'Registration Failed',
          text: msg,
          confirmButtonColor: '#1a73e8'
        });
      }
    });
  }
}