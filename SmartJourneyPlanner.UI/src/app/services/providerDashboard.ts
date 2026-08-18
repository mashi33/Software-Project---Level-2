import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  private apiUrl = 'http://localhost:5233/api/providerdashboard';

  constructor(private http: HttpClient) {}

  
  getStats(): Observable<any> {
    // Fetches aggregated dashboard data to avoid multiple frontend calculations
    return this.http.get<any>(`${this.apiUrl}/stats`);
  }

 // Look for getVehicles() inside your service file and change ONLY it:
getVehicles(): Observable<any[]> {
  const token = localStorage.getItem('token');
  const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

  // Passes headers securely to the endpoint we configured in the controller
  return this.http.get<any[]>(`${this.apiUrl}/vehicles`, { headers });
}
  getBookings(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/bookings`);
  }

  deleteVehicle(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/vehicles/${id}`);
  }

  updateAvailability(id: string, available: boolean): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/vehicles/${id}/availability`, available);
  }

  deleteBooking(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/bookings/${id}`);
  }

  // Blocked Date Ranges API calls
  addBlockedDateRange(vehicleId: string, startDate: string, endDate: string, reason: string): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const body = { startDate, endDate, reason };
    return this.http.post<any>(`${this.apiUrl}/vehicles/${vehicleId}/blocked-ranges`, body, { headers });
  }

  editBlockedDateRange(vehicleId: string, rangeId: string, startDate: string, endDate: string, reason: string): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    const body = { startDate, endDate, reason };
    return this.http.put<any>(`${this.apiUrl}/vehicles/${vehicleId}/blocked-ranges/${rangeId}`, body, { headers });
  }

  deleteBlockedDateRange(vehicleId: string, rangeId: string): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.delete<any>(`${this.apiUrl}/vehicles/${vehicleId}/blocked-ranges/${rangeId}`, { headers });
  }

  getBlockedDateRanges(vehicleId: string): Observable<any[]> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<any[]>(`${this.apiUrl}/vehicles/${vehicleId}/blocked-ranges`, { headers });
  }
}