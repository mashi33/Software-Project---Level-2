import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators'; 
import { TripMemory } from '../models/memory.model';

@Injectable({ providedIn: 'root' })
export class MemoryService {
  private readonly apiUrl = 'http://localhost:5233/api/memories';
  private readonly requestTimeout = 5000;

  constructor(private readonly http: HttpClient) {}

  getMemories(userId: string): Observable<TripMemory[]> {
    return this.http.get<TripMemory[]>(`${this.apiUrl}/user/${userId}`);
  }

getPublicMemories(): Observable<TripMemory[]> {
    return this.http.get<TripMemory[]>(this.apiUrl).pipe(
      timeout(this.requestTimeout)
    );
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
