import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { UserService } from '../services/user-profile.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router'; 

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

  // This flag controls the visibility of the password change section within the profile edit modal
  showPasswordSection: boolean = false;

  // structure to hold editable profile data, initialized with empty/default values
  editData: any = {
    fullName: '',
    email: '',
    bio: '',
    location: '',
    interests: [],
    profileImageFile: null,
    profilePictureUrl: ''
  };

  // 0bject to hold password change form data, initialized with empty strings
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
  ) {}

  ngOnInit(): void {
    this.userId = this.authService.getUserId();
    this.loadUserProfile();
  }
  // Method to load the user's profile data from the backend and set up the component state accordingly
  loadUserProfile() {
    if (this.userId) {
      this.userService.getUserProfile(this.userId).subscribe({
        next: (data) => {
          this.user = data;

          if (this.user?.role === 'Provider' || this.user?.role === 'TransportProvider') {
            this.availableInterests = [
              'Car (Sedan)', 'SUV / Jeep', 'KDH Van', 'Mini Bus', 'Luxury Coaster', '4x4 Off-Road'
            ];
          } else {
            this.availableInterests = [
              'Hiking', 'Beach', 'Photography', 'Camping', 'Foodie', 'Culture'
            ];
          }
        },
        error: (err) => console.error('Error fetching profile:', err)
      });
    }
  }
  
  // Method to initialize the profile edit mode, pre-filling the form with existing user data and resetting password fields
  onEditProfile() {
    this.isEditMode = true;
    this.showPasswordSection = false; 

    //loading existing user data into the editData structure to pre-fill the form fields when the user enters edit mode
    this.editData = {
      fullName: this.user?.fullName || this.user?.username || '',
      email: this.user?.email || '',
      bio: this.user?.bio || '',
      location: this.user?.location || '',
      profileImageFile: null,
      profilePictureUrl: this.user?.profilePictureUrl || '',
      interests: [...(this.user?.interests || [])]
    };

    //Password change fields are reset to empty every time the user enters edit mode to ensure security and prevent accidental password changes
    this.passwordData = { currentPassword: '', newPassword: '', confirmPassword: '' };
  }
  
  // Method to exit the profile edit mode without saving changes, simply toggling the isEditMode flag back to false
  onCancel() {
    this.isEditMode = false;
  }
  // Method to toggle the presence of an interest in the user's profile, adding it if it's not already there or removing it if it is
  toggleInterest(interest: string) {
    const index = this.editData.interests.indexOf(interest);
    if (index > -1) {
      this.editData.interests.splice(index, 1);
    } else {
      this.editData.interests.push(interest);
    }
  }
  
  //Method to handle the profile changes
  onSaveProfile() {
    if (!this.userId) return;
    // Storing the old email before making any changes to compare later for security purposes
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

    //calling the user service to update the profilewith the new form data
    this.userService.updateProfile(this.userId, formData).subscribe({
      next: (updatedUser: any) => {
        console.log('Profile updated successfully in Backend:', updatedUser);

        //updating the local user object with the new changes
        this.user.fullName = this.editData.fullName;
        this.user.bio = this.editData.bio;
        this.user.location = this.editData.location;
        this.user.interests = [...this.editData.interests];
        
        if (updatedUser && updatedUser.profilePictureUrl) {
          this.user.profilePictureUrl = updatedUser.profilePictureUrl;
        }

        // logout the user if they changed their email
        if (this.editData.email !== oldEmail) {
          alert('Email updated successfully! Please login again with your new email.');
          
          localStorage.clear(); // clear old session data including token and user info to prevent any security issues
          this.isEditMode = false;
          
          // Redirecting to login page after email change to ensure the user re-authenticates with the new email address
          this.router.navigate(['/login']); 
          return; 
        }

        if (this.showPasswordSection && this.passwordData.newPassword) {
          this.changePasswordLogic();
        } else {
          this.isEditMode = false;
          alert('Profile updated successfully!');
        }
      },
      error: (err: any) => {
        console.error('Profile Update API Error:', err);
        alert('Failed to update profile. Please try again.');
      }
    });
  }

 // Method to handle the password change process, including validation and API interaction 
 changePasswordLogic() {
   
    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      alert('New password and confirm password do not match!');
      return;
    }

    // checking for minimum password length requirement
    const passwordPayload = {
      currentPassword: this.passwordData.currentPassword,
      newPassword: this.passwordData.newPassword
    };

    console.log('Sending Password Payload:', passwordPayload);

    // calling the backend API to change the password, passing the userId and the new password details
    this.http.put(`http://localhost:5233/api/users/change-password/${this.userId}`, passwordPayload)
      .subscribe({
        next: (res: any) => {
          this.isEditMode = false;
          this.passwordData = { currentPassword: '', newPassword: '', confirmPassword: '' };
          this.showPasswordSection = false;
          
          alert('Password changed successfully! Please login again with your new password.');
          
          localStorage.clear(); 
          this.router.navigate(['/login']); 
        },
        error: (err: any) => {
          console.error('Password API Error:', err);
          const errorMsg = err.error?.message || err.error || 'Failed to change password.';
          alert(errorMsg);
        }
      });
  }
  
  // Method to programmatically trigger the hidden file input when the user clicks on the "Change Photo" button, allowing them to select a new profile picture
  triggerFileInput() {
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.click();
    }
  }
  
  // Method to handle the file selection event when the user chooses a new profile picture, updating the editData with the selected file and generating a preview URL for immediate display
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.editData.profileImageFile = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.editData.profilePictureUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }
  
  //Method to remove the current profile picture
  onRemovePhoto() {
    this.editData.profilePictureUrl = '';
    this.editData.profileImageFile = null;
  }
}