import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

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

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    const userType = this.authService.getUserSystemType();
    this.isProvider = (userType === 'TransportProvider' || userType === 'Provider');

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
    if (this.isProvider) {
      localStorage.setItem('providerNotificationSettings', JSON.stringify(this.providerSettings));
    } else {
      localStorage.setItem('travelerNotificationSettings', JSON.stringify(this.travelerSettings));
    }
    alert('Preferences saved successfully!');
  }
}
