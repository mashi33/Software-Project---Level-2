import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RouteService {
  private sessionToken?: google.maps.places.AutocompleteSessionToken;

  constructor(private http: HttpClient) {}

  /**
   *  refresh token in Starting new search or end of previous search
   *  Because the reduce cost of Places API
   */
  refreshSessionToken() {
    this.sessionToken = new google.maps.places.AutocompleteSessionToken();
    console.log("New Session Token Generated");
  }

  getPredictions(input: string): Promise<google.maps.places.AutocompletePrediction[]> {
    // Create new session token if and only no session token in start of search
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

  getOptimizedRoutes(start: string, end: string) {
    const apiUrl = 'http://localhost:5233/api/routes/optimize'; // My backend port
    console.log("Calling API at:", apiUrl);
    return this.http.post<any>(apiUrl, { start, end });
  }
}