import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, RouterLink], 
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class SignupComponent {
  signupData = {
    FullName: '',
    Email: '',
    Password: '',
    UserType: 'Traveler'
    
    
  };

  constructor(private authService: AuthService, private router: Router) {}

  onSignup() {
 // alert('Button Clicked!');
  console.log('Signup Attempt:', this.signupData);

  // start to send data to backend
  this.authService.signup(this.signupData).subscribe({
    next: (response: any) => {
      console.log('Signup Success!', response);
      alert('Registration Successful! Please login.');
      this.router.navigate(['/login']); 
    },
    error: (err) => {
      console.error('Signup Failed', err);
      alert('Registration Failed! Email might already exist.');
    }
  });
  }
}