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
  searchEmail: string = '';

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

  // ✅ DEDICATED REFRESH LOGIC
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

  // --- DATA FETCHING ---

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

  // --- ACTIONS ---

  /**
   * ✅ UPDATED: Approves or Rejects a transport provider.
   * Fixed navigation issues by disabling heightAuto and forcing focus on Confirm.
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
      heightAuto: false,     // 🛠️ Prevents page jumping/navigation issues
      focusConfirm: true,    // 🛠️ Ensures you can hit 'Enter' to approve
      returnFocus: true      // 🛠️ Puts focus back on dashboard after close
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.updateProviderStatus(id, status).subscribe({
          next: (response: any) => {
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
   * ✅ UPDATED: Promotes a regular user to an Admin role.
   * Added explicit types to resolve TS compiler errors.
   */
 changeRole(userId: string, newRole: string) {
  console.log("Button clicked! Target User ID:", userId); // This should appear in Console

  if (!userId) {
    Swal.fire('Error', 'User ID is missing!', 'error');
    return;
  }

  this.adminService.updateUserRole(userId, newRole).subscribe({
    next: (res: any) => {
      console.log("Success from server:", res);
      const user = this.allUsers.find(u => (u._id || u.id) === userId);
      if (user) user.role = newRole;
      Swal.fire('Updated', `User promoted to ${newRole}`, 'success');
    },
    error: (err: any) => {
      console.error("Server returned an error:", err);
      Swal.fire('Error', 'Role update failed.', 'error');
    }
  });
}

  /**
   * Opens the detail modal for a specific provider.
   * Fetches full data (including heavy Base64 images) on-demand.
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

  /**
   * Opens Base64 document images in a new window.
   */
  openImage(base64Data: string | undefined) {
    if (!base64Data) {
      Swal.fire({
        title: 'Error',
        text: 'No document image found.',
        icon: 'error',
        heightAuto: false
      });
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
    } else {
      Swal.fire({
        title: 'Pop-up Blocked',
        text: 'Please allow pop-ups to view documents.',
        icon: 'warning',
        heightAuto: false
      });
    }
  }
}