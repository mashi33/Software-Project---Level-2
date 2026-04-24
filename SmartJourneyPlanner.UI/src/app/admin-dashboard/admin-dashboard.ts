import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';

interface TransportProvider {
  id: string;
  fullName: string;
  vehicleModel: string;
  vehicleType: string; 
  registrationNumber: string;
  status: string; 
  licenseUrl?: string;
  nicUrl?: string;
  
  // New fields from TransportVehicle
  description?: string;
  type?: string;
  vehicleClass?: string;
  seatCount?: number;
  isAc?: boolean;
  standardDailyRate?: number;
  driverNightOutFee?: number;
  interiorPhoto?: string;
  exteriorPhoto?: string;
  driverNicUrl?: string;
  driverLicenseUrl?: string;
  insuranceDocUrl?: string;
  revenueLicenseUrl?: string;
  providerProfile?: {
    name: string;
    phone: string;
    location: string;
  };
}

@Component({
    selector: 'app-admin-dashboard',
    imports: [CommonModule],
    templateUrl: './admin-dashboard.html',
    styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboardComponent implements OnInit {
  pendingProviders: any[] = []; // List to store vehicles waiting for approval
  errorMessage: string = '';    // String to store any error messages
  selectedProvider: any = null; // Currently selected vehicle for the 'View Docs' modal

  constructor(private http: HttpClient) {}

  // This runs when the page loads
  ngOnInit() {
    this.fetchPendingProviders();
  }

  // Gets the security token from browser storage
  getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // Fetches the list of pending vehicles from the Backend API
  fetchPendingProviders() {
    this.http.get<any[]>('http://localhost:5233/api/admin/pending-providers', { headers: this.getHeaders() })
      .subscribe({
        next: (data) => { 
          console.log('Fetched Pending:', data);
          this.pendingProviders = data; // Save the data to our list
          this.errorMessage = '';       // Clear any previous errors
        },
        error: (err) => { 
          // Show error if backend is offline or unauthorized
          this.errorMessage = 'Unauthorized or Backend Offline. Please log in as Admin.';
          console.error('API Error:', err);
        }
      });
  }

  // Opens the detailed review modal for a specific vehicle
  viewDetails(provider: any) {
    console.log('Viewing Provider Details:', provider);
    this.selectedProvider = provider;
  }

  openImage(url: string | undefined) {
    if (url) {
      window.open(url, '_blank');
    }
  }

  updateProviderStatus(providerId: string, newStatus: string) {
    this.http.put(`http://localhost:5233/api/admin/verify-provider/${providerId}`, 
      { status: newStatus }, 
      { headers: this.getHeaders() }
    ).subscribe({
      next: () => {
        // Success: Remove from UI list
        this.pendingProviders = this.pendingProviders.filter(p => p.id !== providerId);
        this.selectedProvider = null; 
      },
      error: (err) => {
        console.error('Failed to update status', err);
        this.errorMessage = 'Action failed. You may not have permission.';
      }
    });
  }
}