import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface PlacesResult {
  places: any[];
  centerLat: number;
  centerLon: number;
}

@Injectable({ providedIn: 'root' })
export class PlacesService {
  private apiUrl = 'http://localhost:5233/api/places/search';

  // Search results as list
  private placesSource = new BehaviorSubject<PlacesResult | null>(null);
  currentPlaces = this.placesSource.asObservable();

  // For selecting a place to highlight in both map and card components
  private selectedPlaceSource = new BehaviorSubject<string | null>(null);
  selectedPlaceId = this.selectedPlaceSource.asObservable();

  constructor(private http: HttpClient) {}

  fetchPlacesByCity(city: string, filters: any, token: string) {
    let params = new HttpParams()
      .set('city', city)
      .set('category', filters.category)
      .set('token', token);

    if (filters.budget) params = params.set('budget', filters.budget);
    if (filters.rating) params = params.set('rating', filters.rating);
    if (filters.maxDistance) params = params.set('maxDistance', filters.maxDistance);

    this.http.get<any>(this.apiUrl, { params })
      .pipe(
        catchError(err => {
          console.error('[PlacesService] Failed to fetch places:', err);
          return of({ fullDetails: [], centerLat: 0, centerLon: 0 });
        })
      )
      .subscribe(response => {
        this.placesSource.next({
          places: response.fullDetails ?? [],
          centerLat: response.centerLat,
          centerLon: response.centerLon
        });
      });
  }

  // When click marker or card, set the selected place ID to highlight in both components
  selectPlace(id: string | null) {
    this.selectedPlaceSource.next(id);
  }
}