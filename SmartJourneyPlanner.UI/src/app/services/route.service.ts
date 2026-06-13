import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

/**
 * Handles Google Places autocomplete and route optimization API calls.
 */
@Injectable({ providedIn: 'root' })
export class RouteService {
  private sessionToken?: google.maps.places.AutocompleteSessionToken;

  constructor(private http: HttpClient) {}

  /**
   * Creates a new session token for Google Places API.
   * Should be called at the start of each new search to reduce billing costs.
   */
  refreshSessionToken() {
    this.sessionToken = new google.maps.places.AutocompleteSessionToken();
    console.log("New Session Token Generated");
  }

  /**
   * Returns place predictions from Google Autocomplete based on user input.
   * Reuses the existing session token, or creates one if none exists.
   */
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

  /**
   * Sends start and end locations to the backend and returns optimized route options.
   */
  getOptimizedRoutes(start: string, end: string) {
    const apiUrl = 'http://localhost:5233/api/routes/optimize'; // Local backend port
    console.log("Calling API at:", apiUrl);
    return this.http.post<any>(apiUrl, { start, end });
  }
}