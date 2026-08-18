import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TravellerDashboardService {

  // Keep your original base api url path structure
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  getDashboardData(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/trips/dashboard`);
  }

  getCustomerAlerts(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/customer-alerts/${userId}`);
  }

  dismissAlert(alertId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/customer-alerts/${alertId}/dismiss`, {});
  }

  cancelBooking(bookingId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/trips/cancel-booking/${bookingId}`, {});
  }
}