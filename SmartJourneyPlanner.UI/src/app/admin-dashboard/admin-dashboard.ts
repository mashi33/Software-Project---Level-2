import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  currentDate = new Date();
  adminName = '';
  view: 'stats' | 'providers' | 'memories' | 'users' | 'fleet-detailed' | 'costs' = 'stats';
  stats: any = { totalExpenditure: 0 };
  pendingProviders: any[] = [];
  allUsers: any[] = [];
  allMemories: any[] = []; 
  selectedProvider: any = null;
  allVehicles: any[] = [];
  expenses: any[] = [];
  budgetTrips: any[] = [];
  costSummary: any = {
    totalTrips: 0,
    overBudgetTrips: 0,
    onTrackTrips: 0,
    nearLimitTrips: 0
  };
  costSearch = '';
  costStatusFilter = 'all';
  costSortFilter = 'date-desc';
  selectedBudgetTrip: any = null;
  costsLoading = false;

  totalFleetCount = 0; 
  approvedSessionCount = 0;
  rejectedSessionCount = 0;

  // Memory filtering
  memorySearch = '';
  memoryStatusFilter = 'all';
  memoryDateFilter = 'all';

  // Fleet filtering
  fleetSearch = '';
  fleetStatusFilter = 'all';
  fleetTypeFilter = 'all';
  fleetBookingFilter = 'all';

  // Vehicle bookings
  allBookings: any[] = [];
  vehicleBookings: { [vehicleId: string]: any[] } = {};
  expandedVehicleBookings: { [vehicleId: string]: boolean } = {};
  bookingStatusFilter: 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled' = 'all';

  // Provider filtering
  providerSearch = '';
  providerTypeFilter = 'all';

  ngOnInit() {
  this.adminName = this.authService.getUserName() || 'Admin';
  this.loadDailyCounters(); 

  // speed loading the neccessary data
  this.adminService.getDashboardStats().subscribe({
    next: (data) => { this.stats = data; },
    error: (err) => console.error("Error loading stats:", err)
  });

  // next loading next list of data
  setTimeout(() => {
    this.fetchExpenseList();
    this.fetchPendingProviders();
    this.fetchAllUsers();
    this.fetchPlatformMemories();
  }, 200); // 0.2s late (preserve from blocking)

  this.initSignalRConnection();

  (window as any).openAdminFullImage = (url: string) => {
    this.openImage(url);
  };
}

  initSignalRConnection() {
    try {
      this.notificationService.startConnection();
      this.notificationService.addNotificationListener((notification) => {
        console.log('New notification received on Admin Dashboard:', notification);
      });
    } catch (err) {
      console.error('SignalR Init Error:', err);
    }
  }

  loadDailyCounters() {
    try {
      const todayString = new Date().toDateString();
      const savedDate = localStorage.getItem('adminDashboardDate');
      
      if (savedDate !== todayString) {
        localStorage.setItem('adminDashboardDate', todayString);
        localStorage.setItem('approvedToday', '0');
        localStorage.setItem('rejectedToday', '0');
      }

      this.approvedSessionCount = parseInt(localStorage.getItem('approvedToday') || '0', 10);
      this.rejectedSessionCount = parseInt(localStorage.getItem('rejectedToday') || '0', 10);
      
      console.log('Loaded Daily Counters - Approved:', this.approvedSessionCount, 'Rejected:', this.rejectedSessionCount);
    } catch (e) {
      console.error('Browser blocked LocalStorage:', e);
    }
  }
  
  getUserRole(user: any): string {
    return user?.userType || user?.UserType || user?.role || 'Unknown';
  }

  isUserBlocked(user: any): boolean {
    return user?.isBlocked === true || user?.IsBlocked === true;
  }

  getBlockType(user: any): string {
    return user?.blockType || user?.BlockType || '';
  }

  getBlockStatusLabel(user: any): string {
    if (!this.isUserBlocked(user)) return 'Active';

    const blockType = this.getBlockType(user);
    if (blockType === 'Permanent') return 'Permanently Blocked';

    if (blockType === 'Temporary') {
      const until = user?.blockedUntil || user?.BlockedUntil;
      if (until) {
        const date = new Date(until).toLocaleDateString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric'
        });
        return `Blocked until ${date}`;
      }
      return 'Blocked (2 weeks)';
    }

    return 'Blocked';
  }

  getBlockStatusClass(user: any): string {
    if (!this.isUserBlocked(user)) return 'status-active';

    const blockType = this.getBlockType(user);
    if (blockType === 'Permanent') return 'status-blocked-permanent';
    if (blockType === 'Temporary') return 'status-blocked-temporary';
    return 'bg-danger-subtle text-danger';
  }

  canManageBlock(user: any): boolean {
    return this.getUserRole(user) !== 'Admin';
  }

  getVehicleId(vehicle: any): string {
    return vehicle?.id || vehicle?._id || vehicle?.Id || '';
  }

  isActiveBookingStatus(status: string | undefined): boolean {
    const normalized = (status || '').toLowerCase();
    return normalized === 'pending' || normalized === 'confirmed' || normalized === 'approved';
  }

  isVehicleBooked(vehicle: any): boolean {
  const embeddedBookings = vehicle?.bookings || vehicle?.Bookings;

  if (Array.isArray(embeddedBookings) && embeddedBookings.some((b: any) => this.isActiveBookingStatus(b?.status || b?.Status))) {
    return true;
  }

  const vehicleId = this.getVehicleId(vehicle);
  if (!vehicleId) return false;

  const linkedBookings = this.vehicleBookings[vehicleId] || [];
  return linkedBookings.some((booking: any) => this.isActiveBookingStatus(booking?.status || booking?.Status));
}

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  get filteredBudgetTrips(): any[] {
    if (!this.budgetTrips || this.budgetTrips.length === 0) return [];
    
    let filtered = this.budgetTrips.filter(trip => {
      const query = this.costSearch.trim().toLowerCase();
      const tripName = (trip.tripName || trip.TripName || '').toLowerCase();
      const createdBy = (trip.createdBy || trip.CreatedBy || '').toLowerCase();
      const route = this.getTripRoute(trip).toLowerCase();
      const matchesSearch = !query || tripName.includes(query) || createdBy.includes(query) || route.includes(query);

      const status = this.getTripStatus(trip).toLowerCase();
      const filter = this.costStatusFilter.toLowerCase();
      const matchesStatus = filter === 'all' || status === filter;

      return matchesSearch && matchesStatus;
    });

    return this.sortBudgetTrips(filtered);
  }

  sortBudgetTrips(trips: any[]): any[] {
    const sortOption = this.costSortFilter;
    
    return [...trips].sort((a, b) => {
      switch (sortOption) {
        case 'date-desc':
          const dateB = new Date(b.StartDate || b.startDate || 0).getTime();
          const dateA = new Date(a.StartDate || a.startDate || 0).getTime();
          return dateB - dateA;
        case 'date-asc':
          const dateA2 = new Date(a.StartDate || a.startDate || 0).getTime();
          const dateB2 = new Date(b.StartDate || b.startDate || 0).getTime();
          return dateA2 - dateB2;
        case 'spent-desc':
          return this.getTripSpent(b) - this.getTripSpent(a);
        case 'spent-asc':
          return this.getTripSpent(a) - this.getTripSpent(b);
        case 'usage-desc':
          return this.getTripUsage(b) - this.getTripUsage(a);
        case 'usage-asc':
          return this.getTripUsage(a) - this.getTripUsage(b);
        default:
          return 0;
      }
    });
  }

  getTripSpent(trip: any): number {
    return trip.totalSpent ?? trip.TotalSpent ?? trip.spent ?? trip.Spent ?? 0;
  }

  getTripBudget(trip: any): number {
    const raw = trip.Budgetlimit ?? trip.budgetLimit ?? trip.BudgetLimit ?? trip.budgetlimit;
    if (raw === null || raw === undefined || raw === '') return 0;

    if (typeof raw === 'string' && raw.includes('-')) {
      const parts = raw.split('-').map((p: string) => parseFloat(p.trim()));
      return parts[1] || parts[0] || 0;
    }
    const parsed = parseFloat(raw);
    return isNaN(parsed) ? 0 : parsed;
  }

  getTripRoute(trip: any): string {
    if (trip.Route && trip.Route !== '—') return trip.Route;
    const from = trip.departFrom || trip.DepartFrom || '';
    const to = trip.destination || trip.Destination || '';
    if (from && to) return `${from} → ${to}`;
    return from || to || '—';
  }

  getTripDates(trip: any): string {
    const start = trip.startDate || trip.StartDate;
    const end = trip.endDate || trip.EndDate;
    if (!start) return '—';
    const startStr = new Date(start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!end) return startStr;
    const endStr = new Date(end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startStr} – ${endStr}`;
  }

  getTripRemaining(trip: any): number {
    const backendValue = trip.RemainingBudget ?? trip.remainingBudget;
    if (backendValue !== null && backendValue !== undefined) return backendValue;
    return this.getTripBudget(trip) - this.getTripSpent(trip);
  }

  getTripUsage(trip: any): number {
    return trip.UsagePercent ?? trip.usagePercent ?? 0;
  }

  getTripStatus(trip: any): string {
    const backendStatus = trip.Status ?? trip.status;
    if (backendStatus) return backendStatus;

    const budget = this.getTripBudget(trip);
    const spent = this.getTripSpent(trip);

    if (budget === 0 || budget === null || budget === undefined) {
      return 'No Limit Set';
    }
    if (spent > budget) {
      return 'Over Budget';
    }
    if (spent >= budget * 0.85) {
      return 'Near Limit';
    }
    return 'On Track';
  }

  getBudgetStatusClass(status: string): string {
    switch (status) {
      case 'Over Budget': return 'cost-status-over';
      case 'Near Limit': return 'cost-status-near';
      case 'No Limit Set': return 'cost-status-none';
      default: return 'cost-status-ok';
    }
  }

  getCategoryClass(category: string): string {
    const key = (category || 'general').toLowerCase();
    if (key.includes('meal') || key.includes('food')) return 'cat-meals';
    if (key.includes('transport')) return 'cat-transport';
    if (key.includes('stay') || key.includes('accommodation') || key.includes('lodg')) return 'cat-stay';
    if (key.includes('shop')) return 'cat-shopping';
    return 'cat-general';
  }

  viewBudgetTripDetails(trip: any) {
    this.selectedBudgetTrip = trip;
  }

  onReviewProviders() { this.view = 'providers'; this.fetchPendingProviders(); }
  onReviewMemories() { this.view = 'memories'; this.fetchPlatformMemories(); }
  onManageLogins() { this.view = 'users'; this.fetchAllUsers(); }

  refreshDashboard() {
    this.adminService.getDashboardStats().subscribe({
      next: (data) => {
        console.log("Stats Response:", data);
        this.stats = data;
      },
      error: (err) => console.error("Error loading stats:", err)
    });

    this.fetchPendingProviders();
    this.fetchAllUsers();
    this.fetchPlatformMemories();
    if (this.view === 'fleet-detailed') {
      this.fetchAllVehicles();
    }
  }

  fetchPendingProviders() { this.adminService.getPendingProviders().subscribe(data => this.pendingProviders = data); }
  fetchAllUsers() { this.adminService.getAllUsers().subscribe(data => this.allUsers = data); }

  fetchPlatformMemories() {
    this.adminService.getAllUploadedMemories().subscribe({
      next: (data) => {
        this.allMemories = data;
      },
      error: (err) => console.error("Memory Load Error:", err)
    });
  }

  refreshCurrentView() {
    Swal.fire({
      title: 'Syncing Data...',
      text: 'Please wait while we update your current view.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    switch (this.view) {
      case 'stats':
        this.refreshDashboard();
        break;
      case 'providers':
        this.fetchPendingProviders();
        break;
      case 'memories':
        this.fetchPlatformMemories();
        break;
      case 'users':
        this.fetchAllUsers();
        break;
      case 'fleet-detailed':
        this.fetchAllVehicles();
        break;
      case 'costs':
        this.fetchExpenseList();
        break;
    }

    setTimeout(() => {
      Swal.fire({
        icon: 'success',
        title: 'Sync Successful!',
        text: 'Your current view is up to date.',
        timer: 1500,
        showConfirmButton: false
      });
    }, 1000); 
  }

  confirmApproval(provider: any) {
    Swal.fire({
      title: 'Approve Fleet Item?',
      text: `Verify ${provider.vehicleClass}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      target: document.querySelector('.modal-card') as HTMLElement || document.body 
    }).then(res => { if (res.isConfirmed) this.updateStatus(provider, 'Approved'); });
  }

  confirmReject(provider: any) {
    Swal.fire({
      title: 'Reject Request?',
      text: `Decline ${provider.vehicleClass}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      target: document.querySelector('.modal-card') as HTMLElement || document.body 
    }).then(res => { if (res.isConfirmed) this.updateStatus(provider, 'Rejected'); });
  }

  updateStatus(provider: any, status: string) {
    const id = provider._id || provider.id;
    const currentStatus = (provider.adminVerificationStatus || provider.AdminVerificationStatus || '').toLowerCase();

    this.adminService.updateProviderStatus(id, status).subscribe(() => {
      this.selectedProvider = null;

      if (status === 'Approved' && currentStatus !== 'approved') {
        this.approvedSessionCount++;
        localStorage.setItem('approvedToday', this.approvedSessionCount.toString());
      } else if (status === 'Rejected' && currentStatus !== 'rejected') {
        this.rejectedSessionCount++;
        localStorage.setItem('rejectedToday', this.rejectedSessionCount.toString());

        const vehicleBookings = this.getVehicleBookings(id);
        const activeBookings = vehicleBookings.filter((booking: any) => {
          const bookingDate = new Date(booking.bookingDate || booking.date);
          const today = new Date();
          return bookingDate > today && (booking.status === 'Confirmed' || booking.status === 'confirmed');
        });

        if (activeBookings.length > 0) {
          const vehicleName = provider.vehicleName || provider.vehicle?.name || provider.model || 'Vehicle';
          const message = `The vehicle "${vehicleName}" you booked is currently in a service period. Your booking has been automatically cancelled.`;

          activeBookings.forEach((booking: any) => {
            const customerId = booking.customerId || booking.userId || booking.user?._id;
            const bookingId = booking._id || booking.id;
            if (customerId) {
              this.adminService.sendCustomerAlert(customerId, message, vehicleName, bookingId).subscribe({
                next: () => console.log('Alert sent to customer:', customerId),
                error: (err) => console.error('Failed to send alert:', err)
              });
            }

            if (bookingId) {
              this.adminService.cancelBooking(bookingId).subscribe({
                next: () => console.log('Booking cancelled:', bookingId),
                error: (err) => console.error('Failed to cancel booking:', err)
              });
            }
          });
        }
      }

      this.refreshDashboard();
      Swal.fire('Success', `Vehicle ${status}`, 'success');
    });
  }

  fetchAllVehicles() {
  this.adminService.getAllVehiclesDetailed().subscribe({
    next: (res: any) => {
      this.allVehicles = res.vehicles || []; 
      this.totalFleetCount = res.totalCount || 0;

      if (this.view === 'fleet-detailed') {
        this.fetchAllBookings();
      }
      this.cd.detectChanges();
    },
    error: (err) => {
      console.error('Error loading detailed vehicles:', err);
      this.allVehicles = [];
      this.cd.detectChanges();
    }
  });
}

  fetchAllBookings() {
    this.adminService.getAllBookings().subscribe({
      next: (data: any) => {
        this.allBookings = data || [];
        this.organizeBookingsByVehicle();
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Error loading fleet bookings:', err);
        this.allBookings = [];
        this.vehicleBookings = {};
        this.cd.detectChanges();
      }
    });
  }

  organizeBookingsByVehicle() {
    this.vehicleBookings = {};
    this.allBookings.forEach((booking: any) => {
      const vehicleId = booking.vehicleId || booking.VehicleId || booking.vehicle?.id || booking.vehicle?._id;
      if (vehicleId) {
        if (!this.vehicleBookings[vehicleId]) {
          this.vehicleBookings[vehicleId] = [];
        }
        this.vehicleBookings[vehicleId].push(booking);
      }
    });
  }

  toggleVehicleBookings(vehicleId: string) {
    this.expandedVehicleBookings[vehicleId] = !this.expandedVehicleBookings[vehicleId];
  }

  getVehicleBookings(vehicleId: string): any[] {
    return this.vehicleBookings[vehicleId] || [];
  }

  isVehicleBookingsExpanded(vehicleId: string): boolean {
    return this.expandedVehicleBookings[vehicleId] || false;
  }

  getBookingStatusClass(status: string): string {
    const statusLower = (status || '').toLowerCase();
    if (statusLower === 'confirmed' || statusLower === 'active') return 'status-confirmed';
    if (statusLower === 'pending') return 'status-pending';
    if (statusLower === 'cancelled' || statusLower === 'canceled') return 'status-cancelled';
    if (statusLower === 'completed') return 'status-completed';
    return 'status-unknown';
  }

  getBookingDuration(booking: any): number {
    const startDate = new Date(booking.startDate || booking.pickupDate || booking.bookingDate);
    const endDate = new Date(booking.endDate || booking.dropoffDate);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  }

  getBookingsByStatus(vehicleId: string, status: string): any[] {
    const bookings = this.vehicleBookings[vehicleId] || [];
    return bookings.filter((booking: any) => {
      const bookingStatus = (booking.status || booking.Status || '').toLowerCase();
      return bookingStatus === status.toLowerCase();
    });
  }

  getFilteredBookings(vehicleId: string): any[] {
    const bookings = this.vehicleBookings[vehicleId] || [];
    if (this.bookingStatusFilter === 'all') {
      return bookings;
    }
    return this.getBookingsByStatus(vehicleId, this.bookingStatusFilter);
  }

  viewBookingDetails(booking: any): void {
    Swal.fire({
      title: 'Booking Details',
      html: `
        <div style="text-align: left; font-family: inherit;">
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
            <strong style="color: #1e293b;">Booking ID:</strong> ${booking._id || booking.id || 'N/A'}
          </div>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
            <strong style="color: #1e293b;">Status:</strong> ${booking.status || booking.Status || 'Pending'}
          </div>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
            <strong style="color: #1e293b;">Customer:</strong> ${booking.customerName || booking.userName || booking.user?.name || 'Unknown'}
          </div>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
            <strong style="color: #1e293b;">User ID:</strong> ${booking.customerId || booking.userId || booking.user?._id || 'N/A'}
          </div>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
            <strong style="color: #1e293b;">Start Date:</strong> ${new Date(booking.startDate || booking.pickupDate || booking.bookingDate).toLocaleDateString()}
          </div>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
            <strong style="color: #1e293b;">End Date:</strong> ${new Date(booking.endDate || booking.dropoffDate).toLocaleDateString()}
          </div>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
            <strong style="color: #1e293b;">Total Amount:</strong> Rs. ${booking.totalAmount || booking.amount || 0}
          </div>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
            <strong style="color: #1e293b;">Location:</strong> ${booking.pickupAddress || booking.location || booking.destination || 'Not specified'}
          </div>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
            <strong style="color: #1e293b;">Duration:</strong> ${this.getBookingDuration(booking)} days
          </div>
        </div>
      `,
      width: '500px',
      confirmButtonColor: '#3b82f6',
      confirmButtonText: 'Close'
    });
  }

  openVehicleBookingsModal(vehicle: any): void {
    const vehicleId = this.getVehicleId(vehicle);
    const bookings = this.vehicleBookings[vehicleId] || [];
    const vehicleName = vehicle.vehicleClass || vehicle.VehicleClass || vehicle.modelName || vehicle.ModelName || 'Vehicle';

    if (bookings.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No Bookings',
        text: 'This vehicle has no bookings.',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    const generateBookingCards = (filter: string) => {
      let filteredBookings = bookings;
      if (filter !== 'all') {
        filteredBookings = bookings.filter((b: any) => (b.status || b.Status || '').toLowerCase() === filter);
      }

      if (filteredBookings.length === 0) {
        return '<div style="text-align: center; padding: 20px; color: #6b7280;">No bookings found for this filter.</div>';
      }

      return filteredBookings.map((booking: any) => {
        const status = booking.status || booking.Status || 'Pending';
        const statusClass = this.getBookingStatusClass(status);
        const statusColor = statusClass === 'status-confirmed' ? '#166534' :
                            statusClass === 'status-pending' ? '#92400e' :
                            statusClass === 'status-cancelled' ? '#991b1b' :
                            statusClass === 'status-completed' ? '#1e40af' : '#4b5563';
        const statusBg = statusClass === 'status-confirmed' ? '#dcfce7' :
                        statusClass === 'status-pending' ? '#fef3c7' :
                        statusClass === 'status-cancelled' ? '#fee2e2' :
                        statusClass === 'status-completed' ? '#dbeafe' : '#f3f4f6';

        return `
          <div class="modal-booking-card" onclick="window.viewBookingDetails('${encodeURIComponent(JSON.stringify(booking))}')" style="cursor: pointer; background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 12px; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;">
              <div style="padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusColor};">
                ${status}
              </div>
              <small style="color: #6b7280; font-weight: 500;">ID: ${booking._id || booking.id || 'N/A'}</small>
            </div>
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding: 12px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 10px; border: 1px solid #bae6fd;">
              <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; flex-shrink: 0;">👤</div>
              <div style="flex: 1;">
                <div style="font-weight: 700; color: #1e293b; font-size: 0.95rem;">${booking.customerName || booking.userName || booking.user?.name || 'Unknown User'}</div>
                <div style="font-size: 0.75rem; color: #6b7280; font-weight: 500;">User ID: ${booking.customerId || booking.userId || booking.user?._id || 'N/A'}</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding: 12px; background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-radius: 10px; border: 1px solid #e9d5ff;">
              <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.9rem; flex-shrink: 0;">📅</div>
                <div>
                  <div style="font-size: 0.7rem; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Start Date</div>
                  <div style="font-size: 0.85rem; color: #1e293b; font-weight: 600;">${new Date(booking.startDate || booking.pickupDate || booking.bookingDate).toLocaleDateString()}</div>
                </div>
              </div>
              <div style="color: #8b5cf6; font-size: 1.1rem; margin: 0 8px;">→</div>
              <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.9rem; flex-shrink: 0;">📅</div>
                <div>
                  <div style="font-size: 0.7rem; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">End Date</div>
                  <div style="font-size: 0.85rem; color: #1e293b; font-weight: 600;">${new Date(booking.endDate || booking.dropoffDate).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px 20px; background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 20px; border: 1px solid #86efac; font-weight: 700; color: #166534; font-size: 1rem; margin-bottom: 12px;">
              <i class="bi bi-calendar-check fs-5 text-primary"></i> Rs. ${booking.totalAmount || booking.amount || 0}
            </div>
            <div style="display: flex; justify-content: space-between; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #6b7280; padding: 6px 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb; flex: 1;">
                <i class="bi bi-stopwatch text-muted"></i> Duration: ${this.getBookingDuration(booking)} days
              </div>
              <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #6b7280; padding: 6px 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb; flex: 1;">
                <i class="bi bi-geo-alt text-danger"></i> ${booking.pickupAddress || booking.location || booking.destination || 'Not specified'}
              </div>
            </div>
          </div>
        `;
      }).join('');
    };

    // Store current filter on window for the modal
    (window as any).currentBookingFilter = 'all';
    (window as any).currentVehicleId = vehicleId;
    (window as any).allBookings = bookings;
    (window as any).viewBookingDetails = (bookingStr: string) => {
      const booking = JSON.parse(decodeURIComponent(bookingStr));
      this.viewBookingDetails(booking);
    };

    const getBtnStyle = (filterName: string, currentFilter: string) => {
      const isActive = currentFilter === filterName;
      return `padding: 6px 8px; border: 1px solid #e5e7eb; border-radius: 16px; background: ${isActive ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#ffffff'}; color: ${isActive ? 'white' : '#6b7280'}; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; flex: 1; text-align: center; white-space: nowrap;`;
    };

    const updateModalContent = () => {
      const filter = (window as any).currentBookingFilter || 'all';
      const content = generateBookingCards(filter);
      Swal.update({
        html: `
          <div style="text-align: left; font-family: inherit;">
            <div style="display: flex; gap: 4px; margin-bottom: 16px; justify-content: space-between; align-items: center;">
              <button onclick="window.setFilter('all')" class="modal-filter-tab" style="${getBtnStyle('all', filter)}">All (${bookings.length})</button>
              <button onclick="window.setFilter('pending')" class="modal-filter-tab" style="${getBtnStyle('pending', filter)}">Pend (${this.getBookingsByStatus(vehicleId, 'pending').length})</button>
              <button onclick="window.setFilter('confirmed')" class="modal-filter-tab" style="${getBtnStyle('confirmed', filter)}">Conf (${this.getBookingsByStatus(vehicleId, 'confirmed').length})</button>
              <button onclick="window.setFilter('completed')" class="modal-filter-tab" style="${getBtnStyle('completed', filter)}">Comp (${this.getBookingsByStatus(vehicleId, 'completed').length})</button>
              <button onclick="window.setFilter('cancelled')" class="modal-filter-tab" style="${getBtnStyle('cancelled', filter)}">Canc (${this.getBookingsByStatus(vehicleId, 'cancelled').length})</button>
              <button onclick="window.setFilter('rejected')" class="modal-filter-tab" style="${getBtnStyle('rejected', filter)}">Rej (${this.getBookingsByStatus(vehicleId, 'rejected').length})</button>
            </div>
            <div style="max-height: 400px; overflow-y: auto; padding-right: 8px;">
              ${content}
            </div>
          </div>
        `
      });
    };

    (window as any).setFilter = (newFilter: string) => {
      (window as any).currentBookingFilter = newFilter;
      updateModalContent();
    };

    Swal.fire({
      title: `Bookings`,
      html: `
        <div style="text-align: left; font-family: inherit;">
          <div style="display: flex; gap: 4px; margin-bottom: 16px; justify-content: space-between; align-items: center;">
            <button onclick="window.setFilter('all')" class="modal-filter-tab" style="${getBtnStyle('all', 'all')}">All (${bookings.length})</button>
            <button onclick="window.setFilter('pending')" class="modal-filter-tab" style="${getBtnStyle('pending', 'all')}">Pend (${this.getBookingsByStatus(vehicleId, 'pending').length})</button>
            <button onclick="window.setFilter('confirmed')" class="modal-filter-tab" style="${getBtnStyle('confirmed', 'all')}">Conf (${this.getBookingsByStatus(vehicleId, 'confirmed').length})</button>
            <button onclick="window.setFilter('completed')" class="modal-filter-tab" style="${getBtnStyle('completed', 'all')}">Comp (${this.getBookingsByStatus(vehicleId, 'completed').length})</button>
            <button onclick="window.setFilter('cancelled')" class="modal-filter-tab" style="${getBtnStyle('cancelled', 'all')}">Canc (${this.getBookingsByStatus(vehicleId, 'cancelled').length})</button>
            <button onclick="window.setFilter('rejected')" class="modal-filter-tab" style="${getBtnStyle('rejected', 'all')}">Rej (${this.getBookingsByStatus(vehicleId, 'rejected').length})</button>
          </div>
          <div style="max-height: 400px; overflow-y: auto; padding-right: 8px;">
            ${generateBookingCards('all')}
          </div>
        </div>
      `,
      width: '740px',
      confirmButtonColor: '#3b82f6',
      confirmButtonText: 'Close',
      didOpen: () => {
        const style = document.createElement('style');
        style.textContent = `
          .modal-filter-tab:hover {
            background: #f8fafc !important;
            border-color: #3b82f6 !important;
            color: #3b82f6 !important;
          }
          .modal-booking-card:hover {
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1) !important;
            border-color: #3b82f6 !important;
            transform: translateY(-2px) !important;
          }
        `;
        document.head.appendChild(style);
      }
    }).then(() => {
      // Cleanup window functions when modal closes
      delete (window as any).currentBookingFilter;
      delete (window as any).currentVehicleId;
      delete (window as any).allBookings;
      delete (window as any).setFilter;
      delete (window as any).viewBookingDetails;
    });
  }

  fetchExpenseList() {
    this.costsLoading = true;
    this.adminService.getBudgetDetails().subscribe({
      next: (data: any) => {
        const rawTrips = data?.trips || data?.Trips || data || [];

        this.budgetTrips = rawTrips.map((t: any) => ({
          TripName: t.TripName ?? t.tripname ?? t.tripName ?? 'Untitled Trip',
          Budgetlimit: t.budgetLimit ?? t.BudgetLimit ?? t.Budgetlimit ?? t.budgetlimit ?? 0,
          TotalSpent: t.totalSpent ?? t.TotalSpent ?? t.totalspent ?? 0,
          Route: t.Route ?? t.route ?? (t.departFrom ? `${t.departFrom} → ${t.destination}` : '—'),
          StartDate: t.StartDate ?? t.startDate,
          EndDate: t.EndDate ?? t.endDate,
          CreatedBy: t.CreatedBy ?? t.createdBy,
          ExpenseCount: t.expenseCount ?? t.ExpenseCount ?? 0,
          RemainingBudget: t.remainingBudget ?? t.RemainingBudget ?? null,
          UsagePercent: t.usagePercent ?? t.UsagePercent ?? 0,
          Status: t.status ?? t.Status ?? null,
          expenses: t.expenses ?? t.Expenses ?? []
        }));

        this.expenses = [...this.budgetTrips];
        this.costSummary = this.calculateCostSummary();
        this.costsLoading = false;
      },
      error: (err) => {
        console.error('Error loading budget details:', err);
        this.costsLoading = false;
      }
    });
  }

  calculateCostSummary() {
    let overBudget = 0;
    let onTrack = 0;
    let nearLimit = 0;

    this.budgetTrips.forEach((trip) => {
      const status = this.getTripStatus(trip);

      if (status === 'Over Budget') {
        overBudget++;
      } else if (status === 'Near Limit') {
        nearLimit++;
      } else if (status === 'On Track') {
        onTrack++;
      }
    });

    return {
      totalTrips: this.budgetTrips.length,
      overBudgetTrips: overBudget,
      onTrackTrips: onTrack,
      nearLimitTrips: nearLimit
    };
  }

  onReviewFleet() { 
    this.view = 'fleet-detailed'; 
    this.fetchAllVehicles(); 
  }

  deleteMemory(id: string) {
    this.adminService.deleteMemoryPost(id).subscribe({
      next: () => {
        this.refreshDashboard();
        Swal.fire('Deleted!', 'Memory post has been removed.', 'success');
      },
      error: (err) => {
        console.error("Delete Error:", err); 
      }
    });
  }

  isLoadingDetails = false;

  viewVehicleDetails(vehicle: any) {
    if (this.selectedProvider || this.isLoadingDetails) {
      return;
    }

    const vehicleId = vehicle.id || vehicle._id || vehicle.Id;
    if (!vehicleId) {
      this.selectedProvider = vehicle;
      return;
    }

    this.selectedProvider = vehicle; 
    this.isLoadingDetails = true;

    this.adminService.getVehicleById(vehicleId).subscribe({
      next: (fullVehicleDetails: any) => {
        this.isLoadingDetails = false;
        if (fullVehicleDetails) {
          this.selectedProvider = fullVehicleDetails; 
        }
        this.cd.detectChanges();
      },
      error: (err: any) => {
        this.isLoadingDetails = false;
        console.error('Error fetching vehicle details:', err);
        this.cd.detectChanges();
      }
    });
  }

  closeReview() {
    this.selectedProvider = null; 
    this.isLoadingDetails = false;
    setTimeout(() => {
      this.cd.detectChanges();
    }, 50);
  }

  viewMemoryDetails(m: any) {
    const imageUrl = m.imageUrl || 'assets/placeholder-travel.jpg';
    const status = (this.getMemoryStatus ? this.getMemoryStatus(m) : m.status || 'Pending').toLowerCase();
    const dateAdded = this.getMemoryUploadDate ? this.getMemoryUploadDate(m) : (m.createdAt ? new Date(m.createdAt).toLocaleDateString() : 'Unknown Date');
    const tripName = m.tripName || m.tripId || 'Standalone Memory';
    const description = m.description || 'No caption or description was provided for this memory.';
    const displayId = m.userId || 'No ID available';
    const badgeClass = status === 'approved' ? 'badge-approved' : status === 'flagged' ? 'badge-flagged' : 'badge-pending';

    Swal.fire({
      width: '650px',
      padding: '0', 
      showCloseButton: true,
      showConfirmButton: status !== 'approved',
      confirmButtonText: '<i class="bi bi-check-lg"></i> Approve',
      confirmButtonColor: '#10b981',
      showDenyButton: status !== 'flagged',
      denyButtonText: '<i class="bi bi-flag"></i> Flag',
      denyButtonColor: '#ef4444',
      showCancelButton: true,
      cancelButtonText: 'Close',
      cancelButtonColor: '#64748b',
      customClass: { popup: 'memory-detail-swal', actions: 'memory-swal-actions' },
      html: `
        <div class="memory-swal-header" style="cursor: zoom-in;" onclick="window.openAdminFullImage('${imageUrl}')">
          <img src="${imageUrl}" class="memory-swal-img">
          <div class="expand-hint"><i class="bi bi-arrows-fullscreen"></i></div>
          
          <div class="memory-swal-overlay">
            <span class="memory-swal-status ${badgeClass}">${status}</span>
            <h2 class="memory-swal-title">${m.title || 'Untitled Memory'}</h2>
          </div>
        </div>
        
        <div class="memory-swal-body">
          
          <div class="memory-swal-grid">
            
            <div class="memory-swal-info" style="grid-column: span 2;">
              <span class="info-label"><i class="bi bi-geo-alt"></i> Captured Location</span>
              <span class="info-val">${m.locationName || m.location || 'Location Not Specified'}</span>
            </div>
            
            <div class="memory-swal-info" style="grid-column: span 2;">
              <span class="info-label"><i class="bi bi-map"></i> Associated Trip</span>
              <span class="info-val" style="color: #2563eb;">${tripName}</span>
            </div>

            <div class="memory-swal-info">
              <span class="info-label"><i class="bi bi-person"></i> Uploaded By</span>
              <span class="info-val">${m.fullName || m.userName || 'Unknown Traveler'}</span>
              <span class="info-email" style="display:block; margin-top:4px; font-size:0.85rem; color:#64748b;">ID: ${displayId}</span>
            </div>
            
            <div class="memory-swal-info">
              <span class="info-label"><i class="bi bi-calendar-event"></i> Date Added</span>
              <span class="info-val">${dateAdded}</span>
            </div>
          </div>
          
          <div class="memory-swal-desc" style="margin: 20px 0 0 0;">
            <i class="bi bi-quote" style="font-size: 1.5rem; color: #94a3b8; display: block; margin-bottom: 4px;"></i>
            ${description}
          </div>

        </div>
      `
    }).then((result) => {
      if (result.isConfirmed) this.setMemoryStatus(m, 'Approved');
      else if (result.isDenied) this.setMemoryStatus(m, 'Flagged');
    });
  }

  confirmMemoryApproval(memory: any) {
    Swal.fire({
      title: 'Approve this memory?',
      text: `Publish "${memory.title || 'this memory'}" as approved content?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981'
    }).then(res => { if (res.isConfirmed) this.setMemoryStatus(memory, 'Approved'); });
  }

  confirmMemoryFlag(memory: any) {
    Swal.fire({
      title: 'Flag this memory?',
      text: `Flag "${memory.title || 'this memory'}" for review or removal?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444'
    }).then(res => { if (res.isConfirmed) this.setMemoryStatus(memory, 'Flagged'); });
  }

  setMemoryStatus(memory: any, status: string) {
    const id = memory.id || memory._id;
    this.adminService.updateMemoryStatus(id, status).subscribe({
      next: () => {
        this.fetchPlatformMemories();
        
        this.cd.detectChanges(); 

        Swal.fire('Updated', `Memory marked as ${status}.`, 'success');
      },
      error: () => Swal.fire('Error', 'Could not update memory status.', 'error')
    });
  }

  viewExpenditureDetails() {
    this.view = 'costs';
    this.fetchExpenseList();
  }

  changeRole(id: string, role: string) {
    Swal.fire({
      title: 'Update user role?',
      text: `Promote this account to ${role}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb'
    }).then(res => {
      if (res.isConfirmed) {
        this.adminService.updateUserRole(id, role).subscribe(() => {
          this.refreshDashboard();
          Swal.fire('Updated', 'User role changed successfully.', 'success');
        });
      }
    });
  }

  blockUserTemporary(user: any) {
    const id = user.id || user._id;
    Swal.fire({
      title: 'Block for 2 weeks?',
      text: 'This user will be suspended for 14 days and automatically unblocked afterward.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      confirmButtonText: 'Block 2 Weeks'
    }).then(res => {
      if (res.isConfirmed) {
        this.adminService.blockUser(id, 'Temporary').subscribe({
          next: () => {
            this.fetchAllUsers();
            Swal.fire('Blocked', 'User suspended for 2 weeks.', 'success');
          },
          error: (err) => Swal.fire('Error', err.error?.message || 'Could not block user.', 'error')
        });
      }
    });
  }

  blockUserPermanent(user: any) {
    const id = user.id || user._id;
    Swal.fire({
      title: 'Permanently block user?',
      text: 'This account will stay suspended until you manually unblock it.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Block Permanently'
    }).then(res => {
      if (res.isConfirmed) {
        this.adminService.blockUser(id, 'Permanent').subscribe({
          next: () => {
            this.fetchAllUsers();
            Swal.fire('Blocked', 'User permanently suspended.', 'success');
          },
          error: (err) => Swal.fire('Error', err.error?.message || 'Could not block user.', 'error')
        });
      }
    });
  }

  unblockUserAccount(user: any) {
    const id = user.id || user._id;
    Swal.fire({
      title: 'Unblock user?',
      text: 'This will restore full access to the account immediately.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      confirmButtonText: 'Unblock'
    }).then(res => {
      if (res.isConfirmed) {
        this.adminService.unblockUser(id).subscribe({
          next: () => {
            this.fetchAllUsers();
            Swal.fire('Unblocked', 'User access has been restored.', 'success');
          },
          error: (err) => Swal.fire('Error', err.error?.message || 'Could not unblock user.', 'error')
        });
      }
    });
  }

  deleteUser(id: string) {
    Swal.fire({
      title: 'Delete user?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444'
    }).then(res => {
      if (res.isConfirmed) {
        this.adminService.deleteUser(id).subscribe(() => {
          this.refreshDashboard();
          Swal.fire('Deleted', 'User removed from the platform.', 'success');
        });
      }
    });
  }
  
  openImage(base64Data: string | undefined) {
    if (!base64Data) {
      Swal.fire({ title: 'Error', text: 'Image not found!', icon: 'error' });
      return;
    }
    
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(`
        <html>
          <body style="margin:0; display:flex; justify-content:center; align-items:center; height:100vh; background:#333;">
            <img src="${base64Data}" style="max-width:100%; max-height:100vh; border: 5px solid #fff;">
          </body>
        </html>
      `);
    } else {
      Swal.fire('Error', 'Please allow pop-ups in your browser!', 'error');
    }
  }

  compareDocuments(url1: string, url2: string, title1: string, title2: string) {
    const safeUrl1 = url1 || 'assets/placeholder-document.jpg';
    const safeUrl2 = url2 || 'assets/placeholder-document.jpg';

    Swal.fire({
      title: 'Document Cross-Check',
      width: '85vw',
      padding: '2em',
      html: `
        <div class="compare-modal-flex">
          <div class="compare-modal-col">
            <h4 class="compare-modal-title">${title1}</h4>
            <img src="${safeUrl1}" class="compare-modal-img">
          </div>
          <div class="compare-modal-col">
            <h4 class="compare-modal-title">${title2}</h4>
            <img src="${safeUrl2}" class="compare-modal-img">
          </div>
        </div>
      `,
      showCloseButton: true,
      focusConfirm: false,
      confirmButtonText: 'Done Comparing',
      confirmButtonColor: '#3b82f6'
    });
  }

  get filteredMemories(): any[] {
    if (!this.allMemories || this.allMemories.length === 0) return [];
    
    return this.allMemories.filter(memory => {
      const query = this.memorySearch.trim().toLowerCase();
      const title = (memory.title || '').toLowerCase();
      const user = (memory.fullName || '').toLowerCase();
      const location = (memory.locationName || '').toLowerCase();
      const matchesSearch = !query || title.includes(query) || user.includes(query) || location.includes(query);

      const status = this.getMemoryStatus(memory).toLowerCase();
      const filter = this.memoryStatusFilter.toLowerCase();
      const matchesStatus = filter === 'all' || status === filter;

      const matchesDate = this.matchesDateFilter(memory);

      return matchesSearch && matchesStatus && matchesDate;
    });
  }

  getMemoryStatus(memory: any): string {
    const status = memory.status || memory.moderationStatus || 'pending';
    return status.toString().toLowerCase();
  }

  getMemoryStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'approved': return 'badge-approved';
      case 'flagged': return 'badge-flagged';
      case 'pending': return 'badge-pending';
      default: return 'badge-pending';
    }
  }

  getMemoryStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'approved': return 'bi-check-circle-fill';
      case 'flagged': return 'bi-exclamation-triangle-fill';
      case 'pending': return 'bi-clock-fill';
      default: return 'bi-clock-fill';
    }
  }

  getMemoryUploadDate(memory: any): string {
    const date = memory.uploadDate || memory.createdAt || memory.created_at;
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  getMemoriesByStatus(status: string): any[] {
    if (!this.allMemories) return [];
    return this.allMemories.filter(m => this.getMemoryStatus(m) === status.toLowerCase());
  }

  matchesDateFilter(memory: any): boolean {
    if (this.memoryDateFilter === 'all') return true;
    
    const date = memory.uploadDate || memory.createdAt || memory.created_at;
    if (!date) return false;
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return false;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (this.memoryDateFilter === 'today') {
      return d >= today;
    }
    
    if (this.memoryDateFilter === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    }
    
    if (this.memoryDateFilter === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return d >= monthAgo;
    }
    
    return true;
  }

  get filteredVehicles(): any[] {
    if (!this.allVehicles || this.allVehicles.length === 0) return [];
    
    return this.allVehicles.filter(vehicle => {
      const query = this.fleetSearch.trim().toLowerCase();
      const vehicleClass = (vehicle.vehicleClass || vehicle.VehicleClass || '').toLowerCase();
      const modelName = (vehicle.modelName || vehicle.ModelName || '').toLowerCase();
      const provider = (vehicle.providerProfile?.name || vehicle.ProviderProfile?.Name || '').toLowerCase();
      const location = (vehicle.providerProfile?.location || vehicle.ProviderProfile?.Location || '').toLowerCase();
      const matchesSearch = !query || vehicleClass.includes(query) || modelName.includes(query) || provider.includes(query) || location.includes(query);

      const adminStatus = (vehicle.adminVerificationStatus || vehicle.AdminVerificationStatus || '').toLowerCase();
      const statusFilter = this.fleetStatusFilter.toLowerCase();
      const matchesStatus = statusFilter === 'all' || adminStatus === statusFilter;

      const typeFilter = this.fleetTypeFilter.toLowerCase();
      const matchesType = typeFilter === 'all' || vehicleClass.includes(typeFilter);

      const isBooked = this.isVehicleBooked(vehicle);
      const isAvailable = vehicle.isAvailableForBooking === true || vehicle.IsAvailableForBooking === true;

      const bookingFilter = this.fleetBookingFilter.toLowerCase();
      const matchesBooking = bookingFilter === 'all' || 
        (bookingFilter === 'available' && !isBooked && isAvailable) || 
        (bookingFilter === 'booked' && isBooked);

      return matchesSearch && matchesStatus && matchesType && matchesBooking;
    });
  }

  getVehiclesByStatus(status: string): any[] {
    if (!this.allVehicles) return [];
    const target = status.toLowerCase();
    return this.allVehicles.filter(v => {
      const vStatus = (v.adminVerificationStatus || v.AdminVerificationStatus || '').toLowerCase();
      if (target === 'pending') {
        return vStatus === 'pending' || vStatus === 'pending approval';
      }
      return vStatus === target;
    });
  }

  getBookedVehiclesCount(): number {
    if (!this.allVehicles) return 0;
    return this.allVehicles.filter(v => this.isVehicleBooked(v)).length;
  }

  getTotalBookingCounts(): { approved: number; pending: number; rejected: number } {
    let approved = 0;
    let pending = 0;
    let rejected = 0;

    if (this.allBookings && this.allBookings.length > 0 && this.allVehicles && this.allVehicles.length > 0) {
      const vehicleIds = new Set(this.allVehicles.map(v => this.getVehicleId(v)).filter(Boolean));
      
      this.allBookings.forEach((booking: any) => {
        const vehicleId = booking.vehicleId || booking.VehicleId || booking.vehicle?._id;
        if (vehicleId && vehicleIds.has(vehicleId)) {
          const status = (booking.status || booking.Status)?.toLowerCase();
          if (status === 'confirmed' || status === 'approved') {
            approved++;
          } else if (status === 'pending') {
            pending++;
          } else if (status === 'rejected' || status === 'cancelled') {
            rejected++;
          }
        }
      });
    }

    return { approved, pending, rejected };
  }

  getFleetStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved': return 'fleet-status-approved';
      case 'pending': return 'fleet-status-pending';
      case 'rejected': return 'fleet-status-rejected';
      case 'unavailable': return 'fleet-status-unavailable';
      default: return 'fleet-status-default';
    }
  }

  getVehicleTypeClass(type: string): string {
    const t = (type || '').toLowerCase();
    if (t.includes('car')) return 'vehicle-type-car';
    if (t.includes('van')) return 'vehicle-type-van';
    if (t.includes('bus')) return 'vehicle-type-bus';
    if (t.includes('suv')) return 'vehicle-type-suv';
    return 'vehicle-type-default';
  }

  hasDocument(vehicle: any, docType: string): boolean {
    switch (docType) {
      case 'license': return !!(vehicle.driverLicenseUrl || vehicle.DriverLicenseUrl);
      case 'nic': return !!(vehicle.driverNicUrl || vehicle.DriverNicUrl);
      case 'revenue': return !!(vehicle.revenueLicenseUrl || vehicle.RevenueLicenseUrl);
      case 'insurance': return !!(vehicle.insuranceDocumentUrl || vehicle.InsuranceDocumentUrl);
      case 'registration': return !!(
        vehicle.certificateOfRegistrationUrl || 
        vehicle.CertificateOfRegistrationUrl || 
        vehicle.registrationCertificateUrl || 
        vehicle.RegistrationCertificateUrl ||
        vehicle.registrationUrl ||
        vehicle.RegistrationUrl
      );
      default: return false;
    }
  }

  get filteredProviders(): any[] {
    if (!this.pendingProviders || this.pendingProviders.length === 0) return [];
    
    return this.pendingProviders.filter(provider => {
      const query = this.providerSearch.trim().toLowerCase();
      const providerName = (provider.providerProfile?.name || '').toLowerCase();
      const vehicleClass = (provider.vehicleClass || provider.VehicleClass || '').toLowerCase();
      const location = (provider.location || provider.providerProfile?.location || '').toLowerCase();
      const matchesSearch = !query || providerName.includes(query) || vehicleClass.includes(query) || location.includes(query);

      const typeFilter = this.providerTypeFilter.toLowerCase();
      const matchesType = typeFilter === 'all' || vehicleClass.includes(typeFilter);

      return matchesSearch && matchesType;
    });
  }

  getSubmissionDate(provider: any): string {
    const date = provider.submittedAt || provider.createdAt || provider.created_at;
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
