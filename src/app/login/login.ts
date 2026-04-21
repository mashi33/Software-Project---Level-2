import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth';
import { Router, RouterLink } from '@angular/router'; 

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule , RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  
  loginData = {
    email: '',
    password: ''
  };

constructor(private authService: AuthService , private router: Router) { }

  onLogin() {
    this.authService.login(this.loginData).subscribe({
      next: (response) => {
        console.log('Login Success!', response);
        alert('Login Successful!');
        
        this.router.navigate(['/signup']);
        
      },
      error: (err) => {
        console.error('Login Failed', err);
        alert('Login Failed! Please check your Email and Password.');
      }
    });
  }
}
