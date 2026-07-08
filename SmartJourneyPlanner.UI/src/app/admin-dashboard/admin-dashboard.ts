import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { AuthService } from '../services/auth.service';
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

  // Memory filtering
  memorySearch = '';
  memoryStatusFilter = 'all';
  memoryDateFilter = 'all';

  // Fleet filtering
  fleetSearch = '';
  fleetStatusFilter = 'all';
  fleetTypeFilter = 'all';
  fleetBookingFilter = 'all';

  // Provider filtering
  providerSearch = '';
  providerTypeFilter = 'all';

  ngOnInit() {
    this.adminName = this.authService.getUserName() || 'Admin';
    this.refreshDashboard();
    this.fetchExpenseList();
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

  isVehicleBooked(vehicle: any): boolean {
    const dates = vehicle?.bookedDates || vehicle?.BookedDates;
    return Array.isArray(dates) && dates.length > 0;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  get filteredBudgetTrips(): any[] {
    return this.budgetTrips.filter(trip => {
      const query = this.costSearch.trim().toLowerCase();
      const tripName = (trip.tripName || trip.TripName || '').toLowerCase();
      const createdBy = (trip.createdBy || trip.CreatedBy || '').toLowerCase();
      const route = this.getTripRoute(trip).toLowerCase();
      const matchesSearch = !query || tripName.includes(query) || createdBy.includes(query) || route.includes(query);

      const status = (trip.status || trip.Status || '').toLowerCase();
      const filter = this.costStatusFilter.toLowerCase();
      const matchesStatus = filter === 'all' || status === filter;

      return matchesSearch && matchesStatus;
    });
  }

  getTripSpent(trip: any): number {
    return trip.totalSpent ?? trip.TotalSpent ?? 0;
  }

  getTripBudget(trip: any): number {
    return trip.budgetLimit ?? trip.BudgetLimit ?? trip.expectedBudget ?? trip.ExpectedBudget ?? 0;
  }

  getTripRoute(trip: any): string {
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
    return trip.remainingBudget ?? trip.RemainingBudget ?? (this.getTripBudget(trip) - this.getTripSpent(trip));
  }

  getTripUsage(trip: any): number {
    return trip.usagePercent ?? trip.UsagePercent ?? 0;
  }

  getTripStatus(trip: any): string {
    return trip.status || trip.Status || 'On Track';
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

  // View switchers
  onReviewProviders() { this.view = 'providers'; this.fetchPendingProviders(); }
  onReviewMemories() { this.view = 'memories'; this.fetchPlatformMemories(); }
  onManageLogins() { this.view = 'users'; this.fetchAllUsers(); }

 refreshDashboard() {
  // 1. Stats ලබාගැනීම (නිවැරදි subscribe ක්‍රමය)
  this.adminService.getDashboardStats().subscribe({
    next: (data) => {
      console.log("Stats Response:", data); // මෙතන totalExpenditure තියෙනවාද?
      this.stats = data;
    },
    error: (err) => console.error("Error loading stats:", err)
  });

  // 2. අනෙකුත් දත්ත ලබාගැනීම (මෙම ශ්‍රිත ඇතුළේ refreshDashboard නැවත නොඅමතන්න!)
  this.fetchPendingProviders();
  this.fetchAllUsers();
  this.fetchPlatformMemories();
  this.fetchAllVehicles();
}

  fetchPendingProviders() { this.adminService.getPendingProviders().subscribe(data => this.pendingProviders = data); }
  fetchAllUsers() { this.adminService.getAllUsers().subscribe(data => this.allUsers = data); }

  // memory පැටවීමේදී වෙනත් දත්ත සමග පැටලෙන්නේ නැති බවට සහතික වන්න
fetchPlatformMemories() {
  this.adminService.getAllUploadedMemories().subscribe({
    next: (data) => {
      this.allMemories = data;
    },
    error: (err) => console.error("Memory Load Error:", err)
  });
}

refreshCurrentView() {
  // 1. කුඩා Loading alert එකක් පෙන්වන්න (Optional)
  Swal.fire({
    title: 'Syncing Data...',
    text: 'Please wait while we update your current view.',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  // 2. අදාළ view එකේ දත්ත refresh කරන්න
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

  // 3. Sync එක අවසන් වූ පසු සාර්ථක පණිවිඩය පෙන්වන්න
  // (මෙය සරලව තත්පර 1කින් වසා දමන ලෙස සකසා ඇත)
  setTimeout(() => {
    Swal.fire({
      icon: 'success',
      title: 'Sync Successful!',
      text: 'Your current view is up to date.',
      timer: 1500,
      showConfirmButton: false
    });
  }, 1000); // API එකෙන් දත්ත එන වේගය අනුව මෙය වෙනස් කළ හැක
}
  confirmApproval(provider: any) {
  Swal.fire({
    title: 'Approve Fleet Item?',
    text: `Verify ${provider.vehicleClass}?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#10b981',
    // මේකෙන් alert එක modal එක ඇතුලේම පෙන්වයි
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
    // මේකෙන් alert එක modal එක ඇතුලේම පෙන්වයි
    target: document.querySelector('.modal-card') as HTMLElement || document.body 
  }).then(res => { if (res.isConfirmed) this.updateStatus(provider, 'Rejected'); });
}

  updateStatus(provider: any, status: string) {
    const id = provider._id || provider.id;
    this.adminService.updateProviderStatus(id, status).subscribe(() => {
      this.selectedProvider = null;
      this.refreshDashboard();
      Swal.fire('Success', `Vehicle ${status}`, 'success');
    });
  }

fetchAllVehicles() {
  this.adminService.getAllVehiclesDetailed().subscribe((data: any) => {
    this.allVehicles = data;
  });
}

// Component එකේ දත්ත ලබාගන්නා ආකාරය
fetchExpenseList() {
  this.costsLoading = true;
  this.adminService.getBudgetDetails().subscribe({
    next: (data: any) => {
      const summary = data?.summary || data?.Summary || {};
      this.costSummary = {
        totalTrips: summary.totalTrips ?? summary.TotalTrips ?? 0,
        overBudgetTrips: summary.overBudgetTrips ?? summary.OverBudgetTrips ?? 0,
        onTrackTrips: summary.onTrackTrips ?? summary.OnTrackTrips ?? 0,
        nearLimitTrips: summary.nearLimitTrips ?? summary.NearLimitTrips ?? 0
      };

      this.budgetTrips = data?.trips || data?.Trips || [];
      this.expenses = this.budgetTrips;
      this.costsLoading = false;
    },
    error: (err) => {
      console.error('Error loading budget details:', err);
      this.costsLoading = false;
    }
  });
}

onReviewFleet() { 
  this.view = 'fleet-detailed'; 
  this.fetchAllVehicles(); 
}

  deleteMemory(id: string) {
    // ඔබ අනිවාර්යයෙන්ම ID එකක් යවනවාදැයි මෙතන බලන්න
    this.adminService.deleteMemoryPost(id).subscribe({
      next: () => {
        this.refreshDashboard();
        Swal.fire('Deleted!', 'Memory post has been removed.', 'success');
      },
      error: (err) => {
        console.error("Delete Error:", err); // Network tab එකේ එන Error එක මෙතනත් පේයි
      }
    });
  }

// වාහන සඳහා පමණක් භාවිතා කරන්න
viewVehicleDetails(vehicle: any) {
  console.log("Viewing Vehicle:", vehicle);
  this.selectedProvider = vehicle; 
}

// Memory සඳහා පමණක් භාවිතා කරන්න
viewMemoryDetails(memory: any) {
  Swal.fire({
    title: memory.title || 'Trip Memory',
    html: `
      <p style="text-align:left;margin-bottom:8px;"><strong>By:</strong> ${memory.fullName || 'Unknown'}</p>
      <p style="text-align:left;margin-bottom:8px;"><strong>Location:</strong> ${memory.locationName || 'N/A'}</p>
      <p style="text-align:left;margin-bottom:12px;">${memory.description || 'No description provided.'}</p>
      ${memory.imageUrl ? `<img src="${memory.imageUrl}" style="max-width:100%;border-radius:12px;" />` : ''}
    `,
    width: 640,
    confirmButtonText: 'Close',
    confirmButtonColor: '#2563eb'
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
  
  // නව වින්ඩෝ එකක් ඇරලා image එක ඒකේ පෙන්නන්න
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

  // Memory filtering methods
  get filteredMemories(): any[] {
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
    return memory.status || memory.moderationStatus || 'pending';
  }

  getMemoryStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'approved': return 'memory-status-approved';
      case 'flagged': return 'memory-status-flagged';
      case 'pending': return 'memory-status-pending';
      default: return 'memory-status-default';
    }
  }

  getMemoryUploadDate(memory: any): string {
    const date = memory.uploadDate || memory.createdAt || memory.created_at;
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  getMemoriesByStatus(status: string): any[] {
    return this.allMemories.filter(m => this.getMemoryStatus(m).toLowerCase() === status.toLowerCase());
  }

  matchesDateFilter(memory: any): boolean {
    if (this.memoryDateFilter === 'all') return true;
    
    const date = memory.uploadDate || memory.createdAt || memory.created_at;
    if (!date) return false;
    
    const d = new Date(date);
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

  // Budget monitoring additional methods
  getTotalBudgetAllocated(): number {
    return this.budgetTrips.reduce((sum, trip) => sum + this.getTripBudget(trip), 0);
  }

  getTotalSpent(): number {
    return this.budgetTrips.reduce((sum, trip) => sum + this.getTripSpent(trip), 0);
  }

  getAverageBudgetUsage(): number {
    const tripsWithBudget = this.budgetTrips.filter(t => this.getTripBudget(t) > 0);
    if (tripsWithBudget.length === 0) return 0;
    const totalUsage = tripsWithBudget.reduce((sum, trip) => sum + this.getTripUsage(trip), 0);
    return totalUsage / tripsWithBudget.length;
  }

  getTotalExpenseCount(): number {
    return this.budgetTrips.reduce((sum, trip) => sum + (trip.expenseCount ?? trip.ExpenseCount ?? 0), 0);
  }

  exportBudgetReport() {
    const csvContent = this.generateBudgetCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `budget-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    Swal.fire('Exported', 'Budget report has been downloaded.', 'success');
  }

  generateBudgetCSV(): string {
    const headers = ['Trip Name', 'Route', 'Created By', 'Budget Limit', 'Total Spent', 'Remaining', 'Usage %', 'Status'];
    const rows = this.filteredBudgetTrips.map(trip => [
      trip.tripName || trip.TripName,
      this.getTripRoute(trip),
      trip.createdBy || trip.CreatedBy,
      this.getTripBudget(trip),
      this.getTripSpent(trip),
      this.getTripRemaining(trip),
      this.getTripUsage(trip).toFixed(1),
      this.getTripStatus(trip)
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  sendBudgetAlert(trip: any) {
    Swal.fire({
      title: 'Send budget alert?',
      text: `Notify the trip creator that they have exceeded their budget limit.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Send Alert'
    }).then(res => {
      if (res.isConfirmed) {
        this.adminService.sendBudgetAlert(trip.id || trip._id).subscribe({
          next: () => {
            Swal.fire('Alert Sent', 'Budget alert notification has been sent.', 'success');
          },
          error: (err: any) => Swal.fire('Error', 'Could not send alert.', 'error')
        });
      }
    });
  }

  // Fleet filtering methods
  get filteredVehicles(): any[] {
    return this.allVehicles.filter(vehicle => {
      const query = this.fleetSearch.trim().toLowerCase();
      const vehicleClass = (vehicle.vehicleClass || vehicle.VehicleClass || '').toLowerCase();
      const modelName = (vehicle.modelName || vehicle.ModelName || '').toLowerCase();
      const provider = (vehicle.providerProfile?.name || vehicle.ProviderProfile?.Name || '').toLowerCase();
      const location = (vehicle.providerProfile?.location || vehicle.ProviderProfile?.Location || '').toLowerCase();
      const matchesSearch = !query || vehicleClass.includes(query) || modelName.includes(query) || provider.includes(query) || location.includes(query);

      const status = (vehicle.status || vehicle.Status || '').toLowerCase();
      const statusFilter = this.fleetStatusFilter.toLowerCase();
      const matchesStatus = statusFilter === 'all' || status === statusFilter;

      const type = (vehicle.type || vehicle.vehicleType || '').toLowerCase();
      const typeFilter = this.fleetTypeFilter.toLowerCase();
      const matchesType = typeFilter === 'all' || type.includes(typeFilter);

      const isBooked = this.isVehicleBooked(vehicle);
      const bookingFilter = this.fleetBookingFilter.toLowerCase();
      const matchesBooking = bookingFilter === 'all' || 
        (bookingFilter === 'available' && !isBooked) || 
        (bookingFilter === 'booked' && isBooked);

      return matchesSearch && matchesStatus && matchesType && matchesBooking;
    });
  }

  getVehiclesByStatus(status: string): any[] {
    return this.allVehicles.filter(v => (v.status || v.Status || '').toLowerCase() === status.toLowerCase());
  }

  getBookedVehiclesCount(): number {
    return this.allVehicles.filter(v => this.isVehicleBooked(v)).length;
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
      default: return false;
    }
  }

  // Provider filtering methods
  get filteredProviders(): any[] {
    return this.pendingProviders.filter(provider => {
      const query = this.providerSearch.trim().toLowerCase();
      const providerName = (provider.providerProfile?.name || '').toLowerCase();
      const vehicleClass = (provider.vehicleClass || '').toLowerCase();
      const location = (provider.location || provider.providerProfile?.location || '').toLowerCase();
      const matchesSearch = !query || providerName.includes(query) || vehicleClass.includes(query) || location.includes(query);

      const type = (provider.type || '').toLowerCase();
      const typeFilter = this.providerTypeFilter.toLowerCase();
      const matchesType = typeFilter === 'all' || type.includes(typeFilter);

      return matchesSearch && matchesType;
    });
  }

  getSubmissionDate(provider: any): string {
    const date = provider.submittedAt || provider.createdAt || provider.created_at;
    if (!date) return 'N/A';
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

}

