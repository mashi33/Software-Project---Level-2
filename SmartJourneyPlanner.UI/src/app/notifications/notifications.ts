import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.css']
})
export class NotificationsComponent implements OnInit {
  notifications: any[] = [];
  filteredNotifications: any[] = [];
  filterTab: string = 'all';
  unreadCount: number = 0;
  readCount: number = 0;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.loadAllNotifications();
  }

  loadAllNotifications() {
    const userType = this.authService.getUserSystemType();
    
    if (userType === 'TransportProvider' || userType === 'Provider') {
      this.notifications = [
        {
          id: 1,
          icon: 'bi-card-list',
          iconColorClass: 'icon-blue',
          title: 'New booking request received from traveler Dinuri for Toyota KDH',
          time: '30 mins ago',
          isRead: false,
          linkText: 'View Request',
          route: '/provider-dashboard'
        },
        {
          id: 2,
          icon: 'bi-x-circle-fill',
          iconColorClass: 'icon-red',
          title: 'Booking request #B102 has been cancelled by traveler Sasini',
          time: '3 hours ago',
          isRead: false,
          linkText: 'Check Status',
          route: '/provider-dashboard'
        },
        {
          id: 3,
          icon: 'bi-check-circle-fill',
          iconColorClass: 'icon-green',
          title: 'Booking #B105 with traveler Sandali has been completed. Check your dashboard statistics!',
          time: '12 hours ago',
          isRead: true,
          linkText: 'View Stats',
          route: '/provider-dashboard'
        },
        {
          id: 4,
          icon: 'bi-star-fill',
          iconColorClass: 'icon-orange',
          title: 'Traveler Malpawani Poornima left a 5-star review for your Toyota Axio',
          time: '1 day ago',
          isRead: true,
          linkText: 'View Review',
          route: '/provider-dashboard'
        },
        {
          id: 5,
          icon: 'bi-patch-check-fill',
          iconColorClass: 'icon-green',
          title: 'Your vehicle Toyota KDH listing has been approved by the administrator and is now active!',
          time: '3 days ago',
          isRead: true,
          linkText: 'Manage Fleet',
          route: '/provider-dashboard'
        },
        {
          id: 6,
          icon: 'bi-exclamation-octagon-fill',
          iconColorClass: 'icon-red',
          title: 'Your vehicle Honda Vezel listing request was rejected by the administrator. Please update details and re-submit',
          time: '5 days ago',
          isRead: true,
          linkText: 'Edit Listing',
          route: '/provider-dashboard'
        },
        {
          id: 7,
          icon: 'bi-clock-history',
          iconColorClass: 'icon-green',
          title: 'Reminder: Booking #B102 starts tomorrow morning at 6:00 AM. Traveler Contact: +94771234567',
          time: '1 week ago',
          isRead: true,
          linkText: 'View Details',
          route: '/provider-dashboard'
        },
        {
          id: 8,
          icon: 'bi-exclamation-triangle-fill',
          iconColorClass: 'icon-orange',
          title: 'Action Required: You have a pending booking request from traveler Sandali waiting for more than 24 hours',
          time: '1 week ago',
          isRead: true,
          linkText: 'Accept/Reject',
          route: '/provider-dashboard'
        },
        {
          id: 9,
          icon: 'bi-cash-coin',
          iconColorClass: 'icon-green',
          title: 'Advance payment of Rs 15,000 confirmed for Booking #B105',
          time: '1 week 2 days ago',
          isRead: true,
          linkText: 'View Payments',
          route: '/provider-dashboard'
        },
        {
          id: 10,
          icon: 'bi-info-circle-fill',
          iconColorClass: 'icon-blue',
          title: 'System update: New service fee rules are now active on your dashboard',
          time: '2 weeks ago',
          isRead: true,
          linkText: 'Read Updates',
          route: '/provider-dashboard'
        },
        {
          id: 11,
          icon: 'bi-card-list',
          iconColorClass: 'icon-blue',
          title: 'New booking request received from traveler Nimasha for Honda Vezel',
          time: '2 weeks ago',
          isRead: true,
          linkText: 'View Request',
          route: '/provider-dashboard'
        },
        {
          id: 12,
          icon: 'bi-star-fill',
          iconColorClass: 'icon-orange',
          title: 'Traveler Sandali Poornima left a 4-star review for your KDH Van',
          time: '3 weeks ago',
          isRead: true,
          linkText: 'View Review',
          route: '/provider-dashboard'
        }
      ];
    } else {
      this.notifications = [
        {
          id: 1,
          icon: 'bi-calendar-event',
          iconColorClass: 'icon-blue',
          title: 'Due on Monday, 15 June 2026, 8:00 AM: Trip to Ella starting',
          time: '2 hours ago',
          isRead: false,
          linkText: 'View Trip',
          route: '/traveller-dashboard'
        },
        {
          id: 2,
          icon: 'bi-check-circle-fill',
          iconColorClass: 'icon-green',
          title: 'Your booking for Honda Vezel has been confirmed by provider',
          time: '1 day 4 hours ago',
          isRead: false,
          linkText: 'View Booking',
          route: '/transport'
        },
        {
          id: 3,
          icon: 'bi-cloud-rain-fill',
          iconColorClass: 'icon-blue',
          title: 'New weather advisory: Heavy rain expected in Nuwara Eliya tomorrow',
          time: '3 days ago',
          isRead: true,
          linkText: 'Check Weather',
          route: '/weather'
        },
        {
          id: 4,
          icon: 'bi-camera-fill',
          iconColorClass: 'icon-orange',
          title: 'Don\'t forget to add memories to your recent trip to Galle!',
          time: '5 days ago',
          isRead: true,
          linkText: 'Add Memory',
          route: '/memories'
        },
        {
          id: 5,
          icon: 'bi-exclamation-triangle-fill',
          iconColorClass: 'icon-red',
          title: 'Budget alert: You have reached 80% of your estimated trip budget',
          time: '6 days ago',
          isRead: true,
          linkText: 'View Budget',
          route: '/budget'
        },
        {
          id: 6,
          icon: 'bi-check-circle-fill',
          iconColorClass: 'icon-green',
          title: 'Your booking request #B104 has been accepted by provider Nimal',
          time: '1 week ago',
          isRead: true,
          linkText: 'View Booking',
          route: '/transport'
        },
        {
          id: 7,
          icon: 'bi-calendar-check',
          iconColorClass: 'icon-blue',
          title: 'Reminder: Your trip to Galle starts in 2 days. Check your checklist!',
          time: '1 week 1 day ago',
          isRead: true,
          linkText: 'View Checklist',
          route: '/traveller-dashboard'
        },
        {
          id: 8,
          icon: 'bi-cloud-wind',
          iconColorClass: 'icon-blue',
          title: 'New weather advisory: Heavy wind expected in Ella tomorrow morning',
          time: '1 week 3 days ago',
          isRead: true,
          linkText: 'Check Weather',
          route: '/weather'
        },
        {
          id: 9,
          icon: 'bi-exclamation-triangle-fill',
          iconColorClass: 'icon-red',
          title: 'Budget alert: You have reached 95% of your estimated trip budget',
          time: '2 weeks ago',
          isRead: true,
          linkText: 'Manage Expenses',
          route: '/budget'
        },
        {
          id: 10,
          icon: 'bi-shield-check',
          iconColorClass: 'icon-green',
          title: 'System update: New traveler security policies have been updated',
          time: '3 weeks ago',
          isRead: true,
          linkText: 'Read Security',
          route: '/traveller-dashboard'
        }
      ];
    }
    this.updateCounts();
    this.applyFilter(this.filterTab);
  }

  updateCounts() {
    this.unreadCount = this.notifications.filter(n => !n.isRead).length;
    this.readCount = this.notifications.filter(n => n.isRead).length;
  }

  applyFilter(filter: string) {
    this.filterTab = filter;
    if (filter === 'unread') {
      this.filteredNotifications = this.notifications.filter(n => !n.isRead);
    } else if (filter === 'read') {
      this.filteredNotifications = this.notifications.filter(n => n.isRead);
    } else {
      this.filteredNotifications = [...this.notifications];
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.isRead = true);
    this.notifications = [...this.notifications];
    this.updateCounts();
    this.applyFilter(this.filterTab);
  }

  markAsRead(notification: any) {
    notification.isRead = true;
    this.notifications = [...this.notifications];
    this.updateCounts();
    this.applyFilter(this.filterTab);
  }
}
