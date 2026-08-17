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

  constructor(private http: HttpClient) { }

  // --- API CALLS ---
  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/Auth/login`, credentials);
  }

  signup(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/Auth/register`, userData);
  }

  // --- TOKEN & ROLE MANAGEMENT ---

  // Get the token from localStorage, decode it, and extract user information to store in localStorage for easy access across the app
  saveToken(token: string, backendUserType?: string, backendUserName?: string, backendProfilePic?: string): void {
    localStorage.setItem('token', token);

    try {
      const decoded: any = jwtDecode(token);

      //Get the user type from the backend response if provided, otherwise decode it from the token or fallback to 'Traveler'
      const finalUserType = backendUserType || decoded['UserType'] || decoded['userType'] || 'Traveller';
      localStorage.setItem('userType', finalUserType);

      // roll inside the  trip
      const tripRole = decoded['role'] || decoded['tripRole'] || '';
      localStorage.setItem('tripRole', tripRole);

      // 3. save user id
      const userId = decoded['sub'] || decoded['userId'] || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || '';
      localStorage.setItem('userId', userId);

      // 4. Save User Name 
      const userName = backendUserName || decoded['name'] || decoded['userName'] || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || '';
      localStorage.setItem('userName', userName);
      this.userNameSubject.next(userName);

      // 5. Save Email 
      const email = decoded['email'] || decoded['unique_name'] || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || '';
      localStorage.setItem('email', email);

      // 6. Save Profile Picture if provided by backend
      const profilePic = backendProfilePic || 'assets/default-avatar.png';
      localStorage.setItem('profilePic', profilePic);

    } catch (error) {
      console.error('Token decode failed:', error);
    }
  }
  // Method to retrieve the user system type (e.g., Traveler, Provider) from localStorage, defaulting to 'Traveler' if not found
  getUserSystemType(): string {
    return localStorage.getItem('userType') || 'Traveller';
  }

  // Method to retrieve the user role within a trip (e.g., viewer, editor) from localStorage, defaulting to 'viewer' if not found
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Method to check if the user is currently logged in by verifying the presence of a valid token in localStorage
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // Method to retrieve the user identifier from localStorage, which can be used for session management and API calls
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

  // Method to retrieve the user's display name from localStorage, which can be used for personalization across the app
  getUserName(): string | null {
    return localStorage.getItem('userName');
  }
  // Method to retrieve the user's email address from localStorage, which can be used for profile display and communication purposes
  getUserEmail(): string | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      // Decode dynamically to prevent user tampering
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

  // Method to retrieve the user's role within a trip from the token or localStorage, providing a fallback to 'User' if not found
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

  // Forgot Password - User enters their email, and we send it to the backend to initiate the password reset process (e.g., sending a reset link)
  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  // Reset Password - User submits their new password along with the reset token they received via email
  resetPassword(model: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/reset-password`, model);
  }

  // Method to retrieve the user's profile picture URL from localStorage, providing a default image if not set
  getProfilePic(): string {
    return localStorage.getItem('profilePic') || 'assets/default-avatar.png';
  }

  // Method to clear all authentication-related data from localStorage, effectively logging the user out of the application
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('email');
    localStorage.removeItem('userType');
    localStorage.removeItem('userRole');
    this.userNameSubject.next('User');
  }
}