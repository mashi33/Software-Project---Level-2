import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators'; // 1. Import the timeout operator
import { TripMemory } from '../models/memory.model';

@Injectable({ providedIn: 'root' })
export class MemoryService {
  private apiUrl = 'http://localhost:5233/api/memories';
  constructor(private http: HttpClient) {}

  getMemories(): Observable<TripMemory[]> {
    // 2. Add .pipe(timeout(5000)) to wait 5 seconds for the backend/DB
    return this.http.get<TripMemory[]>(this.apiUrl).pipe(
      timeout(5000)
    );
  }

getPublicMemories(): Observable<TripMemory[]> {
    // This sends ?publicOnly=true to your C# Controller
    const params = new HttpParams().set('publicOnly', 'true');
    
    return this.http.get<TripMemory[]>(this.apiUrl, { params }).pipe(
      timeout(5000)
    );
  }

  addMemory(memory: TripMemory): Observable<TripMemory> {
    // Adding a timeout here ensures the save to MongoDB doesn't hang the UI
    return this.http.post<TripMemory>(this.apiUrl, memory).pipe(
      timeout(5000)
    );
  }
}
