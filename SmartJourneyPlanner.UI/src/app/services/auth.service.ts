import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.development';
import { jwtDecode } from 'jwt-decode'; // Clean decoder
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  // API base URL retrieved from the environment configuration
  private apiUrl = environment.apiUrl; 

  // BehaviorSubject to hold the current user's name for reactive updates 
  private userNameSubject = new BehaviorSubject<string>(
    localStorage.getItem('userName') || ''  
  );

  constructor(private http: HttpClient) { }

  // --- API CALLS ---
  
  //Sends login credentials to the backend.
  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/Auth/login`, credentials);
  }
  
  //Sends registration data to the backend.
  signup(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/Auth/register`, userData);
  }

  // --- TOKEN & ROLE MANAGEMENT ---

  /**
   * Persists the JWT token and extracts user claims (ID, Name).
   * Updates the BehaviorSubject for reactive UI updates.
   */
  saveToken(token: string): void {
    localStorage.setItem('token', token);

    try {
      const decoded: any = jwtDecode(token);// Decode the token to extract claims (user info, roles, etc.)

      // .NET JWT claims can vary, so we check multiple common claim types for user ID and name
      const userId = decoded['sub'] || 
                     decoded['userId'] ||
                     decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || 
                     '';

      const userName = decoded['name'] || 
                       decoded['userName'] ||
                       decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || 
                       '';

      localStorage.setItem('userId', userId);// Save user ID for later use in profile, etc.
      localStorage.setItem('userName', userName);// Save user name for display in navbar, etc.
      this.userNameSubject.next(userName);

    } catch (error) {
      console.error('Token decode failed:', error);
    }
  }
  
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getUserId(): string | null {
    return localStorage.getItem('userId');
  }

  getUserName(): string | null {
    return localStorage.getItem('userName');
  }

  /**
   * Decodes the token to retrieve the assigned user role.
   * Supports standard .NET identity claims.
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
  
  // Clears all authentication-related data from local storage and resets the user name subject.
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userType');
    this.userNameSubject.next('User');
    localStorage.removeItem('userRole'); // Clean up both
  }
}