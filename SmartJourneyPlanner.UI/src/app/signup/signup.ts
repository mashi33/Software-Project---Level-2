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
    UserType: 'Traveler'
    
    
  };

  constructor(private authService: AuthService,
              private router: Router,
              private route: ActivatedRoute
            ) {}
  
   /**
   * Handles the signup process and manages conditional redirection
   * based on whether the user was invited to a specific trip.
   */

  onSignup() {
  console.log('Signup Attempt:', this.signupData);

  this.authService.signup(this.signupData).subscribe({
    next: (response: any) => {
      console.log('Signup Success!', response);
      
      // Extract optional query parameters for invitation logic
      const tripId = this.route.snapshot.queryParamMap.get('tripId');
      const role = this.route.snapshot.queryParamMap.get('role');

      alert('Registration Successful!');

      // -- Redirect Logic 
      // If tripId exists, user was invited; redirect to that specific trip.
      // Otherwise, redirect to the standard login page.
      if (tripId) {
        console.log('Redirecting to invited trip:', tripId);
        this.router.navigate(['/trip-summary', tripId], { 
          queryParams: { role: role } 
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