import { Component, OnInit, OnDestroy, HostListener, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TravellerDashboardService } from '../services/travellerDashboard';
import { NotificationService } from '../services/notification.service';
import { SignalrService } from '../services/signalr.service';
import { Subscription } from 'rxjs';

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
  @Output() onToggleSidebar = new EventEmitter<void>();

  // 💡 Subscription
  private userSub!: Subscription;
  private notificationSub!: Subscription;

  // Temporary trip state used during logout
  private tripService!: { setTempTripData: (data: any) => void };

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
    private router: Router,
    private dashboardService: TravellerDashboardService,
    private notificationService: NotificationService,
    private signalrService: SignalrService
  ) { }

  ngOnInit(): void {
    // Subscriptions
    this.userSub = this.authService.userNameSubject$.subscribe({
      next: (name: string) => {
        this.userName = name || 'User';
        this.refreshUserSession();
      },
      error: (err) => console.error('Navbar subscription error:', err)
    });

    this.refreshUserSession();

    // Subscribe to real-time notifications via SignalR
    this.notificationSub = this.signalrService.notificationReceived.subscribe({
      next: (notif: any) => {
        if (notif) {
          // Add the new notification to the beginning of the list with relative time
          const mappedNotif = {
            ...notif,
            time: this.getRelativeTime(notif.createdAt)
          };
          this.notifications.unshift(mappedNotif);
          this.updateUnreadCount();
        }
      },
      error: (err) => console.error('Navbar SignalR notification error:', err)
    });
  }

  // 💡 Component destruction
  ngOnDestroy(): void {
    if (this.userSub) {
      this.userSub.unsubscribe();
    }
    if (this.notificationSub) {
      this.notificationSub.unsubscribe();
    }
  }

  loadNotifications() {
    const userType = this.authService.getUserSystemType();
    const userId = this.authService.getUserId();

    if (!userId) return;

    this.notificationService.getNotifications(userId, userType).subscribe({
      next: (dbNotifications) => {
        const mapped = dbNotifications.map((n: any) => ({
          ...n,
          time: this.getRelativeTime(n.createdAt)
        }));
        this.notifications = mapped;
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

                    const tripId = nextTrip.id || nextTrip.Id;
                    const isRead = localStorage.getItem(`countdown_read_${tripId}`) === 'true';

                    const countdownNotification = {
                      id: 'countdown-999',
                      icon: 'bi-clock-fill',
                      iconColorClass: 'icon-orange',
                      title: title,
                      time: 'Just now',
                      isRead: isRead,
                      linkText: 'View Trip',
                      route: '/trip-summary/' + tripId,
                      tripId: tripId
                    };

                    this.notifications = [
                      countdownNotification,
                      ...this.notifications.filter(n => n.id !== 'countdown-999')
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
        this.notifications.forEach(n => {
          n.isRead = true;
          if (n.id === 'countdown-999' && n.tripId) {
            localStorage.setItem(`countdown_read_${n.tripId}`, 'true');
          }
        });
        this.notifications = [...this.notifications];
        this.updateUnreadCount();
      },
      error: (err) => console.error('Failed to mark all as read', err)
    });
  }

  markAsRead(notification: any) {
    if (notification.id === 'countdown-999') {
      notification.isRead = true;
      if (notification.tripId) {
        localStorage.setItem(`countdown_read_${notification.tripId}`, 'true');
      }
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

  navigateToRoute(route: string) {
    this.closeDropdown();
    this.router.navigateByUrl(route);
  }

  refreshUserSession() {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        this.userRole = tokenPayload.UserType ||
          tokenPayload.userType ||
          tokenPayload.role ||
          tokenPayload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
          'Traveler';
        console.log("Navbar session updated. Decoded UserType value:", this.userRole);
      } else {
        this.userRole = 'Traveler';
      }
    } catch (e) {
      console.error("Failed to parse token payload in navbar:", e);
      this.userRole = 'Traveler';
    }

    const savedPic = localStorage.getItem('profilePic');
    this.profilePic = savedPic ? savedPic : '/profilePic.jpg';

    // Join the user's SignalR group for targeted real-time notifications
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.signalrService.joinUserGroup(userId);
    }

    // Clear and reload notifications for the active user session
    this.notifications = [];
    this.unreadCount = 0;
    this.loadNotifications();
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
    try {
      const userId = this.authService.getUserId();
      if (userId && this.signalrService) {
        this.signalrService.leaveUserGroup(userId);
      }

      if (this.tripService) {
        this.tripService.setTempTripData(null);
      }

      this.authService.logout();

      if (this.closeDropdown) {
        this.closeDropdown();
      }
    } catch (error) {
      console.error('Error during logout cleanup:', error);

      localStorage.clear();
    }

    // Navigate to the landing page after logout
    this.router.navigate(['/']).then(() => {
      console.log('Successfully navigated to landing');
    });
  }

  selectOption(option: string) {
    this.dropdownLabel = option;
    this.isMemoryDropdownOpen = false;
  }

  getRelativeTime(createdAt: any): string {
    if (!createdAt) return 'Just now';
    try {
      const createdDate = new Date(createdAt);
      const now = new Date();
      const diffMs = now.getTime() - createdDate.getTime();

      if (diffMs < 60000) {
        return 'Just now';
      }

      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) {
        return `${diffMins}m ago`;
      }

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) {
        return `${diffHours}h ago`;
      }

      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) {
        return 'Yesterday';
      }
      if (diffDays < 7) {
        return `${diffDays}d ago`;
      }

      return createdDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return 'Just now';
    }
  }

  toggleSidebar() {
    this.onToggleSidebar.emit();
  }
}