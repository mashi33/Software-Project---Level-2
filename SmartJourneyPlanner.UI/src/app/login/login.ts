import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Router, RouterLink } from '@angular/router'; 

@Component({
    selector: 'app-login',
    imports: [FormsModule, RouterLink],
    templateUrl: './login.html',
    styleUrl: './login.css'
})
export class LoginComponent {
  //  variable to get data from form
  loginData = {
    email: '',
    password: ''
  };

constructor(private authService: AuthService , private router: Router) { }

  onLogin() {
    this.authService.login(this.loginData).subscribe({
      next: (response) => {
        // 1. Save token and userType in localStorage for later use
        localStorage.setItem('token', response.token);
        localStorage.setItem('userType', response.userType);

        console.log('Login Success!', response);
        alert('Login Successful!');

        // 2. UserType 
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
      },
      error: (err) => {
        console.error('Login Failed', err);
        alert('Login Failed! Please check your Email and Password.');
      }
    });
  }
}
