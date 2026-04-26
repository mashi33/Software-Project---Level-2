import { Injectable, inject } from '@angular/core'; // ✅ Fixed: Import from @angular/core
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl; 

  constructor() { }

  // --- 1. DASHBOARD HOME & REFRESH ---
  // (Uses methods below to show counts on the home cards)

  // --- 2. MANAGE PROVIDERS ---
  getPendingProviders(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/Admin/pending-providers`);
  }

  getProviderById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/Admin/provider-detail/${id}`);
  }

  updateProviderStatus(id: string, status: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put(`${this.apiUrl}/Admin/update-status/${id}`, JSON.stringify(status), { headers });
  }

  // --- 3. USER MANAGEMENT ---
  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/Admin/all-users`);
  }

  toggleBlockUser(userId: string, isBlocked: boolean): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put(`${this.apiUrl}/Admin/toggle-block/${userId}`, { isBlocked }, { headers });
  }

  deleteUser(userId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/Admin/delete-user/${userId}`);
  }

  // --- 4. ROLE PROMOTION ---
  updateUserRole(userId: string, newRole: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put(`${this.apiUrl}/Admin/promote-user/${userId}`, JSON.stringify(newRole), { headers });
  }
}
