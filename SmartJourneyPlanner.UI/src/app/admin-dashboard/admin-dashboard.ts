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
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboardComponent implements OnInit {
  pendingProviders: TransportProvider[] = [];
  errorMessage: string = '';
  selectedProvider: TransportProvider | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Hardcoded data removed. Dashboard now depends entirely on fetchPendingProviders().
    this.fetchPendingProviders();
  }

  // Helper to generate the Auth header for every request
  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  fetchPendingProviders() {
    this.http.get<TransportProvider[]>('http://localhost:5233/api/admin/pending-providers', { headers: this.getHeaders() })
      .subscribe({
        next: (data) => { 
          this.pendingProviders = data;
          this.errorMessage = ''; 
        },
        error: (err) => { 
          this.errorMessage = 'Unauthorized or Backend Offline. Please log in as Admin.';
          console.error('API Error:', err);
        }
      });
  }

  viewDetails(provider: TransportProvider) {
    this.selectedProvider = provider;
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