import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TripMemory } from '../models/memory.model';

@Injectable({ providedIn: 'root' })
export class MemoryService { // Rename this from 'Memory' to 'MemoryService'
  private apiUrl = 'http://localhost:5028/api/memories'; 

  constructor(private http: HttpClient) {}

  getMemories(): Observable<TripMemory[]> {
    return this.http.get<TripMemory[]>(this.apiUrl);
  }

  addMemory(memory: TripMemory): Observable<TripMemory> {
    return this.http.post<TripMemory>(this.apiUrl, memory);
  }
}
