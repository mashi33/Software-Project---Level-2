import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.html',
  styleUrls: ['./footer.css']
})
export class FooterComponent {

  constructor(private authService: AuthService, private router: Router) { }

  isTraveller(): boolean {
    const userType = this.authService.getUserSystemType();
    return this.authService.isLoggedIn() && (userType === 'Traveller' || userType === 'traveller');
  }

  goToDashboard(): void {
    // 1. Check if the user is logged in
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    // 2. Determine the user type and navigate accordingly
    const userType = this.authService.getUserSystemType();

    if (userType === 'Provider' || userType === 'provider') {
      this.router.navigate(['/provider-dashboard']);
    } else {
      this.router.navigate(['/traveller-dashboard']);
    }
  }
}