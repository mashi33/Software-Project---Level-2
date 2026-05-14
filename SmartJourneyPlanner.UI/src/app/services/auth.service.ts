import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.development';
import { jwtDecode } from 'jwt-decode'; 
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl; 

  private userNameSubject = new BehaviorSubject<string>(
    localStorage.getItem('userName') || ''  
  );

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

    try {
      const decoded: any = jwtDecode(token);

      // 1. Capture the role specifically (Handles standard .NET claims)
      const role = decoded['role'] || 
                   decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || 
                   '';
      localStorage.setItem('userRole', role);

      // 2. Extract User ID
      const userId = decoded['sub'] || 
                     decoded['userId'] ||
                     decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || 
                     '';
      localStorage.setItem('userId', userId);

      // 3. Extract User Name
      const userName = decoded['name'] || 
                       decoded['userName'] ||
                       decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || 
                       '';
      localStorage.setItem('userName', userName);
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

  getUserRole(): string {
    const token = this.getToken();
    if (!token) return 'Guest'; 

    try {
      const decoded: any = jwtDecode(token);
      const role = decoded['role'] || 
                   decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      
      return role || localStorage.getItem('userRole') || 'User';
    } catch (error) {
      console.error('Token decoding failed', error);
      return localStorage.getItem('userRole') || 'User';
    }
  }
  
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userType');
    localStorage.removeItem('userRole'); 
    this.userNameSubject.next('User');
  }
}