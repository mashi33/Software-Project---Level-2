import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface VotePlacePrediction {
  place_id: string;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class VotePlacesService {
  private apiUrl = `${environment.apiUrl}/vote-places`;

  private sessionToken: string = this.generateSessionToken();

  private cache = new Map<string, VotePlacePrediction[]>();

  constructor(private http: HttpClient) {}

  private generateSessionToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  resetSession(): void {
    this.sessionToken = this.generateSessionToken();
    this.cache.clear();
  }

  autocomplete(input: string): Observable<VotePlacePrediction[]> {
    if (!input || input.length < 2) return of([]);

    const cacheKey = input.toLowerCase().trim();
    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey)!);
    }

    return this.http.get<any>(
      `${this.apiUrl}/autocomplete?input=${encodeURIComponent(input)}`
    ).pipe(
      map(res => {
        const predictions = res.predictions || [];
        this.cache.set(cacheKey, predictions);
        return predictions;
      }),
      catchError(() => of([]))
    );
  }

  validatePlace(placeId: string): Observable<boolean> {
    return this.http.get<{ valid: boolean }>(
      `${this.apiUrl}/validate?placeId=${placeId}&sessionToken=${this.sessionToken}`
    ).pipe(
      map(res => res.valid),
      catchError(() => of(false))
    );
  }
}
