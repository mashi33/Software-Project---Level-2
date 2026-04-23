import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Booking } from '../models/transport.model';

@Injectable({
  providedIn: 'root'
})
export class TransportBookingService {
  private apiUrl = 'http://localhost:5233/api/TransportBookings';

  constructor(private http: HttpClient) { }

  getBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(this.apiUrl);
  }

  getUserBookings(userId: string): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.apiUrl}/user/${userId}`);
  }

  getProviderBookings(providerId: string): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.apiUrl}/provider/${providerId}`);
  }

  getBookingById(id: string): Observable<Booking> {
    return this.http.get<Booking>(`${this.apiUrl}/${id}`);
  }

  createBooking(booking: Booking): Observable<Booking> {
    return this.http.post<Booking>(this.apiUrl, booking);
  }

  updateBookingStatus(id: string, status: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/status`, { status });
  }

  markBookingAsRated(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/rated`, {});
  }

  deleteBooking(id: string) {
  // THIS MUST BE .delete()
  return this.http.delete(`/api/ProviderDashboard/bookings/${id}`);
}

completeBooking(bookingId: string) {
  // Matches the route in your Controller
  return this.http.put(`api/ProviderDashboard/bookings/${bookingId}/complete`, {});
}
  
}
