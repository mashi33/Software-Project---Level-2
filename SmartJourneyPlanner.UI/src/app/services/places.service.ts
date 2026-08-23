import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import Swal from 'sweetalert2';

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

  private isLoadingSource = new BehaviorSubject<boolean>(false);
  isLoading$ = this.isLoadingSource.asObservable();

  private frontendCache = new Map<string, { data: any, timestamp: number }>();
  private readonly CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

  constructor(private http: HttpClient) {}

  fetchPlacesByCity(city: string, filters: any, token: string) {
    const cacheKey = `${city.toLowerCase()}_${filters.category.toLowerCase()}`;
    const cached = this.frontendCache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.CACHE_TTL_MS) {
      console.log(`[PlacesService] Frontend cache hit for '${cacheKey}'`);
      this.placesSource.next(null);
      const filtered = this.applyFilters(cached.data, filters);
      this.placesSource.next({
        places: filtered,
        centerLat: cached.data.centerLat,
        centerLon: cached.data.centerLon
      });
      return;
    }

    this.placesSource.next(null);
    this.isLoadingSource.next(true);

    let params = new HttpParams()
      .set('city', city)
      .set('category', filters.category.toLowerCase())
      .set('token', token);

    if (filters.budget) params = params.set('budget', filters.budget);
    if (filters.rating) params = params.set('rating', filters.rating);
    if (filters.maxDistance) params = params.set('maxDistance', filters.maxDistance);

    this.http.get<any>(this.apiUrl, { params })
      .pipe(
        catchError(err => {
          console.error('[PlacesService] Failed to fetch places:', err);
          this.isLoadingSource.next(false);

          //Messages show according to the error status code
          if (err.status === 400) {
            // Empty city name
            Swal.fire({
              icon: 'warning',
              title: 'Invalid Search!',
              html: `<p style="color:#555; font-size:15px; margin:0;">
                Please enter a city or town name before searching.
              </p>`,
              confirmButtonColor: '#4A90D9',
              width: 400,
              padding: '32px',
              customClass: { popup: 'invalid-popup' },
              didOpen: () => {
                if (!document.getElementById('swal-invalid-style')) {
                  const style = document.createElement('style');
                  style.id = 'swal-invalid-style';
                  style.textContent = `.invalid-popup { border-radius: 16px !important; }`;
                  document.head.appendChild(style);
                }
              }
            });
          } else if (err.status === 404) {
            // Invalid city
            Swal.fire({
              icon: 'warning',
              title: 'City Not Found!',
              html: `<p style="color:#555; font-size:15px; margin:0;">
                <strong>"${params.get('city')}"</strong> cannot be found.<br>
                Try a different city or check the spelling.
              </p>`,
              confirmButtonColor: '#4A90D9',
              width: 400,
              padding: '32px',
              customClass: { popup: 'notfound-popup' },
              didOpen: () => {
                if (!document.getElementById('swal-notfound-style')) {
                  const style = document.createElement('style');
                  style.id = 'swal-notfound-style';
                  style.textContent = `.notfound-popup { border-radius: 16px !important; }`;
                  document.head.appendChild(style);
                }
              }
            });
          } else if (err.status === 0) {
            // No internet
            Swal.fire({
              icon: 'error',
              title: 'No Internet Connection!',
              html: `<p style="color:#555; font-size:15px; margin:0;">
                Please check your internet connection and try again.
              </p>`,
              confirmButtonColor: '#4A90D9',
              width: 400,
              padding: '32px',
              customClass: { popup: 'network-popup' },
              didOpen: () => {
                if (!document.getElementById('swal-network-style')) {
                  const style = document.createElement('style');
                  style.id = 'swal-network-style';
                  style.textContent = `.network-popup { border-radius: 16px !important; }`;
                  document.head.appendChild(style);
                }
              }
            });
          } else if (err.status === 500) {
            // Server error
            Swal.fire({
              icon: 'error',
              title: 'Server Error!',
              html: `<p style="color:#555; font-size:15px; margin:0;">
                An unexpected error occurred. Please try again.
              </p>`,
              confirmButtonColor: '#4A90D9',
              width: 400,
              padding: '32px',
              customClass: { popup: 'server-popup' },
              didOpen: () => {
                if (!document.getElementById('swal-server-style')) {
                  const style = document.createElement('style');
                  style.id = 'swal-server-style';
                  style.textContent = `.server-popup { border-radius: 16px !important; }`;
                  document.head.appendChild(style);
                }
              }
            });
            } else if (err.status === 503) {
              // Backend network error
              Swal.fire({
                icon: 'error',
                title: 'No Internet Connection!',
                html: `<p style="color:#555; font-size:15px; margin:0;">
                  Please check your internet connection and try again.
                </p>`,
                confirmButtonColor: '#4A90D9',
                width: 400,
                padding: '32px',
                customClass: { popup: 'network-popup' },
                didOpen: () => {
                  if (!document.getElementById('swal-network-style')) {
                    const style = document.createElement('style');
                    style.id = 'swal-network-style';
                    style.textContent = `.network-popup { border-radius: 16px !important; }`;
                    document.head.appendChild(style);
                  }
                }
              });
            }else {
            // General error
            Swal.fire({
              icon: 'error',
              title: 'Something Went Wrong!',
              html: `<p style="color:#555; font-size:15px; margin:0;">
                Please try again.
              </p>`,
              confirmButtonColor: '#4A90D9',
              width: 400,
              padding: '32px',
            });
          }

          return of({ fullDetails: [], centerLat: 0, centerLon: 0 });
        })
      )
      .subscribe(response => {
        this.frontendCache.set(cacheKey, {
          data: {
            fullDetails: response.fullDetails ?? [],
            centerLat: response.centerLat,
            centerLon: response.centerLon
          },
          timestamp: now
        });

        const filtered = this.applyFilters(
          {
            fullDetails: response.fullDetails ?? [],
            centerLat: response.centerLat,
            centerLon: response.centerLon
          },
          filters
        );

        this.placesSource.next({
          places: filtered,
          centerLat: response.centerLat,
          centerLon: response.centerLon
        });

        this.isLoadingSource.next(false);
      });
  }

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