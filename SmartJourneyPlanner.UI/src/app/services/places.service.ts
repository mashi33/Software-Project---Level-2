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

  private placesSource = new BehaviorSubject<PlacesResult | null>(null);
  currentPlaces = this.placesSource.asObservable();

  private selectedPlaceSource = new BehaviorSubject<string | null>(null);
  selectedPlaceId = this.selectedPlaceSource.asObservable();

  //isLoading state for skeleton loader
  private isLoadingSource = new BehaviorSubject<boolean>(false);
  isLoading$ = this.isLoadingSource.asObservable();
  
  private frontendCache = new Map<string, { data: any, timestamp: number }>();
  private readonly CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

  constructor(private http: HttpClient) {}

  fetchPlacesByCity(city: string, filters: any, token: string) {
    // FIX: city+category cache key 
    const cacheKey = `${city.toLowerCase()}_${filters.category.toLowerCase()}`;
    const cached = this.frontendCache.get(cacheKey);
    const now = Date.now();

    // FIX: Cache hit —Do not send backend request 
    if (cached && (now - cached.timestamp) < this.CACHE_TTL_MS) {
      console.log(`[PlacesService] Frontend cache hit for '${cacheKey}'`);

      // ✅ BUG 10 FIX — clear previous search results before applying filters to avoid showing stale data
    this.placesSource.next(null);

      // Filter cached data in memory — No API call 
      const filtered = this.applyFilters(cached.data, filters);
      this.placesSource.next({
        places: filtered,
        centerLat: cached.data.centerLat,
        centerLon: cached.data.centerLon
      });
      return;
    }
    
    // ✅ BUG 10 FIX — clear previous search results before sending backend request to avoid showing stale data
     this.placesSource.next(null);
    //start loading state for skeleton loader 
     this.isLoadingSource.next(true);

    // Cache miss — send backend request 
    let params = new HttpParams()
      .set('city', city)
      .set('category', filters.category.toLowerCase()) // ✅ "hotel" lowercase
      .set('token', token);

    if (filters.budget) params = params.set('budget', filters.budget);
    if (filters.rating) params = params.set('rating', filters.rating);
    if (filters.maxDistance) params = params.set('maxDistance', filters.maxDistance);

    this.http.get<any>(this.apiUrl, { params })
      .pipe(
        catchError(err => {
          console.error('[PlacesService] Failed to fetch places:', err);
          //stop loading state on error 
          this.isLoadingSource.next(false);
          return of({ fullDetails: [], centerLat: 0, centerLon: 0 });
        })
      )
      .subscribe(response => {
        // FIX: Frontend cache save — Cache results based on city+category
        this.frontendCache.set(cacheKey, {
          data: {
            fullDetails: response.fullDetails ?? [],
            centerLat: response.centerLat,
            centerLon: response.centerLon
          },
          timestamp: now
        });

        const filtered = this.applyFilters(
          { fullDetails: response.fullDetails ?? [], centerLat: response.centerLat, centerLon: response.centerLon },
          filters
        );

        this.placesSource.next({
          places: filtered,
          centerLat: response.centerLat,
          centerLon: response.centerLon
        });
        
        //stop loading state after data is set
        this.isLoadingSource.next(false);
      });
  }

  // FIX: Filter in memory — filter without API call
  private applyFilters(data: any, filters: any): any[] {
    let places: any[] = data.fullDetails ?? [];

    if (filters.budget) {
      places = places.filter(p => p.priceLevel <= filters.budget);
    }

    if (filters.rating) {
      places = places.filter(p => p.rating >= filters.rating);
    }

    if (filters.maxDistance) {
      places = places.filter(p => p.distanceFromUser <= filters.maxDistance);
    }

    return places;
  }

  selectPlace(id: string | null) {
    this.selectedPlaceSource.next(id);
  }

  clearPlaces() {
    this.placesSource.next(null);
    this.selectedPlaceSource.next(null);
  }
}