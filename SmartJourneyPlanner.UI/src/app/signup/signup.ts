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
  //Model for signup form data
  signupData = {
    FullName: '',
    Email: '',
    Password: '',
    UserType: '',
    TripId: null as string | null,
    Role: null as string | null

  };

  constructor(private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  /**
  * Handles the signup process and manages conditional redirection
  * based on whether the user was invited to a specific trip.
  */

  onSignup() {
    if (this.isLoading) {
      return;
    }
    if (!this.signupData.UserType) {
      alert('Please select your role!');
      return;
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(this.signupData.Password)) {
      Swal.fire({
        icon: 'error',
        title: 'Weak Password',
        text: 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.',
        confirmButtonColor: '#1a73e8'
      });
      return;
    }

    const tripId = this.route.snapshot.queryParamMap.get('tripId');
    const role = this.route.snapshot.queryParamMap.get('role');

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

        Swal.fire({
          icon: 'error',
          title: 'Registration Failed',
          text: 'Email might already exist or server error occurred.',
          confirmButtonColor: '#1a73e8'
        });
      }
    });
  }
}