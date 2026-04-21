import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  // Ensure this URL matches your backend port (e.g., 5001 or 7000)
  private apiUrl = 'https://localhost:5001/api/providerdashboard';

  constructor(private http: HttpClient) {}

  // --- GET Methods ---
  
  getStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats`);
  }

  getVehicles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/vehicles`);
  }

  getBookings(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/bookings`);
  }

  // --- Action Methods ---

  deleteVehicle(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/vehicles/${id}`);
  }

  // Note: Ensure your backend controller handles the 'available' boolean correctly
  updateAvailability(id: string, available: boolean): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/vehicles/${id}/availability`, available);
  }

  deleteBooking(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/bookings/${id}`);
  }
}