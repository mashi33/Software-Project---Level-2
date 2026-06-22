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
    totalTrackedSpend: 0,
    totalBudgetsTracked: 0,
    totalBudgetLimit: 0,
    overBudgetTrips: 0,
    averageSpendPerTrip: 0
  };
  categoryBreakdown: any[] = [];
  costSearch = '';
  costStatusFilter = 'all';
  selectedBudgetTrip: any = null;
  costsLoading = false;

  ngOnInit() {
    this.adminName = this.authService.getUserName() || 'Admin';
    this.refreshDashboard();
    this.fetchExpenseList();
  }

  getUserRole(user: any): string {
    return user?.userType || user?.UserType || user?.role || 'Unknown';
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
      const matchesSearch = !query || tripName.includes(query) || createdBy.includes(query);

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
    return trip.expectedBudget ?? trip.ExpectedBudget ?? 0;
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

  getCategoryPercent(category: any): number {
    const total = this.costSummary.totalTrackedSpend || 0;
    const amount = category.amount ?? category.Amount ?? 0;
    return total > 0 ? (amount / total) * 100 : 0;
  }

  getBudgetStatusClass(status: string): string {
    switch (status) {
      case 'Over Budget': return 'cost-status-over';
      case 'Near Limit': return 'cost-status-near';
      case 'No Limit': return 'cost-status-none';
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

  get filteredTripsTotalSpend(): number {
    return this.filteredBudgetTrips.reduce((sum, trip) => sum + this.getTripSpent(trip), 0);
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
        totalTrackedSpend: summary.totalTrackedSpend ?? summary.TotalTrackedSpend ?? 0,
        totalBudgetsTracked: summary.totalBudgetsTracked ?? summary.TotalBudgetsTracked ?? 0,
        totalBudgetLimit: summary.totalBudgetLimit ?? summary.TotalBudgetLimit ?? 0,
        overBudgetTrips: summary.overBudgetTrips ?? summary.OverBudgetTrips ?? 0,
        averageSpendPerTrip: summary.averageSpendPerTrip ?? summary.AverageSpendPerTrip ?? 0
      };

      this.budgetTrips = data?.trips || data?.Trips || (Array.isArray(data) ? data : []);
      this.categoryBreakdown = data?.categoryBreakdown || data?.CategoryBreakdown || [];
      this.expenses = this.budgetTrips;

      this.stats.totalExpenditure = this.costSummary.totalTrackedSpend;
      this.stats.totalBudgets = this.costSummary.totalBudgetsTracked;
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

  toggleBlock(u: any) {
    const id = u.id || u._id;
    const block = !u.isBlocked;
    this.adminService.toggleBlockUser(id, block).subscribe(() => {
      this.refreshDashboard();
      Swal.fire('Updated', block ? 'User blocked.' : 'User unblocked.', 'success');
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

}

