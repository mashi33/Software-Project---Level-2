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

  // Provider filtering
  providerSearch = '';
  providerTypeFilter = 'all';

  ngOnInit() {
    this.adminName = this.authService.getUserName() || 'Admin';
    this.loadDailyCounters(); 
    this.refreshDashboard();
    this.fetchExpenseList();

    (window as any).openAdminFullImage = (url: string) => {
      this.openImage(url);
    };
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

  isVehicleBooked(vehicle: any): boolean {
    const dates = vehicle?.bookedDates || vehicle?.BookedDates;
    return Array.isArray(dates) && dates.length > 0;
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

  // View switchers
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
    this.fetchAllVehicles();
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
    
    this.adminService.updateProviderStatus(id, status).subscribe(() => {
      this.selectedProvider = null;
      
      if (status === 'Approved') {
        this.approvedSessionCount++;
        localStorage.setItem('approvedToday', this.approvedSessionCount.toString());
      } else if (status === 'Rejected') {
        this.rejectedSessionCount++;
        localStorage.setItem('rejectedToday', this.rejectedSessionCount.toString());
      }

      this.refreshDashboard();
      Swal.fire('Success', `Vehicle ${status}`, 'success');
    });
  }

  fetchAllVehicles() {
    this.adminService.getAllVehiclesDetailed().subscribe((data: any) => {
      this.allVehicles = data;
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

  viewVehicleDetails(vehicle: any) {
    console.log("Viewing Vehicle:", vehicle);
    this.selectedProvider = vehicle; 
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
          
          <!-- GRID MOVED TO THE TOP -->
          <div class="memory-swal-grid">
            
            <!-- Location and Trip moved to the top of the grid -->
            <div class="memory-swal-info" style="grid-column: span 2;">
              <span class="info-label"><i class="bi bi-geo-alt"></i> Captured Location</span>
              <span class="info-val">${m.locationName || m.location || 'Location Not Specified'}</span>
            </div>
            
            <div class="memory-swal-info" style="grid-column: span 2;">
              <span class="info-label"><i class="bi bi-map"></i> Associated Trip</span>
              <span class="info-val" style="color: #2563eb;">${tripName}</span>
            </div>

            <!-- Uploaded By and Date pushed below Location/Trip -->
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
          
          <!-- DESCRIPTION MOVED TO THE BOTTOM (with adjusted margins) -->
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

  // Memory filtering methods
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
      case 'approved': return 'memory-status-approved';
      case 'flagged': return 'memory-status-flagged';
      case 'pending': return 'memory-status-pending';
      default: return 'memory-status-default';
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

  // Fleet filtering methods.
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

  // Provider filtering methods.
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
