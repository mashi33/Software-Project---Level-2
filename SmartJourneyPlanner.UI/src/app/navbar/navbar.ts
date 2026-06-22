import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Subscription } from 'rxjs'; // 💡 Subscription එක මෙතන තියෙනවා

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  // User profile details
  userName: string = 'User';
  profilePic: string = '/profilePic.jpg';

  // 🔑 THE FIX: Declare the missing variable so the HTML template can find it!
  userRole: string = 'Traveler';

  // 💡 [FIXED ERROR 1]: userSub වේරියබල් එක මෙතන ඩික්ලෙයාර් කළා
  private userSub!: Subscription;

  // UI State management
  isDropdownOpen: boolean = false;
  isMemoryDropdownOpen: boolean = false;
  notificationCount: number = 5;
  dropdownLabel: string = 'Memory';

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        
        // 🔑 THE FIX: Comprehensive role-matching verification hierarchy 
        this.userRole = tokenPayload.UserType || 
                        tokenPayload.userType || 
                        tokenPayload.role || 
                        tokenPayload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || 
                        'Traveler';
                        
        console.log("Current session validation check. Decoded UserType value:", this.userRole);
      }
    } catch (e) {
      console.error("Failed to extract active claim structures:", e);
      this.userRole = 'Traveler';
    }

    // Your existing subscriptions below stay exactly the same
    this.userSub = this.authService.userNameSubject$.subscribe({
      next: (name: string) => {
        this.userName = name || 'User';
      },
      error: (err) => console.error('Navbar subscription error:', err)
    });

    const savedPic = localStorage.getItem('profilePic');
    if (savedPic) {
      this.profilePic = savedPic;
    }
  }

  // 💡 Component එකෙන් අයින් වෙද්දී Subscription එක අයින් කිරීම
  ngOnDestroy(): void {
    if (this.userSub) {
      this.userSub.unsubscribe();
    }
  }

  toggleDropdown(menu?: string) {
    if (menu === 'memory') {
      this.isMemoryDropdownOpen = !this.isMemoryDropdownOpen;
    } else {
      this.isDropdownOpen = !this.isDropdownOpen;
    }
  }

  closeDropdown() {
    this.isDropdownOpen = false;
    this.isMemoryDropdownOpen = false;
  }

  onLogout(): void {
    this.authService.logout();
    this.closeDropdown();
    this.router.navigate(['/login']);
    console.log('User logged out successfully');
  }

  selectOption(option: string) {
    this.dropdownLabel = option;
    this.isMemoryDropdownOpen = false;
  }
}