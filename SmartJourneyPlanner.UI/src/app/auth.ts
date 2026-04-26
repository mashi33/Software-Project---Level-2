import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  //.NET backend url
  private baseUrl = 'http://localhost:5233/api/Auth';

  constructor(private http: HttpClient) { }

  login(credentials: any): Observable<any> { 
    return this.http.post(`${this.baseUrl}/login`, credentials);
  }

  signup(userData: any) {
  // Backend API url
  return this.http.post(`${this.baseUrl}/register`, userData);
}
}
