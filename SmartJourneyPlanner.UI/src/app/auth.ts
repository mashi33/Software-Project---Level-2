import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  //.NET backend url
  private apiUrl = 'https://localhost:7023/api/Auth/login'; 

  constructor(private http: HttpClient) { }

  login(credentials: any): Observable<any> {
    return this.http.post(this.apiUrl, credentials);
  }

  signup(userData: any) {
  // Backend API url
  return this.http.post('https://localhost:7023/api/Auth/register', userData);
}
}
