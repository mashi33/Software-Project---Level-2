import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TripService {
 
  private apiUrl = 'http://localhost:5098/api/Trips'; 

  constructor(private http: HttpClient) { }

  createTrip(tripData: any): Observable<any> {
    return this.http.post(this.apiUrl, tripData);
  }
}