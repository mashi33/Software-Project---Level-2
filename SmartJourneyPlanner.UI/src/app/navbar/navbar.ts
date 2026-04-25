import { Component,OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Required for [src], *ngIf, etc.
import { RouterModule } from '@angular/router'; // Required for routerLink
import { AuthService } from '../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  // This imports property is what was missing:
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})

export class NavbarComponent {
  // User profile details
  userName: string = 'User';
  profilePic: string = '/profilePic.jpg';

  // UI State management
  isDropdownOpen: boolean = false;
  notificationCount: number = 5;

  /**
   * Lifecycle hook that initializes the component.
   * Retrieves the stored username from local storage to display in the navbar.
   */
  ngOnInit(): void {
    const savedName = localStorage.getItem('userName'); 
    this.userName = savedName ? savedName : 'User';
  }
  // toggle when click on profile picture or name
  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  // close dropdown when clicking outside of it
  closeDropdown() {
    this.isDropdownOpen = false;
  }
  
  /**
   * Handles user logout by clearing session data from local storage.
   */
  onLogout(): void {
  localStorage.clear(); 
  console.log('User logged out successfully');

  } 
}