import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  
  // ✅ Automatically builds: http://localhost:5233/api/Trips (or /Admin)
  private baseUrl = environment.apiUrl; 

  constructor() { }

  // --- 🚐 Transport Provider Methods ---

  getPendingProviders(): Observable<any[]> {
    // Adjust endpoint name to match your C# [HttpGet] attribute exactly
    return this.http.get<any[]>(`${this.baseUrl}/Admin/pending-providers`);
  }

  updateProviderStatus(id: string, status: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/Admin/verify-provider/${id}`, { status: status });
  }

  // --- 👥 User Management Methods ---

  getAllUsers(): Observable<any[]> {
    // This calls [HttpGet("all-users")] in your C# Controller
    return this.http.get<any[]>(`${this.baseUrl}/Admin/all-users`);
  }

  updateUserRole(userId: string, newRole: string): Observable<any> {
    // This calls [HttpPut("promote-user/{id}")] in your C# Controller
    // We send the role as a raw string inside quotes to match C# [FromBody] string expectations
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put(`${this.baseUrl}/Admin/promote-user/${userId}`, `"${newRole}"`, { headers });
  }
}