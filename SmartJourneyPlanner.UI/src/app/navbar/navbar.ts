import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { RouterModule } from '@angular/router'; 
import { AuthService } from '../services/auth.service';
import { TravellerDashboardService } from '../services/travellerDashboard';
import { NotificationService } from '../services/notification.service';
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

  constructor(
    private authService: AuthService,
    private dashboardService: TravellerDashboardService,
    private notificationService: NotificationService
  ) {}

  
  //Lifecycle hook that initializes the component.
   
  ngOnInit(): void {
    const savedName = localStorage.getItem('userName');
    this.userName = savedName ? savedName : 'User';
    this.loadNotifications();
  }

  loadNotifications() {
    const userType = this.authService.getUserSystemType();
    const userId = this.authService.getUserId();

    if (!userId) return;

    this.notificationService.getNotifications(userId, userType).subscribe({
      next: (dbNotifications) => {
        this.notifications = dbNotifications;
        this.updateUnreadCount();

        // Dynamically fetch traveler upcoming trips to inject countdown notification
        if (userType !== 'TransportProvider' && userType !== 'Provider') {
          this.dashboardService.getDashboardData().subscribe({
            next: (data) => {
              const upcomingTrips = data.upcomingTrips || [];
              if (upcomingTrips.length > 0) {
                const nextTrip = upcomingTrips
                  .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];
                
                if (nextTrip) {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const tripDate = new Date(nextTrip.startDate);
                  tripDate.setHours(0, 0, 0, 0);

                  const diffTime = tripDate.getTime() - today.getTime();
                  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                  if (daysLeft >= 0) {
                    let title = '';
                    if (daysLeft === 0) {
                      title = `Your trip to ${nextTrip.destination || 'your destination'} is starting today! Pack your bags.`;
                    } else if (daysLeft === 1) {
                      title = `Only 1 day left until your trip to ${nextTrip.destination || 'your destination'}! Double check your checklist.`;
                    } else {
                      title = `Only ${daysLeft} days left until your trip to ${nextTrip.destination || 'your destination'}!`;
                    }

                    const countdownNotification = {
                      id: 'countdown-999',
                      icon: 'bi-clock-fill',
                      iconColorClass: 'icon-orange',
                      title: title,
                      time: 'Just now',
                      isRead: false,
                      linkText: 'View Trip',
                      route: '/trip-summary/' + (nextTrip.id || nextTrip.Id)
                    };

                    this.notifications = [
                      countdownNotification,
                      ...dbNotifications.filter(n => n.id !== 'countdown-999')
                    ];
                    this.updateUnreadCount();
                  }
                }
              }
            },
            error: (err) => {
              console.error('Failed to load dashboard data for notification countdown', err);
            }
          });
        }
      },
      error: (err) => {
        console.error('Failed to load notifications from database', err);
      }
    });
  }

  updateUnreadCount() {
    this.unreadCount = this.notifications.filter(n => !n.isRead).length;
  }

  markAllAsRead() {
    const userId = this.authService.getUserId();
    if (!userId) return;

    this.notificationService.markAllAsRead(userId).subscribe({
      next: () => {
        this.notifications.forEach(n => n.isRead = true);
        this.notifications = [...this.notifications];
        this.updateUnreadCount();
      },
      error: (err) => console.error('Failed to mark all as read', err)
    });
  }

  markAsRead(notification: any) {
    if (notification.id === 'countdown-999') {
      notification.isRead = true;
      this.updateUnreadCount();
      return;
    }

    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        notification.isRead = true;
        this.notifications = [...this.notifications];
        this.updateUnreadCount();
      },
      error: (err) => console.error('Failed to mark notification as read', err)
    });
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

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    const clickedElement = event.target as HTMLElement;
    
    if (!clickedElement.closest('.notification-dropdown')) {
      this.isNotificationDropdownOpen = false;
    }
    
    if (!clickedElement.closest('.profile-dropdown')) {
      this.isDropdownOpen = false;
    }
    
    if (!clickedElement.closest('.memory-dropdown')) {
      this.isMemoryDropdownOpen = false;
    }
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