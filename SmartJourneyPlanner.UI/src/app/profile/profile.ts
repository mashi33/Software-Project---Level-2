import { Component, OnInit } from '@angular/core';
import { UserService } from '../services/user-profile.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class ProfileComponent implements OnInit {

  // Variable to hold user profile data (initially null)
  user: any = null;

  // Get logged-in user's ID from localStorage (check if key name is correct)
  userId: string | null = null;

  // Inject UserService to communicate with backend API
  constructor(private userService: UserService,
              private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Load user profile when component initializes
    this.userId = this.authService.getUserId();
    this.loadUserProfile();
  }

  // Method to fetch user profile from backend
  loadUserProfile() {

    // Check if userId exists before making API request
    if (this.userId) {

      this.userService.getUserProfile(this.userId).subscribe({
        next: (data) => {
          // Assign received data to 'user'
          this.user = data;
        },
        error: (err) => {
          // Handle API errors
          console.error('Error fetching profile:', err);
        }
      });

    } else {
      console.warn('User ID not found in localStorage');
    }
  }
}