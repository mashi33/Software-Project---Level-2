import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-signup',
  imports: [FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class Signup {
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
    if (!this.signupData.Password || this.signupData.Password.length < 8) {
      alert('Password must be at least 8 characters long!');
      return;
    }

    // when the signup form is submitted, we first check if there are any invitation parameters in the URL (like tripId and role)
    const tripId = this.route.snapshot.queryParamMap.get('tripId');
    const role = this.route.snapshot.queryParamMap.get('role');

    // Then we attach these parameters to the signupData object, so that the backend can process the invitation context during registration
    this.signupData.TripId = tripId;
    this.signupData.Role = role;

    console.log('Signup Attempt with Invitation Data:', this.signupData);

    // call the signup method from AuthService to register the user, and handle the response accordingly
    this.authService.signup(this.signupData).subscribe({
      next: (response: any) => {
        console.log('Signup Success!', response);

        alert('Registration Successful! Please check your email inbox to verify your account before logging in.');

        //Redirect to login page after successful registration
        if (tripId) {
          console.log('Forwarding trip details to login page:', tripId);
          this.router.navigate(['/login'], {
            queryParams: { tripId: tripId, role: role }
          });
        } else {
          this.router.navigate(['/login']);
        }
      },
      error: (err) => {
        console.error('Signup Failed', err);
        alert('Registration Failed! Email might already exist.');
      }
    });
  }
}