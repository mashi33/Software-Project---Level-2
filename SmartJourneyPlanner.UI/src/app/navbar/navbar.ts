import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { RouterModule } from '@angular/router'; 


@Component({
    selector: 'app-navbar',
    imports: [CommonModule, RouterModule],
    templateUrl: './navbar.html',
    styleUrl: './navbar.css'
})
export class NavbarComponent {
  userName: string = 'Krishan Karunarathna';
  profilePic: string = '/profilePic.jpg';
  notificationCount: number = 5;
  
  isMemoryDropdownOpen = false;
  dropdownLabel = 'Memory';

  toggleDropdown(menu: string) {
    if (menu === 'memory') {
      this.isMemoryDropdownOpen = !this.isMemoryDropdownOpen;
    }
  }
  selectOption(option: string) {
    this.dropdownLabel = option; 
    this.isMemoryDropdownOpen = false; 
  }
}