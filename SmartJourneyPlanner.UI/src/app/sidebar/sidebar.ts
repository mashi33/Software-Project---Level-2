import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  isSidebarOpen: boolean = false;
  isCollapsed: boolean = false;
  isIconOpen: boolean = false;
  isMobile: boolean = false;
  searchQuery: string = '';
  userRole: string = 'Traveler';
  userName: string = 'User';
  profilePic: string = '/profilePic.jpg';
  private userSub!: Subscription;
  isOpen: boolean = false;



  // Navigation menu items based on user role
  menuItems: any[] = [];

  // Filtered menu items based on search
  filteredMenuItems: any[] = [];

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    this.loadUserRole();
    this.loadUserProfile();
    this.setupMenuItems();
    this.filteredMenuItems = this.menuItems;

    // Check screen size for responsive sidebar
    this.checkScreenSize();
  }

  ngOnDestroy(): void {
    if (this.userSub) {
      this.userSub.unsubscribe();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
    if (this.isMobile) {
      this.isSidebarOpen = false;
      this.isCollapsed = false;
    } else {
      this.isSidebarOpen = false;
      this.isCollapsed = false;
    }
  }

  loadUserRole() {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        this.userRole = tokenPayload.UserType ||
          tokenPayload.userType ||
          tokenPayload.role ||
          tokenPayload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
          'Traveler';
      }
    } catch (e) {
      console.error('Failed to extract user role:', e);
      this.userRole = 'Traveler';
    }
  }

  loadUserProfile() {
    this.userSub = this.authService.userNameSubject$.subscribe({
      next: (name: string) => {
        this.userName = name || 'User';
      },
      error: (err) => console.error('Sidebar subscription error:', err)
    });

    this.authService.profilePicSubject$.subscribe(pic => {
      this.profilePic = pic || '';
    });

    const savedPic = localStorage.getItem('profilePic');
    this.profilePic = savedPic || '';
  }


  get hasProfilePic(): boolean {
    const pic = (this.profilePic || '').trim();
    if (!pic) return false;
    const lower = pic.toLowerCase();
    if (lower.includes('default-avatar') || lower.includes('profilepic.jpg') || lower === '/profilepic.jpg') {
      return false;
    }
    return true;
  }

  get userInitial(): string {
    return (this.userName || 'U').charAt(0).toUpperCase();
  }

  setupMenuItems() {
    const travelerMenu = [
      { icon: 'bi-house-door', label: 'Dashboard', route: '/traveller-dashboard', category: 'Main' },
      { icon: 'bi-map', label: 'Explore Map', route: '/map-view', category: 'Explore' },
      { icon: 'bi-images', label: 'Memories', route: '/memories-map', category: 'Memories' },
      { icon: 'bi-calendar-plus', label: 'Create Trip', route: '/createTrip', category: 'Trips' },
      { icon: 'bi-clock-history', label: 'Trip Timeline', route: '/trip-timeline', category: 'Trips' },
      { icon: 'bi-cash-stack', label: 'Budget', route: '/budget', category: 'Finance' },
      { icon: 'bi-geo-alt', label: 'Route Optimization', route: '/route-optimization', category: 'Explore' },
      { icon: 'bi-chat-dots', label: 'Community', route: '/community-map', category: 'Social' },
      { icon: 'bi-person', label: 'Profile', route: '/profile', category: 'Account' },
      { icon: 'bi-trophy', label: 'Achievements', route: '/achievements', category: 'Account' },

    ];

    const providerMenu = [
      { icon: 'bi-speedometer2', label: 'Dashboard', route: '/provider-dashboard', category: 'Main' },
      { icon: 'bi-truck', label: 'My Vehicles', route: '/register-vehicle', category: 'Fleet' },
      { icon: 'bi-calendar-check', label: 'Trip Requests', route: '/trip-summary', category: 'Trips' },
      { icon: 'bi-geo-alt', label: 'Route Optimization', route: '/route-optimization', category: 'Navigation' },
      { icon: 'bi-cash-stack', label: 'Earnings', route: '/budget-dashboard', category: 'Finance' },
      { icon: 'bi-chat-dots', label: 'Community', route: '/community-map', category: 'Social' },
      { icon: 'bi-person', label: 'Profile', route: '/profile', category: 'Account' },
      { icon: 'bi-trophy', label: 'Achievements', route: '/achievements', category: 'Account' },
      { icon: 'bi-question-circle', label: 'Help', route: '/help', category: 'Support' }
    ];

    const adminMenu = [
      { icon: 'bi-speedometer2', label: 'Dashboard', route: '/admin-dashboard', category: 'Main' },
      { icon: 'bi-people', label: 'User Management', route: '/admin-dashboard', category: 'Users' },
      { icon: 'bi-shield-check', label: 'Approvals', route: '/admin-dashboard', category: 'Moderation' },
      { icon: 'bi-graph-up', label: 'Analytics', route: '/admin-dashboard', category: 'Reports' },
      { icon: 'bi-gear', label: 'Settings', route: '/admin-dashboard', category: 'System' },
      { icon: 'bi-question-circle', label: 'Help', route: '/help', category: 'Support' }
    ];

    switch (this.userRole.toLowerCase()) {
      case 'provider':
      case 'transportprovider':
        this.menuItems = providerMenu;
        break;
      case 'admin':
      case 'administrator':
        this.menuItems = adminMenu;
        break;
      default:
        this.menuItems = travelerMenu;
    }
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
    this.isIconOpen = this.isSidebarOpen;
    this.isOpen = !this.isOpen;
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
  }

  onSearch(event: any) {
    const query = event.target.value.toLowerCase();
    this.searchQuery = query;

    if (!query) {
      this.filteredMenuItems = this.menuItems;
      return;
    }

    this.filteredMenuItems = this.menuItems.filter(item =>
      item.label.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  }

  clearSearch() {
    this.searchQuery = '';
    this.filteredMenuItems = this.menuItems;
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 768) {
      this.isSidebarOpen = false;
    }
  }

  isActive(route: string): boolean {
    return this.router.url === route || this.router.url.startsWith(route + '/');
  }

  getCategoryItems(category: string): any[] {
    return this.filteredMenuItems.filter(item => item.category === category);
  }

  getCategories(): string[] {
    const categories = [...new Set(this.filteredMenuItems.map(item => item.category))];
    return categories;
  }
}
