import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

  currentDate = new Date();
  view: 'stats' | 'providers' | 'users' = 'stats';

  pendingProviders: any[] = [];
  allUsers: any[] = [];
  selectedProvider: any = null;
  errorMessage: string = '';

  ngOnInit() {
    this.refreshDashboard();
  }

  // --- VIEW HANDLERS ---

  onReviewNow() {
    this.view = 'providers'; 
    this.fetchPendingProviders();
  }

  onManageLogins() {
    this.view = 'users'; 
    this.fetchAllUsers();
  }

  refreshDashboard() {
    this.fetchPendingProviders();
    this.fetchAllUsers();
  }

  // --- DATA FETCHING ---

  fetchPendingProviders() {
    this.adminService.getPendingProviders().subscribe({
      next: (data: any[]) => this.pendingProviders = data,
      error: (err: any) => console.error("Fetch error:", err)
    });
  }

  fetchAllUsers() {
    this.adminService.getAllUsers().subscribe({
      next: (data: any[]) => this.allUsers = data,
      error: (err: any) => console.error("Could not load users", err)
    });
  }

  // --- ACTIONS ---

  // ✅ FIXED: Added the missing deleteUser method
  deleteUser(userId: string) {
    if (!userId) {
      Swal.fire('Error', 'User ID is missing!', 'error');
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: "This user will be permanently removed from the system!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete!',
      heightAuto: false
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.deleteUser(userId).subscribe({
          next: () => {
            // Remove user from the local list so the UI updates immediately
            this.allUsers = this.allUsers.filter(u => (u._id || u.id) !== userId);
            Swal.fire({
              title: 'Deleted!',
              text: 'User has been removed.',
              icon: 'success',
              heightAuto: false
            });
          },
          error: (err) => {
            console.error("Delete failed:", err);
            Swal.fire('Error', 'Failed to delete user.', 'error');
          }
        });
      }
    });
  }

  toggleBlock(user: any) {
    const userId = user.id || user._id;
    const newBlockStatus = !user.isBlocked;
    const action = newBlockStatus ? 'block' : 'unblock';

    Swal.fire({
      title: `Confirm ${action}?`,
      text: `Do you want to ${action} ${user.fullName || user.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: newBlockStatus ? '#ef4444' : '#10b981',
      confirmButtonText: `Yes, ${action}`,
      heightAuto: false
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.toggleBlockUser(userId, newBlockStatus).subscribe({
          next: () => {
            user.isBlocked = newBlockStatus;
            Swal.fire({ title: 'Success', icon: 'success', heightAuto: false });
          },
          error: (err) => console.error(err)
        });
      }
    });
  }

  /*changeRole(userId: string, newRole: string) {
    this.adminService.updateUserRole(userId, newRole).subscribe({
      next: () => {
        const user = this.allUsers.find(u => (u._id || u.id) === userId);
        if (user) user.role = newRole;
        Swal.fire('Updated', `User promoted to ${newRole}`, 'success');
      }
    });
  }*/

  updateProviderStatus(provider: any, status: string) {
    const id = provider._id || provider.id;
    this.adminService.updateProviderStatus(id, status).subscribe({
      next: () => {
        this.pendingProviders = this.pendingProviders.filter(p => (p._id || p.id) !== id);
        this.selectedProvider = null;
        Swal.fire('Success', `Provider ${status}`, 'success');
      }
    });
  }

  /*viewDetails(provider: any) {
    const id = provider._id || provider.id;
    this.adminService.getProviderById(id).subscribe({
      next: (fullData: any) => this.selectedProvider = fullData
    });
  }*/

  openImage(base64Data: string | undefined) {
    if (!base64Data) return;
    const newWindow = window.open();
    newWindow?.document.write(`<img src="${base64Data}" style="max-width:100%;">`);
  }
}
