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

  // System Data
  currentDate = new Date();
  
  // View Switcher
  view: 'stats' | 'providers' | 'users' = 'stats';

  // Data Lists
  pendingProviders: any[] = [];
  allUsers: any[] = [];
  selectedProvider: any = null;
  
  // States
  errorMessage: string = '';

  ngOnInit() {
    this.refreshDashboard();
  }

  // --- 1. DASHBOARD HOME & VIEW HANDLERS ---

  onReviewNow() {
    this.view = 'providers';
    this.fetchPendingProviders();
  }

  onManageLogins() {
    this.view = 'users';
    this.fetchAllUsers();
  }

  /**
   * ✅ DEDICATED REFRESH LOGIC
   * Updates all counts and lists simultaneously.
   */
  refreshDashboard() {
    this.errorMessage = '';
    this.fetchPendingProviders();
    this.fetchAllUsers();
    
    // Optional toast notification
    Swal.fire({
      title: 'Dashboard Refreshed',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
      icon: 'success'
    });
  }

  // --- 2. DATA FETCHING ---

  fetchPendingProviders() {
    this.adminService.getPendingProviders().subscribe({
      next: (data: any[]) => {
        this.pendingProviders = data;
        this.errorMessage = '';
      },
      error: (err: any) => {
        console.error("Fetch error:", err);
        this.errorMessage = "Failed to load providers.";
      }
    });
  }

  fetchAllUsers() {
    this.adminService.getAllUsers().subscribe({
      next: (data: any[]) => this.allUsers = data,
      error: (err: any) => console.error("Could not load users", err)
    });
  }

  // --- 3. MANAGE PROVIDERS ACTIONS ---

  /**
   * Approves or Rejects a transport provider.
   */
  updateProviderStatus(provider: any, status: string) {
    const id = provider._id || provider.id;

    if (!id) {
      Swal.fire('Error', 'Unique ID for this provider is missing.', 'error');
      return;
    }

    Swal.fire({
      title: `Confirm ${status}?`,
      text: `Are you sure you want to set this provider to ${status}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: status === 'Approved' ? '#10b981' : '#ef4444',
      confirmButtonText: 'Yes, proceed',
      cancelButtonText: 'No, cancel',
      heightAuto: false,
      focusConfirm: true,
      returnFocus: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.updateProviderStatus(id, status).subscribe({
          next: () => {
            this.pendingProviders = this.pendingProviders.filter(p => (p._id || p.id) !== id);
            this.selectedProvider = null; // Automatically close the detail modal
            Swal.fire({
              title: 'Success',
              text: `Provider has been ${status}`,
              icon: 'success',
              heightAuto: false
            });
          },
          error: (err: any) => {
            console.error("Update failed", err);
            Swal.fire({
              title: 'Error',
              text: 'Update failed. Backend might be down.',
              icon: 'error',
              heightAuto: false
            });
          }
        });
      }
    });
  }

  /**
   * Opens the detail modal for a specific provider and fetches full data.
   */
  viewDetails(provider: any) {
    const id = provider._id || provider.id;
    this.adminService.getProviderById(id).subscribe({
      next: (fullData: any) => {
        this.selectedProvider = fullData;
      },
      error: (err: any) => {
        console.error("Could not fetch details", err);
        Swal.fire({
          title: 'Error',
          text: 'Failed to load vehicle documents.',
          icon: 'error',
          heightAuto: false
        });
      }
    });
  }

  // --- 4. USER MANAGEMENT ACTIONS ---

  /**
   * Promotes a regular user to an Admin role.
   */
  changeRole(userId: string, newRole: string) {
    if (!userId) {
      Swal.fire('Error', 'User ID is missing!', 'error');
      return;
    }

    this.adminService.updateUserRole(userId, newRole).subscribe({
      next: (res: any) => {
        const user = this.allUsers.find(u => (u._id || u.id) === userId);
        if (user) user.role = newRole;
        Swal.fire('Updated', `User promoted to ${newRole}`, 'success');
      },
      error: (err: any) => {
        console.error("Server error:", err);
        Swal.fire('Error', 'Role update failed.', 'error');
      }
    });
  }

  /**
   * ✅ FIXED: Toggle Block status for users.
   */
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
          error: (err) => console.error("Block/Unblock failed:", err)
        });
      }
    });
  }

  /**
   * ✅ FIXED: Permanently deletes a user.
   */
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

  // --- DOCUMENT UTILITIES ---

  openImage(base64Data: string | undefined) {
    if (!base64Data) {
      Swal.fire({ title: 'Error', text: 'No document found.', icon: 'error', heightAuto: false });
      return;
    }
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`
        <title>Document Viewer</title>
        <body style="margin:0; background:#111; display:flex; align-items:center; justify-content:center; height: 100vh;">
          <img src="${base64Data}" style="max-width:90%; max-height:90vh; border-radius: 8px; box-shadow: 0 0 50px rgba(0,0,0,0.8);">
        </body>
      `);
    }
  }
}