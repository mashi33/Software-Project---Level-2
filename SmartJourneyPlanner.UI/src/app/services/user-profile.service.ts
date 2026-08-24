import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private apiUrl = `${environment.apiUrl}/users`;

  // Inject HttpClient to make HTTP requests
  constructor(private http: HttpClient) { }

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

  // add a method to send feedback
  addComment(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/add-comment`, data);
  }

  getFeedbacks(): Observable<any> {
    return this.http.get(`${this.apiUrl}/feedbacks`);
  }
}