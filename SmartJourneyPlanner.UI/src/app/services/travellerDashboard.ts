import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TravellerDashboardService {

  private apiUrl = 'http://localhost:5233/api/trips';

  constructor(private http: HttpClient) {}

  getDashboardData(userId: string): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/dashboard/${userId}`
    );
  }
}