import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { UserService } from '../services/user-profile.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2'; // Import SweetAlert2

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class ProfileComponent implements OnInit {

  @ViewChild('fileInput') fileInput!: ElementRef;

  user: any = null;
  userId: string | null = null;
  isEditMode: boolean = false;
  showPasswordSection: boolean = false;

  editData: any = {
    fullName: '',
    email: '',
    bio: '',
    location: '',
    interests: [],
    profileImageFile: null,
    profilePictureUrl: ''
  };

  passwordData = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  availableInterests: string[] = [];

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.userId = this.authService.getUserId();
    this.loadUserProfile();
  }

  // --- Helper Alert Functions ---
  showSuccess(message: string) {
    Swal.fire({ icon: 'success', title: 'Success', text: message, timer: 2500, timerProgressBar: true });
  }

  showError(message: string) {
    Swal.fire({ icon: 'error', title: 'Oops...', text: message });
  }

  // Load user profile from backend
  loadUserProfile() {
    if (this.userId) {
      this.userService.getUserProfile(this.userId).subscribe({
        next: (data) => {
          this.user = data;
          this.availableInterests = (this.user?.role === 'Provider' || this.user?.role === 'TransportProvider')
            ? ['Car (Sedan)', 'SUV / Jeep', 'KDH Van', 'Mini Bus', 'Luxury Coaster', '4x4 Off-Road']
            : ['Hiking', 'Beach', 'Photography', 'Camping', 'Foodie', 'Culture'];
        },
        error: (err) => console.error('Error fetching profile:', err)
      });
    }
  }

  // Initialize edit mode with current user data
  onEditProfile() {
    this.isEditMode = true;
    this.showPasswordSection = false;
    this.editData = {
      fullName: this.user?.fullName || this.user?.username || '',
      email: this.user?.email || '',
      bio: this.user?.bio || '',
      location: this.user?.location || '',
      profileImageFile: null,
      profilePictureUrl: this.user?.profilePictureUrl || '',
      interests: [...(this.user?.interests || [])]
    };
    this.passwordData = { currentPassword: '', newPassword: '', confirmPassword: '' };
  }

  onCancel() { this.isEditMode = false; }

  toggleInterest(interest: string) {
    const index = this.editData.interests.indexOf(interest);
    index > -1 ? this.editData.interests.splice(index, 1) : this.editData.interests.push(interest);
  }

  // Handle profile update logic
  onSaveProfile() {
    if (!this.userId) return;
    const oldEmail = this.user?.email;
    const formData = new FormData();

    formData.append('fullName', this.editData.fullName || '');
    formData.append('email', this.editData.email || '');
    formData.append('bio', this.editData.bio || '');
    formData.append('location', this.editData.location || '');
    formData.append('interests', JSON.stringify(this.editData.interests || []));

    if (this.editData.profileImageFile instanceof File) {
      formData.append('profileImage', this.editData.profileImageFile);
    } else {
      formData.append('profilePictureUrl', this.editData.profilePictureUrl || '');
    }

    this.userService.updateProfile(this.userId, formData).subscribe({
      next: (updatedUser: any) => {
        this.user = { ...this.user, ...this.editData };
        if (updatedUser?.profilePictureUrl) this.user.profilePictureUrl = updatedUser.profilePictureUrl;

        // If email changed, force relogin
        if (this.editData.email !== oldEmail) {
          Swal.fire('Email Updated', 'Please login again with your new email.', 'info').then(() => {
            localStorage.clear();
            this.router.navigate(['/login']);
          });
          return;
        }

        if (this.showPasswordSection && this.passwordData.newPassword) {
          this.changePasswordLogic();
        } else {
          this.isEditMode = false;
          this.showSuccess('Profile updated successfully!');
        }
      },
      error: () => this.showError('Failed to update profile.')
    });
  }

  // Handle password change process
  changePasswordLogic() {
    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      this.showError('New password and confirm password do not match!');
      return;
    }

    this.http.put(`http://localhost:5233/api/users/change-password/${this.userId}`, {
      currentPassword: this.passwordData.currentPassword,
      newPassword: this.passwordData.newPassword
    }).subscribe({
      next: () => {
        Swal.fire('Password Changed', 'Please login again with your new password.', 'success').then(() => {
          localStorage.clear();
          this.router.navigate(['/login']);
        });
      },
      error: (err) => this.showError(err.error?.message || 'Failed to change password.')
    });
  }

  triggerFileInput() { this.fileInput.nativeElement.click(); }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.editData.profileImageFile = file;
      const reader = new FileReader();
      reader.onload = () => { this.editData.profilePictureUrl = reader.result as string; };
      reader.readAsDataURL(file);
    }
  }

  onRemovePhoto() {
    this.editData.profilePictureUrl = '';
    this.editData.profileImageFile = null;
  }
}