import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RouteService {
  private sessionToken?: google.maps.places.AutocompleteSessionToken;

  constructor(private http: HttpClient) {}

  /**
   * අලුත් සෙවුමක් ආරම්භයේදී හෝ පෙර සෙවුම අවසානයේදී ටෝකන් එක අලුත් කිරීම.
   * මෙයින් Places API එකට යන වියදම අවම කරගත හැක.
   */
  refreshSessionToken() {
    this.sessionToken = new google.maps.places.AutocompleteSessionToken();
    console.log("New Session Token Generated");
  }

  getPredictions(input: string): Promise<google.maps.places.AutocompletePrediction[]> {
    // සෙවුම් වාරයක් ආරම්භයේදී ටෝකන් එකක් නොමැති නම් පමණක් අලුතින් සාදයි
    if (!this.sessionToken) {
      this.refreshSessionToken();
    }

    const service = new google.maps.places.AutocompleteService();
    return new Promise((resolve) => {
      service.getPlacePredictions({
        input,
        sessionToken: this.sessionToken,
        componentRestrictions: { country: 'lk' } // ලංකාවට සීමා කර ඇත
      }, (res) => resolve(res || []));
    });
  }

  getOptimizedRoutes(start: string, end: string) {
    const apiUrl = 'http://localhost:5233/api/routes/optimize'; // ඔබේ backend port එක
    console.log("Calling API at:", apiUrl);
    return this.http.post<any>(apiUrl, { start, end });
  }
}