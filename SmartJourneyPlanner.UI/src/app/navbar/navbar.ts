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

  // 💡 [FIXED ERROR 1]: userSub වේරියබල් එක මෙතන ඩික්ලෙයාර් කළා
  private userSub!: Subscription;

  // UI State management
  isDropdownOpen: boolean = false;
  isMemoryDropdownOpen: boolean = false;
  notificationCount: number = 5;
  dropdownLabel: string = 'Memory';

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    // 💡 [FIXED ERROR 2 & 3]: 'name: string' කියලා ටයිප් එක දුන්නා, එතකොට TS7006 එරර් එක නැති වෙනවා
    this.userSub = this.authService.userNameSubject$.subscribe({
      next: (name: string) => {
        this.userName = name || 'User';
      },
      error: (err) => console.error('Navbar subscription error:', err)
    });

    // ලොකල් ස්ටෝරේජ් එකෙන් ප්‍රොෆයිල් පික් එක කියවා ගැනීම
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