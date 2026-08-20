import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css']
})
export class SettingsComponent implements OnInit {
  isProvider: boolean = false;

  providerSettings = {
    bookingRequests: true,
    cancellations: true,
    vehicleApprovals: true,
    customerReviews: true,
    policyUpdates: false,
    emailAlerts: true,
    pushAlerts: true
  };

  travelerSettings = {
    bookingConfirmations: true,
    tripReminders: true,
    weatherAlerts: true,
    budgetAlerts: true,
    memoryPrompts: true,
    emailAlerts: true,
    pushAlerts: true
  };

  constructor(
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    const userType = this.authService.getUserSystemType();
    this.isProvider = (userType === 'TransportProvider' || userType === 'Provider');
    const userId = this.authService.getUserId();

    if (userId) {
      this.notificationService.getSettings(userId).subscribe({
        next: (dbSettings) => {
          if (dbSettings) {
            if (this.isProvider) {
              this.providerSettings = { ...this.providerSettings, ...dbSettings };
            } else {
              this.travelerSettings = { ...this.travelerSettings, ...dbSettings };
            }
          }
        },
        error: (err) => {
          console.error('Failed to load settings from database, falling back to local storage', err);
          this.loadFromLocalStorage();
        }
      });
    } else {
      this.loadFromLocalStorage();
    }
  }

  loadFromLocalStorage() {
    if (this.isProvider) {
      const saved = localStorage.getItem('providerNotificationSettings');
      if (saved) {
        try {
          this.providerSettings = { ...this.providerSettings, ...JSON.parse(saved) };
        } catch (e) {
          console.error('Failed to parse provider settings', e);
        }
      }
    } else {
      const saved = localStorage.getItem('travelerNotificationSettings');
      if (saved) {
        try {
          this.travelerSettings = { ...this.travelerSettings, ...JSON.parse(saved) };
        } catch (e) {
          console.error('Failed to parse traveler settings', e);
        }
      }
    }
  }

  onSaveSettings() {
    const userId = this.authService.getUserId();

    // Save locally
    if (this.isProvider) {
      localStorage.setItem('providerNotificationSettings', JSON.stringify(this.providerSettings));
    } else {
      localStorage.setItem('travelerNotificationSettings', JSON.stringify(this.travelerSettings));
    }

    if (userId) {
      const payload = this.isProvider
        ? { userId, ...this.providerSettings }
        : { userId, ...this.travelerSettings };

      this.notificationService.saveSettings(payload).subscribe({
        next: () => {
          alert('Preferences saved successfully!');
        },
        error: (err) => {
          console.error('Failed to save settings to server', err);
          alert('Preferences saved locally, but failed to sync with the server.');
        }
      });
    } else {
      alert('Preferences saved successfully!');
    }
  }
}
