import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { RouterModule } from '@angular/router'; 
import { AuthService } from '../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true, // Ensuring compatibility with modern Angular versions
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent implements OnInit {
  // User profile details
  userName: string = 'User';
  profilePic: string = '/profilePic.jpg';

  // UI State management
  isDropdownOpen: boolean = false;
  isMemoryDropdownOpen: boolean = false;
  notificationCount: number = 5;
  dropdownLabel: string = 'Memory';

  constructor(private authService: AuthService) {}

  
  //Lifecycle hook that initializes the component.
   
  ngOnInit(): void {
    const savedName = localStorage.getItem('userName');
    this.userName = savedName ? savedName : 'User';
  }

  toggleDropdown(menu?: string) {
    if (menu === 'memory') {
      this.isMemoryDropdownOpen = !this.isMemoryDropdownOpen;
    } else {
      // Logic for general dropdown if no menu name is provided
      this.isDropdownOpen = !this.isDropdownOpen;
    }
  }

  // close dropdown when clicking outside
  closeDropdown() {
    this.isDropdownOpen = false;
    this.isMemoryDropdownOpen = false;
  }

  // Handles user logout
  
  onLogout(): void {
    localStorage.clear();
    console.log('User logged out successfully');
    // You might want to add: this.router.navigate(['/login']);
  }

  selectOption(option: string) {
    this.dropdownLabel = option;
    this.isMemoryDropdownOpen = false;
  }
}