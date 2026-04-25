import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { jwtDecode } from 'jwt-decode'; // Ensure you ran: npm install jwt-decode

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  // Uses the URL from your environment file
  private apiUrl = environment.apiUrl; 

  constructor(private http: HttpClient) { }

  // --- API CALLS ---

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/Auth/login`, credentials);
  }

  signup(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/Auth/register`, userData);
  }

  // --- TOKEN & ROLE MANAGEMENT ---

  saveToken(token: string): void {
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  /**
   * Decodes the JWT and extracts the user role.
   * This is used by the adminGuard to protect routes.
   */
  getUserRole(): string {
    const token = this.getToken();
    
    if (!token) return 'Guest'; 

    try {
      const decoded: any = jwtDecode(token);
      
      // .NET Core often uses the full schema URI for role claims.
      // We check both the short name and the long schema name.
      const role = decoded['role'] || 
                   decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      
      return role || 'User';
      
    } catch (error) {
      console.error('Token decoding failed', error);
      // Fallback to localStorage if decoding fails, or default to 'User'
      return localStorage.getItem('userRole') || 'User';
    }
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole'); // Clean up both
  }
}