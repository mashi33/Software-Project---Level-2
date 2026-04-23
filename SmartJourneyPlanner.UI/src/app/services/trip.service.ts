import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class TripService {
  private apiUrl = `${environment.apiUrl}/trips`; // Backend  trips endpoint 

  private currentTripData: any = null;
  constructor(private http: HttpClient) { }

  // Trip create function
  createTrip(tripData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, tripData);
  }

  updateTrip(id: string, tripData: any): Observable<any> {
  return this.http.put(`http://localhost:5233/api/trips/${id}`, tripData);
}

getTripById(id: string): Observable<any> {
  return this.http.get(`http://localhost:5233/api/trips/${id}`);
}
  setTempTripData(data: any) {
    this.currentTripData = data;
  }

  getTempTripData() {
    return this.currentTripData;
  }
}