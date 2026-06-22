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
}