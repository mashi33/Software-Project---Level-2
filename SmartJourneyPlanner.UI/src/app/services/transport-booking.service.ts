import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Booking } from '../models/transport.model';

/**
 * This service manages all booking-related operations between the UI and the database.
 * It handles creating, updating, and fetching trip requests.
 */
@Injectable({
  providedIn: 'root'
})
export class TransportBookingService {
  // The URL for the Booking API
  private apiUrl = 'http://localhost:5233/api/TransportBookings';

  constructor(private http: HttpClient) { }

  /**
   * Fetches every single booking record in the system (Admin use).
   */
  getBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(this.apiUrl);
  }

  /**
   * Fetches the trips booked by a specific traveler (user).
   */
  getUserBookings(userId: string): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.apiUrl}/user/${userId}`);
  }

  /**
   * Fetches the booking requests received by a specific vehicle owner (provider).
   */
  getProviderBookings(providerId: string): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.apiUrl}/provider/${providerId}`);
  }

  /**
   * Gets details for one specific booking record.
   */
  getBookingById(id: string): Observable<Booking> {
    return this.http.get<Booking>(`${this.apiUrl}/${id}`);
  }

  /**
   * Sends a new booking request from a traveler to the database.
   */
  createBooking(booking: Booking): Observable<Booking> {
    return this.http.post<Booking>(this.apiUrl, booking);
  }

  /**
   * Updates the status of a trip (e.g. to 'Confirmed', 'Rejected', or 'Cancelled').
   */
  updateBookingStatus(id: string, status: string, cancelledBy?: string): Observable<void> {
  const body: any = { status };
  if (cancelledBy) {
    body.cancelledBy = cancelledBy;
  }

  const token = localStorage.getItem('token');
  const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

  return this.http.patch<void>(`${this.apiUrl}/${id}/status`, body, { headers });
}

  /**
   * Marks a booking as 'Rated' after the user submits their review.
   */
  markBookingAsRated(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/rated`, {});
  }

  /**
   * Removes a booking record from the history.
   */
  deleteBooking(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
