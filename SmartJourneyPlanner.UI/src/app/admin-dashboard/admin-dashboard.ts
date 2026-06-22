import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../services/admin.service';
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
  private cd = inject(ChangeDetectorRef);

  currentDate = new Date();
view: 'stats' | 'providers' | 'memories' | 'users' | 'fleet-detailed' | 'costs' = 'stats';
  stats: any = { totalExpenditure: 0 };
  pendingProviders: any[] = [];
  allUsers: any[] = [];
  allMemories: any[] = []; 
  selectedProvider: any = null;
  allVehicles: any[] = [];
  expenses: any[] = [];

  ngOnInit() { 
    this.refreshDashboard();
    this.fetchExpenseList();
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
  this.adminService.getBudgetDetails().subscribe((data: any[]) => {
    console.log("API Response:", data); // මෙය Console එකේ පේනවාද?
    this.expenses = data;
    
    // දත්ත තිබේ නම් total එක අලුත් කරගන්න
    this.stats.totalExpenditure = data.reduce((sum, item) => sum + (item.TotalSpent || 0), 0);
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
  console.log("Viewing Memory:", memory);
  // ඔබ Memory සඳහා වෙනම Modal එකක් භාවිතා කරන්නේ නම් මෙහි දත්ත ලබා ගන්න
  // නැත්නම් මෙය දැනට හිස්ව තබන්න
}

viewExpenditureDetails() {
  this.view = 'costs';
}

  changeRole(id: string, role: string) { this.adminService.updateUserRole(id, role).subscribe(() => this.refreshDashboard()); }
  toggleBlock(u: any) { this.adminService.toggleBlockUser(u.id || u._id, !u.isBlocked).subscribe(() => this.refreshDashboard()); }
  deleteUser(id: string) { this.adminService.deleteUser(id).subscribe(() => this.refreshDashboard()); }
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

