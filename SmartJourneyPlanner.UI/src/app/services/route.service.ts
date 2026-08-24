import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Handles Google Places autocomplete and route optimization API calls.
@Injectable({ providedIn: 'root' })
export class RouteService {
  private sessionToken?: google.maps.places.AutocompleteSessionToken;

  /* Requests taking longer than this are treated as timed out.
   Kept slightly above the backend's own 20s Google-API timeout so the
   backend's own timeout error (with a clearer message) wins the race.*/
  private readonly REQUEST_TIMEOUT_MS = 25000;

  constructor(private http: HttpClient) {}

  // Creates a new session token for Google Places API.
  refreshSessionToken() {
    this.sessionToken = new google.maps.places.AutocompleteSessionToken();
  }

  /* Returns place predictions from Google Autocomplete based on user input.
   Reuses the existing session token, or creates one if none exists. */
  getPredictions(input: string): Promise<google.maps.places.AutocompletePrediction[]> {
    // Create a session token if one doesn't exist yet
    if (!this.sessionToken) {
      this.refreshSessionToken();
    }

    const service = new google.maps.places.AutocompleteService();
    return new Promise((resolve) => {
      service.getPlacePredictions({
        input,
        sessionToken: this.sessionToken,
        componentRestrictions: { country: 'lk' } // Limited to Sri Lanka
      }, (res) => resolve(res || []));
    });
  }

  // Sends start and end locations to the backend and returns optimized route options.
  getOptimizedRoutes(start: string, end: string): Observable<any> {
    const apiUrl = `${environment.apiUrl}/routes/optimize`;
    return this.http.post<any>(apiUrl, { start, end }).pipe(
      timeout(this.REQUEST_TIMEOUT_MS),
      catchError((err) => this.handleHttpError(err))
    );
  }

  /* Sends start and end locations to the backend and returns NTC bus fare details.
   Used when user selects Public Transport mode. */
  getBusFare(start: string, end: string): Observable<any> {
    const apiUrl = `${environment.apiUrl}/routes/bus-fare`;
    return this.http.post<any>(apiUrl, { start, end }).pipe(
      timeout(this.REQUEST_TIMEOUT_MS),
      catchError((err) => this.handleHttpError(err))
    );
  }

  // Handles HTTP errors and returns a user-friendly error message.
  private handleHttpError(err: unknown): Observable<never> {
    // RxJS timeout() throws a TimeoutError, not an HttpErrorResponse
    if (err instanceof Error && err.name === 'TimeoutError') {
      return throwError(() => ({
        errorType: 'timeout',
        message: 'The request took too long to respond. Please check your connection and try again.'
      }));
    }

    if (err instanceof HttpErrorResponse) {
      
      // no internet connection, DNS failure, or the backend is unreachable
      if (err.status === 0) {
        return throwError(() => ({
          errorType: 'network',
          message: 'Unable to connect. Please check your internet connection and try again.'
        }));
      }

      // Backend responded with a structured error — prefer its own message/errorType
      return throwError(() => ({
        errorType: err.error?.errorType || 'server',
        message: err.error?.message || 'Something went wrong. Please try again.',
        status: err.status
      }));
    }

    return throwError(() => ({
      errorType: 'unknown',
      message: 'An unexpected error occurred. Please try again.'
    }));
  }
}