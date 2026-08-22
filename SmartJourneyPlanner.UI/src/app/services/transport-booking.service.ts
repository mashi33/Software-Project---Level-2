import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Booking } from '../models/transport.model';

/**
 * This service manages all booking-related operations between the UI and the database.
 * It features in-memory caching and pre-fetching for instant (0ms) My Bookings loading.
 */
@Injectable({
  providedIn: 'root'
})
export class TransportBookingService {
  // The URL for the Booking API
  private apiUrl = 'http://localhost:5233/api/TransportBookings';

  // In-memory RAM caches for instant My Bookings rendering
  private userBookingsCache = new Map<string, { data: Booking[]; timestamp: number }>();
  private providerBookingsCache = new Map<string, { data: Booking[]; timestamp: number }>();
  private readonly CACHE_LIFETIME_MS = 60 * 1000; // 60 seconds fresh cache

  constructor(private http: HttpClient) { }

  /**
   * Fetches every single booking record in the system (Admin use).
   */
  getBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(this.apiUrl);
  }

  /**
   * Synchronously returns cached user bookings if present for 0ms instant display.
   */
  getCachedUserBookings(userId: string): Booking[] | null {
    const cached = this.userBookingsCache.get(userId);
    return cached ? cached.data : null;
  }

  /**
   * Synchronously returns cached provider bookings if present for 0ms instant display.
   */
  getCachedProviderBookings(providerId: string): Booking[] | null {
    const cached = this.providerBookingsCache.get(providerId);
    return cached ? cached.data : null;
  }

  /**
   * Fetches the trips booked by a specific traveler (user) with smart caching.
   */
  getUserBookings(userId: string, forceRefresh = false): Observable<Booking[]> {
    const cached = this.userBookingsCache.get(userId);
    const now = Date.now();

    if (!forceRefresh && cached && (now - cached.timestamp < this.CACHE_LIFETIME_MS)) {
      return of(cached.data);
    }

    return this.http.get<Booking[]>(`${this.apiUrl}/user/${userId}`).pipe(
      tap(bookings => {
        this.userBookingsCache.set(userId, { data: bookings, timestamp: Date.now() });
      }),
      catchError(err => {
        if (cached) return of(cached.data);
        throw err;
      })
    );
  }

  /**
   * Fetches the booking requests received by a specific vehicle owner (provider) with smart caching.
   */
  getProviderBookings(providerId: string, forceRefresh = false): Observable<Booking[]> {
    const cached = this.providerBookingsCache.get(providerId);
    const now = Date.now();

    if (!forceRefresh && cached && (now - cached.timestamp < this.CACHE_LIFETIME_MS)) {
      return of(cached.data);
    }

    return this.http.get<Booking[]>(`${this.apiUrl}/provider/${providerId}`).pipe(
      tap(bookings => {
        this.providerBookingsCache.set(providerId, { data: bookings, timestamp: Date.now() });
      }),
      catchError(err => {
        if (cached) return of(cached.data);
        throw err;
      })
    );
  }

  /**
   * Fetches booking requests created for a specific trip.
   */
  getBookingsByTrip(tripId: string): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.apiUrl}/trip/${tripId}`);
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
    return this.http.post<Booking>(this.apiUrl, booking).pipe(
      tap(() => this.clearBookingCache())
    );
  }

  /**
   * Updates the status of a trip (e.g. to 'Confirmed', 'Rejected', or 'Cancelled').
   */
  updateBookingStatus(id: string, status: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/status`, { status }).pipe(
      tap(() => this.clearBookingCache())
    );
  }

  /**
   * Marks a booking as 'Rated' after the user submits their review.
   */
  markBookingAsRated(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/rated`, {}).pipe(
      tap(() => this.clearBookingCache())
    );
  }

  /**
   * Removes a booking record from the history.
   */
  deleteBooking(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.clearBookingCache())
    );
  }

  /**
   * Clears memory cache whenever mutations occur.
   */
  clearBookingCache(userId?: string, providerId?: string): void {
    if (userId) this.userBookingsCache.delete(userId);
    else this.userBookingsCache.clear();

    if (providerId) this.providerBookingsCache.delete(providerId);
    else this.providerBookingsCache.clear();
  }
}
