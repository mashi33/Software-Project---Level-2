import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root' 
})
export class UserService {

  private apiUrl = 'http://localhost:5233/api/users'; 

  // Inject HttpClient to make HTTP requests
  constructor(private http: HttpClient) {}

  // GET: Fetch user profile by ID
  getUserProfile(userId: string): Observable<any> {
    // Sends GET request to: /api/users/{id}
    return this.http.get(`${this.apiUrl}/${userId}`);
  }

  // PUT: Update user profile by ID
  updateProfile(userId: string, userData: any): Observable<any> {
    // Sends PUT request to: /api/users/{id} with updated data
    return this.http.put(`${this.apiUrl}/${userId}`, userData);
  }
}