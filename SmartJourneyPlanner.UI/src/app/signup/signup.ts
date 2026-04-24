import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, RouterLink], 
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class Signup {
  signupData = {
    FullName: '',
    Email: '',
    Password: '',
    UserType: 'Traveler'
    
    
  };

  constructor(private authService: AuthService,
              private router: Router,
              private route: ActivatedRoute) {}

  onSignup() {
  console.log('Signup Attempt:', this.signupData);

  // Sign up request එක backend එකට යවනවා
  this.authService.signup(this.signupData).subscribe({
    next: (response: any) => {
      console.log('Signup Success!', response);
      
      // 1. URL එකේ තියෙන parameters අල්ලගන්න (tripId සහ role)
      const tripId = this.route.snapshot.queryParamMap.get('tripId');
      const role = this.route.snapshot.queryParamMap.get('role');

      // 2. යූසර්ට සාර්ථක බව පෙන්වන්න
      alert('Registration Successful!');

      // 3. Redirect Logic එක
      if (tripId) {
        console.log('Redirecting to invited trip:', tripId);
        // ඉන්වයිට් එකකින් ආපු කෙනෙක් නම් කෙලින්ම Summary එකට යවනවා
        this.router.navigate(['/trip-summary', tripId], { 
          queryParams: { role: role } 
        });
      } else {
        // සාමාන්‍ය විදිහට ආපු කෙනෙක් නම් පරණ විදිහටම Login එකට යවනවා
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