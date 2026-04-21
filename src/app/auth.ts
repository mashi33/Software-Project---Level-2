import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  //.NET backend url
  private apiUrl = 'http://localhost:5098/api/Auth/login'; 

  constructor(private http: HttpClient) { }

  login(credentials: any): Observable<any> {
    return this.http.post(this.apiUrl, credentials);
    
  }

  signup(userData: any) {
  // Backend API url
  return this.http.post('http://localhost:5098/api/Auth/register', userData);
}
}
