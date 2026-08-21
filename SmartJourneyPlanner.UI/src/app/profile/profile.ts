import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { UserService } from '../services/user-profile.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { TravellerDashboardService } from '../services/travellerDashboard';
import { MemoryService } from '../services/memory';
import { TransportBookingService } from '../services/transport-booking.service';
import { AchievementService, AchievementSummary } from '../services/achievement.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class ProfileComponent implements OnInit {

  @ViewChild('fileInput') fileInput!: ElementRef;

  user: any = null;
  userId: string | null = null;
  isEditMode = false;
  showPasswordSection = false;
  loadingStats = true;
  loadingAchievements = true;

  achievementSummary: AchievementSummary | null = null;

  stats = {
    upcomingTrips: 0,
    memories: 0,
    vehicles: 0,
    bookings: 0,
    averageRating: 0,
    completedTrips: 0
  };

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

  feedbackData = {
    comment: ''
  };
  isSubmitting: boolean = false;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
    private dashboardService: TravellerDashboardService,
    private memoryService: MemoryService,
    private bookingService: TransportBookingService,
    private achievementService: AchievementService
  ) { }

  ngOnInit(): void {
    this.userId = this.authService.getUserId();
    if (!this.userId) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadUserProfile();
  }

  get userRole(): string {
    return this.user?.userType || this.user?.role || '';
  }

  isProvider(): boolean {
    return this.userRole === 'Provider' || this.userRole === 'TransportProvider';
  }

  get level(): number {
    return this.achievementSummary?.level ?? 1;
  }

  get totalXp(): number {
    return this.achievementSummary?.totalXp ?? 0;
  }

  get xpToNextLevel(): number {
    return this.achievementSummary?.xpToNextLevel ?? 150;
  }

  get levelProgressPercent(): number {
    const xpInLevel = this.totalXp % 150;
    return Math.round((xpInLevel / 150) * 100);
  }

  get travellerRankTitle(): string {
    const lvl = this.level;
    const badges = this.achievementSummary?.unlockedCount ?? 0;

    if (badges >= 6) return 'Island Legend';
    if (badges >= 5) return 'Voyage Master';
    if (lvl >= 20) return 'Journey Legend';
    if (lvl >= 15) return 'Seasoned Explorer';
    if (lvl >= 10) return 'Adventurer';
    if (lvl >= 5) return 'Pathfinder';
    if (lvl >= 2) return 'Rising Traveller';
    return 'Novice Explorer';
  }

  get providerRankTitle(): string {
    if (this.stats.averageRating >= 4.5 && this.stats.bookings >= 5) return 'Top Rated Provider';
    if (this.stats.averageRating >= 4.0 && this.stats.bookings >= 3) return 'Trusted Fleet';
    if (this.stats.vehicles >= 3) return 'Fleet Owner';
    if (this.stats.bookings >= 1) return 'Active Provider';
    return 'New Provider';
  }

  get unlockedBadges(): number {
    return this.achievementSummary?.unlockedCount ?? 0;
  }

  get recentBadges() {
    return (this.achievementSummary?.badges ?? [])
      .filter(b => b.isUnlocked)
      .slice(0, 4);
  }

  getInterestEmoji(interest: string): string {
    const map: { [key: string]: string } = {
      'Hiking': '🥾',
      'Beach': '🏖️',
      'Photography': '📸',
      'Camping': '⛺',
      'Foodie': '🍜',
      'Culture': '🏛️',
      'Adventure': '⛰️',
      'Nature': '🌿',
      'Car (Sedan)': '🚗',
      'SUV / Jeep': '🚙',
      'KDH Van': '🚐',
      'Mini Bus': '🚌',
      'Luxury Coaster': '🚍',
      '4x4 Off-Road': '🛻'
    };
    return map[interest] || '✨';
  }

  showSuccess(message: string) {
    Swal.fire({ icon: 'success', title: 'Success', text: message, timer: 2500, timerProgressBar: true });
  }

  showError(message: string) {
    Swal.fire({ icon: 'error', title: 'Oops...', text: message });
  }

  loadUserProfile() {
    if (!this.userId) return;

    this.userService.getUserProfile(this.userId).subscribe({
      next: (data) => {
        this.user = data;
        this.availableInterests = this.isProvider()
          ? ['Car (Sedan)', 'SUV / Jeep', 'KDH Van', 'Mini Bus', 'Luxury Coaster', '4x4 Off-Road']
          : ['Hiking', 'Beach', 'Photography', 'Camping', 'Foodie', 'Culture', 'Adventure', 'Nature'];
        this.loadProfileStats();
      },
      error: (err) => console.error('Error fetching profile:', err)
    });
  }

  loadProfileStats() {
    if (!this.userId) return;
    this.loadingStats = true;

    if (this.isProvider()) {
      this.loadingAchievements = false;
      forkJoin({
        vehicles: this.http.get<any[]>(`${environment.apiUrl}/TransportVehicles/my-vehicles/${this.userId}`).pipe(
          catchError(() => of([]))
        ),
        bookings: this.bookingService.getProviderBookings(this.userId).pipe(
          catchError(() => of([]))
        )
      }).subscribe({
        next: ({ vehicles, bookings }) => {
          this.stats.vehicles = vehicles?.length || 0;
          this.stats.bookings = bookings?.length || 0;
          this.stats.averageRating = this.calculateAverageRating(vehicles || []);
          this.loadingStats = false;
        },
        error: () => { this.loadingStats = false; }
      });
      return;
    }

    forkJoin({
      dashboard: this.dashboardService.getDashboardData().pipe(catchError(() => of({ upcomingCount: 0, completedCount: 0 }))),
      memories: this.memoryService.getMemoryCount(this.userId!).pipe(catchError(() => of({ count: 0 }))),
      achievements: this.achievementService.getSummary().pipe(catchError(() => of(null)))
    }).subscribe({
      next: ({ dashboard, memories, achievements }) => {
        this.stats.upcomingTrips = dashboard?.upcomingCount || 0;
        this.stats.completedTrips = dashboard?.completedCount || 0;
        this.stats.memories = memories?.count || 0;
        this.achievementSummary = achievements;
        this.loadingAchievements = false;
        this.loadingStats = false;
      },
      error: () => {
        this.loadingAchievements = false;
        this.loadingStats = false;
      }
    });
  }

  calculateAverageRating(vehicles: any[]): number {
    const allRatings: number[] = [];
    vehicles.forEach(vehicle => {
      const reviews = vehicle.reviews || vehicle.Reviews || [];
      reviews.forEach((review: any) => {
        const rating = review.rating ?? review.Rating;
        if (typeof rating === 'number') allRatings.push(rating);
      });
    });
    if (!allRatings.length) return 0;
    const avg = allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length;
    return Math.round(avg * 10) / 10;
  }

  getRatingStars(): number[] {
    const full = Math.floor(this.stats.averageRating);
    return Array(full).fill(0);
  }

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

  changePasswordLogic() {
    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      this.showError('New password and confirm password do not match!');
      return;
    }

    this.http.put(`${environment.apiUrl}/users/change-password/${this.userId}`, {
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

  submitFeedback() {
    if (!this.feedbackData.comment.trim()) {
      Swal.fire('Warning', 'Please write something before submitting!', 'warning');
      return;
    }

    this.isSubmitting = true;

    const payload = {
      comment: this.feedbackData.comment,
      userName: this.user?.fullName || 'Anonymous',
      userRole: this.user?.userType || this.user?.role || 'Traveller',
      profilePictureUrl: this.user?.profilePictureUrl || ''
    };

    const feedbackRequest = this.userService.addComment(payload) as any;

    if (!feedbackRequest || typeof feedbackRequest.subscribe !== 'function') {
      this.isSubmitting = false;
      Swal.fire('Error', 'Feedback service is unavailable right now. Please try again later.', 'error');
      return;
    }

    feedbackRequest.subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          title: 'Thank You!',
          text: 'Your feedback has been successfully shared.',
          timer: 2000,
          showConfirmButton: false
        });
        this.feedbackData.comment = '';
      },
      error: (err: any) => {
        this.isSubmitting = false;
        console.error('Failed to submit feedback', err);
        Swal.fire('Error', 'Failed to submit feedback. Please try again later.', 'error');
      }
    });
  }
}