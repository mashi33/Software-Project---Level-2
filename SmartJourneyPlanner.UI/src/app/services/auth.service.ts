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
  userNameSubject$ = this.userNameSubject.asObservable();

  // ★ NEW: Profile picture subject
  private profilePicSubject = new BehaviorSubject<string>(
    localStorage.getItem('profilePic') || 'assets/default-avatar.png'
  );
  profilePicSubject$ = this.profilePicSubject.asObservable();

  constructor(private http: HttpClient) { }

  // --- API CALLS ---
  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/Auth/login`, credentials);
  }

  signup(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/Auth/register`, userData);
  }

  // --- TOKEN & ROLE MANAGEMENT ---
  saveToken(token: string, backendUserType?: string, backendUserName?: string, backendProfilePic?: string): void {
    localStorage.setItem('token', token);

    try {
      const decoded: any = jwtDecode(token);

      const finalUserType = backendUserType || decoded['UserType'] || decoded['userType'] || 'Traveller';
      localStorage.setItem('userType', finalUserType);

      const tripRole = decoded['role'] || decoded['tripRole'] || '';
      localStorage.setItem('tripRole', tripRole);

      const userId = decoded['sub'] || decoded['userId'] || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || '';
      localStorage.setItem('userId', userId);

      const userName = backendUserName || decoded['name'] || decoded['userName'] || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || '';
      localStorage.setItem('userName', userName);
      this.userNameSubject.next(userName);

      const email = decoded['email'] || decoded['unique_name'] || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || '';
      localStorage.setItem('email', email);

      // Profile picture
      const profilePic = backendProfilePic || localStorage.getItem('profilePic') || 'assets/default-avatar.png';
      localStorage.setItem('profilePic', profilePic);
      this.profilePicSubject.next(profilePic);

    } catch (error) {
      console.error('Token decode failed:', error);
    }
  }

  getUserSystemType(): string {
    return localStorage.getItem('userType') || 'Traveller';
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getUserId(): string | null {
    const userId = localStorage.getItem('userId');
    if (userId) return userId;

    const token = this.getToken();
    if (!token) return null;
    try {
      const decoded: any = jwtDecode(token);
      return decoded.userId || decoded.Id || decoded.id || null;
    } catch {
      return null;
    }
  }

  getUserName(): string | null {
    return localStorage.getItem('userName');
  }

  getUserEmail(): string | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const decoded: any = jwtDecode(token);
      return decoded['email'] ||
        decoded['unique_name'] ||
        decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
        localStorage.getItem('email');
    } catch (error) {
      console.error('Token decoding failed, falling back to storage', error);
      return localStorage.getItem('email');
    }
  }

  getUserRole(): string {
    const storedType = localStorage.getItem('userType');
    if (storedType) return storedType;

    const token = this.getToken();
    if (!token) return 'Guest';

    try {
      const decoded: any = jwtDecode(token);
      return decoded['role'] ||
        decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
        decoded['UserType'] ||
        decoded['userType'] ||
        'Traveller';
    } catch (error) {
      console.error('Token decoding failed', error);
      return 'Traveller';
    }
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(model: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/reset-password`, model);
  }

  getProfilePic(): string {
    return localStorage.getItem('profilePic') || 'assets/default-avatar.png';
  }

  // ★ NEW helper
  updateProfilePic(url: string): void {
    const pic = url || 'assets/default-avatar.png';
    localStorage.setItem('profilePic', pic);
    this.profilePicSubject.next(pic);
  }

  logout(): void {
    localStorage.clear();
    this.userNameSubject.next('');
    this.profilePicSubject.next('assets/default-avatar.png');
  }
}