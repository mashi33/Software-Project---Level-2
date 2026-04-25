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
    // Initial data load for counts and dashboard
    this.fetchPendingProviders();
    this.fetchAllUsers();
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

  // --- DATA FETCHING ---

  fetchPendingProviders() {
    this.adminService.getPendingProviders().subscribe({
      next: (data) => this.pendingProviders = data,
      error: () => this.errorMessage = "Failed to load providers."
    });
  }

  fetchAllUsers() {
    this.adminService.getAllUsers().subscribe({
      next: (data) => this.allUsers = data,
      error: () => console.error("Could not load users")
    });
  }

  // --- ACTIONS ---

  /**
   * Approves or Rejects a transport provider.
   * Updates the UI immediately by filtering the local list.
   */
  updateProviderStatus(id: string, status: string) {
    Swal.fire({
      title: `Confirm ${status}?`,
      text: `Are you sure you want to set this provider to ${status}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: status === 'Approved' ? '#10b981' : '#ef4444',
      confirmButtonText: 'Yes, proceed'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.updateProviderStatus(id, status).subscribe({
          next: () => {
            // Remove from local list so the table updates
            this.pendingProviders = this.pendingProviders.filter(p => (p._id || p.id) !== id);
            this.selectedProvider = null;
            Swal.fire('Success', `Provider has been ${status}`, 'success');
          },
          error: (err) => {
            console.error("Update failed", err);
            Swal.fire('Error', 'Failed to update status on the server.', 'error');
          }
        });
      }
    });
  }

  /**
   * Promotes a regular user to an Admin role.
   */
  changeRole(userId: string, newRole: string) {
    this.adminService.updateUserRole(userId, newRole).subscribe({
      next: () => {
        const user = this.allUsers.find(u => (u._id || u.id) === userId);
        if (user) user.role = newRole;
        Swal.fire('Updated', `User is now an ${newRole}`, 'success');
      },
      error: () => Swal.fire('Error', 'Role update failed.', 'error')
    });
  }

  /**
   * Opens the detail modal for a specific provider.
   */
  viewDetails(provider: any) {
    this.selectedProvider = provider;
  }

  /**
   * Opens Base64 document images in a new window with a stylized background.
   */
  openImage(base64Data: string | undefined) {
    if (!base64Data) {
      Swal.fire('Error', 'No document image found for this provider.', 'error');
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
      Swal.fire('Pop-up Blocked', 'Please allow pop-ups to view documents.', 'warning');
    }
  }
}