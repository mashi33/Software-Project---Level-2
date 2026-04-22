import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { jwtDecode } from 'jwt-decode'; // Clean decoder

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  // Uses the URL we fixed in your environment file earlier
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

  // Standardized key name to 'token' to match your latest preference
  saveToken(token: string): void {
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // THE NEW & IMPROVED ROLE READER
  getUserRole(): string {
    const token = this.getToken();
    
    if (!token) return 'Guest'; 

    try {
      // Using the library instead of manual splitting/atob
      const decoded: any = jwtDecode(token);
      
      // Standard .NET role claims
      return decoded['role'] || 
             decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || 
             'User';
      
    } catch (error) {
      console.error('Token decoding failed', error);
      return 'User';
    }
  }

  logout(): void {
    localStorage.removeItem('token');
  }
}