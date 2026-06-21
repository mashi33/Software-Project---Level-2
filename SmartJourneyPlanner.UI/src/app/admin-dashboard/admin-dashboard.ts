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
  view: 'stats' | 'providers' | 'memories' | 'users' = 'stats';
  stats: any = { totalExpenditure: 0 };
  pendingProviders: any[] = [];
  allUsers: any[] = [];
  allMemories: any[] = []; 
  selectedProvider: any = null;

  ngOnInit() { this.refreshDashboard(); }

  // View switchers
  onReviewProviders() { this.view = 'providers'; this.fetchPendingProviders(); }
  onReviewMemories() { this.view = 'memories'; this.fetchPlatformMemories(); }
  onManageLogins() { this.view = 'users'; this.fetchAllUsers(); }

  refreshDashboard() {
    this.adminService.getDashboardStats().subscribe(data => this.stats = data);
    this.fetchPendingProviders();
    this.fetchAllUsers();
    this.fetchPlatformMemories();
  }

  fetchPendingProviders() { this.adminService.getPendingProviders().subscribe(data => this.pendingProviders = data); }
  fetchAllUsers() { this.adminService.getAllUsers().subscribe(data => this.allUsers = data); }
  fetchPlatformMemories() { this.adminService.getAllUploadedMemories().subscribe(data => this.allMemories = data); }

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

  viewDetails(p: any) { this.adminService.getProviderById(p._id || p.id).subscribe(data => this.selectedProvider = data); }
  deleteMemory(id: string) { this.adminService.deleteMemoryPost(id).subscribe(() => this.refreshDashboard()); }
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

