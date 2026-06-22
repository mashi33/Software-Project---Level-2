import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { TripMemory } from '../models/memory.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MemoryService {
  private readonly apiUrl = `${environment.apiUrl}/memories`;
  private readonly requestTimeout = 5000;

  constructor(private readonly http: HttpClient) {}

  getMemories(userId: string): Observable<TripMemory[]> {
    return this.http.get<TripMemory[]>(`${this.apiUrl}/user/${userId}`);
  }

  getMemoryCount(userId: string): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/user/${userId}/count`);
  }

  getPublicMemories(): Observable<TripMemory[]> {
    return this.http.get<TripMemory[]>(this.apiUrl).pipe(
      timeout(this.requestTimeout)
    );
  }

  getAccessibleTrips(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/trips`);
  }

  addMemory(memory: TripMemory): Observable<TripMemory> {
    return this.http.post<TripMemory>(this.apiUrl, memory).pipe(
      timeout(5000)
    );
  }

  toggleLike(memoryId: string, userId: string): Observable<TripMemory> {
    const payload = { userId };
    return this.http.post<TripMemory>(`${this.apiUrl}/${memoryId}/like`, payload).pipe(
      timeout(this.requestTimeout)
    );
  }
}
