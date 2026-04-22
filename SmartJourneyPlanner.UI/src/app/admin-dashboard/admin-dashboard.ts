import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common'; // Required for *ngIf and *ngFor

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
  standalone: true,           // Essential for modern Angular versions
  imports: [CommonModule],    // Solves the NG8103 warning
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboardComponent implements OnInit {
  pendingProviders: TransportProvider[] = [];
  errorMessage: string = '';
  
  // Tracks the provider selected for review
  selectedProvider: TransportProvider | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // 1. Load Test Data so the table isn't empty during development
    this.pendingProviders = [
      { 
        id: '1', 
        fullName: 'Kamal Perera', 
        vehicleModel: 'Toyota Axio', 
        vehicleType: 'Car', 
        registrationNumber: 'WP CAS-1234', 
        status: 'Pending',
        licenseUrl: 'https://via.placeholder.com/400x300?text=License+Photo',
        nicUrl: 'https://via.placeholder.com/400x300?text=NIC+Front'
      },
      { 
        id: '2', 
        fullName: 'Sunil Silva', 
        vehicleModel: 'Suzuki Every', 
        vehicleType: 'Van', 
        registrationNumber: 'CP BBD-5678', 
        status: 'Pending',
        licenseUrl: 'https://via.placeholder.com/400x300?text=License+Photo',
        nicUrl: 'https://via.placeholder.com/400x300?text=NIC+Front'
      }
    ];

    this.fetchPendingProviders();
  }

  fetchPendingProviders() {
    this.http.get<TransportProvider[]>('http://localhost:5233/api/admin/pending-providers').subscribe({
      next: (data: TransportProvider[]) => { 
        this.pendingProviders = data;
      },
      error: (err: any) => { 
        this.errorMessage = 'Failed to load admin data. Check if Backend is running.';
        console.error('API Error:', err);
      }
    });
  }

  viewDetails(provider: TransportProvider) {
    this.selectedProvider = provider;
  }

  updateProviderStatus(providerId: string, newStatus: string) {
    this.http.put(`http://localhost:5233/api/admin/verify-provider/${providerId}`, { status: newStatus })
      .subscribe({
        next: () => {
          this.pendingProviders = this.pendingProviders.filter(p => p.id !== providerId);
          this.selectedProvider = null; 
        },
        error: (err) => {
          console.error('Failed to update status', err);
          // Fallback for testing: remove from list anyway
          this.pendingProviders = this.pendingProviders.filter(p => p.id !== providerId);
        }
      });
  }
}