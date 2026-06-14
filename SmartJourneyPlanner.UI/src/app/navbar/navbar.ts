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
  isNotificationDropdownOpen: boolean = false;
  dropdownLabel: string = 'Memory';

  // Notification State management
  notifications: any[] = [];
  unreadCount: number = 0;

  constructor(private authService: AuthService) {}

  
  //Lifecycle hook that initializes the component.
   
  ngOnInit(): void {
    const savedName = localStorage.getItem('userName');
    this.userName = savedName ? savedName : 'User';
    this.loadNotifications();
  }

  loadNotifications() {
    const userType = this.authService.getUserSystemType();
    
    if (userType === 'TransportProvider' || userType === 'Provider') {
      this.notifications = [
        {
          id: 1,
          icon: 'bi-card-list',
          iconColorClass: 'icon-blue',
          title: 'New booking request received from traveler Dinuri for Toyota KDH',
          time: '30 mins ago',
          isRead: false
        },
        {
          id: 2,
          icon: 'bi-star-fill',
          iconColorClass: 'icon-orange',
          title: 'Traveler Malpawani Poornima left a 5-star review for your vehicle',
          time: '12 hours ago',
          isRead: false
        },
        {
          id: 3,
          icon: 'bi-clock-history',
          iconColorClass: 'icon-green',
          title: 'Reminder: Booking #B102 starts tomorrow morning at 6:00 AM',
          time: '1 day ago',
          isRead: true
        },
        {
          id: 4,
          icon: 'bi-patch-check-fill',
          iconColorClass: 'icon-green',
          title: 'Your vehicle Toyota Axio has been successfully approved by the administrator',
          time: '4 days ago',
          isRead: true
        },
        {
          id: 5,
          icon: 'bi-gear-fill',
          iconColorClass: 'icon-blue',
          title: 'System update: New service fee rules are now active',
          time: '1 week ago',
          isRead: true
        }
      ];
    } else {
      // Default to Traveler
      this.notifications = [
        {
          id: 1,
          icon: 'bi-calendar-event',
          iconColorClass: 'icon-blue',
          title: 'Due on Monday, 15 June 2026, 8:00 AM: Trip to Ella starting',
          time: '2 hours ago',
          isRead: false
        },
        {
          id: 2,
          icon: 'bi-check-circle-fill',
          iconColorClass: 'icon-green',
          title: 'Your booking for Honda Vezel has been confirmed by provider',
          time: '1 day 4 hours ago',
          isRead: false
        },
        {
          id: 3,
          icon: 'bi-cloud-rain-fill',
          iconColorClass: 'icon-blue',
          title: 'New weather advisory: Heavy rain expected in Nuwara Eliya tomorrow',
          time: '3 days ago',
          isRead: true
        },
        {
          id: 4,
          icon: 'bi-camera-fill',
          iconColorClass: 'icon-orange',
          title: 'Don\'t forget to add memories to your recent trip to Galle!',
          time: '5 days ago',
          isRead: true
        },
        {
          id: 5,
          icon: 'bi-exclamation-triangle-fill',
          iconColorClass: 'icon-red',
          title: 'Budget alert: You have reached 80% of your estimated trip budget',
          time: '6 days ago',
          isRead: true
        }
      ];
    }
    this.updateUnreadCount();
  }

  updateUnreadCount() {
    this.unreadCount = this.notifications.filter(n => !n.isRead).length;
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.isRead = true);
    this.updateUnreadCount();
  }

  markAsRead(notification: any) {
    notification.isRead = true;
    this.updateUnreadCount();
  }

  toggleDropdown(menu?: string) {
    if (menu === 'memory') {
      this.isMemoryDropdownOpen = !this.isMemoryDropdownOpen;
      this.isDropdownOpen = false;
      this.isNotificationDropdownOpen = false;
    } else if (menu === 'notification') {
      this.isNotificationDropdownOpen = !this.isNotificationDropdownOpen;
      this.isDropdownOpen = false;
      this.isMemoryDropdownOpen = false;
    } else {
      this.isDropdownOpen = !this.isDropdownOpen;
      this.isMemoryDropdownOpen = false;
      this.isNotificationDropdownOpen = false;
    }
  }

  // close dropdown when clicking outside
  closeDropdown() {
    this.isDropdownOpen = false;
    this.isMemoryDropdownOpen = false;
    this.isNotificationDropdownOpen = false;
  }

  // Handles user logout
  onLogout(): void {
    localStorage.clear();
    console.log('User logged out successfully');
  }

  selectOption(option: string) {
    this.dropdownLabel = option;
    this.isMemoryDropdownOpen = false;
  }
}