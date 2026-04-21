import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TripService {
  private apiUrl = `${environment.apiUrl}/trips`; // Backend එකේ trips endpoint එක

  constructor(private http: HttpClient) { }

  // Trip එකක් create කරන function එක
  createTrip(tripData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, tripData);
  }
}