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

  // 1. සෙවුම් ප්‍රතිඵල (Places List) සඳහා
  private placesSource = new BehaviorSubject<PlacesResult | null>(null);
  currentPlaces = this.placesSource.asObservable();

  // 2. තෝරාගත් හෝටලය (Selected Place ID) සඳහා නව Subject එකක්
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

  // 3. සිතියමේ Marker එකක් ක්ලික් කළ විට Card එකට දැනුම් දීමට මෙම function එක පාවිච්චි කරන්න
  selectPlace(id: string | null) {
    this.selectedPlaceSource.next(id);
  }
}