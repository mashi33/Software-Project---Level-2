import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  constructor() { }

  // --- 📊 New Dashboard Metrics Method ---
  /**
   * 🔑 THE FIX: Hits our new summary calculation gateway method inside AdminController
   * to bring home unified analytics, counters, and tracking statistics metrics.
   */
  getDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Admin/dashboard-stats`);
  }

  // --- Provider Methods ---
  getPendingProviders(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Admin/pending-providers`);
  }

  getProviderById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Admin/provider-detail/${id}`);
  }

  updateProviderStatus(id: string, status: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put(`${this.baseUrl}/Admin/update-status/${id}`, JSON.stringify(status), { headers });
  }

  // --- User Management Methods ---
  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Admin/all-users`);
  }

  updateUserRole(userId: string, newRole: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const body = JSON.stringify(newRole);
    return this.http.put(`${this.baseUrl}/Admin/promote-user/${userId}`, body, { headers });
  }

  toggleBlockUser(userId: string, isBlocked: boolean): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put(`${this.baseUrl}/Admin/toggle-block/${userId}`, { isBlocked }, { headers });
  }

  deleteUser(userId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/Admin/delete-user/${userId}`);
  }
}