import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators'; 
import { TripMemory } from '../models/memory.model';

@Injectable({ providedIn: 'root' })
export class MemoryService {
  private apiUrl = 'http://localhost:5233/api/memories';
  constructor(private http: HttpClient) {}

  getMemories(): Observable<TripMemory[]> {
    return this.http.get<TripMemory[]>(this.apiUrl).pipe(
      timeout(5000)
    );
  }

getPublicMemories(): Observable<TripMemory[]> {
  // Query parameter used to let backend handle filtering instead of frontend processing
    const params = new HttpParams().set('publicOnly', 'true');
    
    return this.http.get<TripMemory[]>(this.apiUrl, { params }).pipe(
      timeout(5000)
    );
  }

  addMemory(memory: TripMemory): Observable<TripMemory> {
    return this.http.post<TripMemory>(this.apiUrl, memory).pipe(
      timeout(5000)
    );
  }
}
