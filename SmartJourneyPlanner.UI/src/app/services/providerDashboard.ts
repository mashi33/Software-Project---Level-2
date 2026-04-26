import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  private apiUrl = 'http://localhost:5233/api/providerdashboard';

  constructor(private http: HttpClient) {}

  
  getStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats`);
  }

  getVehicles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/vehicles`);
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