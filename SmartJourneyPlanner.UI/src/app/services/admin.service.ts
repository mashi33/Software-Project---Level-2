import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  
  // ✅ Automatically builds from your environment file
  private baseUrl = environment.apiUrl; 

  constructor() { }

  // --- 🚐 Transport Provider Methods ---

  /**
   * Fetches the list of providers with status 'Pending'.
   * Note: This version uses projection on the backend to keep the payload light.
   */
  getPendingProviders(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Admin/pending-providers`);
  }

  /**
   * ✅ NEW: Fetches the FULL vehicle document including large Base64 images.
   * Fixes TS2339 error in the dashboard.
   */
  getProviderById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Admin/provider-detail/${id}`);
  }

  /**
   * Approves or Rejects a provider.
   * Matches the [HttpPut("update-status/{id}")] in your C# Controller.
   */
  updateProviderStatus(id: string, status: string): Observable<any> {
    // We send the status as a raw JSON string to match C# [FromBody] string expectations
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put(`${this.baseUrl}/Admin/update-status/${id}`, JSON.stringify(status), { headers });
  }

  // --- 👥 User Management Methods ---

  /**
   * Fetches all registered users for the platform management view.
   */
  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Admin/all-users`);
  }

  /**
   * Promotes or changes a user's role (e.g., Traveler -> Admin).
   */
updateUserRole(userId: string, newRole: string): Observable<any> {
  // 1. Set headers explicitly to application/json
  const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  // 2. Wrap the string in double quotes manually or via stringify
  // This ensures the payload is "Admin" instead of Admin
  const body = JSON.stringify(newRole); 

  return this.http.put(`${this.baseUrl}/Admin/promote-user/${userId}`, body, { 
    headers: headers,
    responseType: 'json' // Ensure Angular expects JSON back
  });
}
}