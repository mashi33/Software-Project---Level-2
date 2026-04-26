import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TripService {
  // API base URL for trip-related endpoints, constructed from environment configuration
  private apiUrl = `${environment.apiUrl}/trips`; 

  // Temporary storage for trip data during the creation process
  private currentTripData: any = null;

  constructor(private http: HttpClient) { }

  // Sends a POST request to create a new trip with the provided data.
  // ✅ NEW METHOD: Fetches all trips for the Budget Dropdown
  getAllTrips(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Trip create function
  createTrip(tripData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, tripData);
  }
  
  // Sends a PUT request to update an existing trip identified by ID with the new data.
  updateTrip(id: string, tripData: any): Observable<any> {
  return this.http.put(`${this.apiUrl}/${id}`, tripData);
  }
  
  // Sends a GET request to retrieve trip details by ID.
  getTripById(id: string): Observable<any> {
  return this.http.get(`${this.apiUrl}/${id}`);
  }
  
  // Stores the current trip data in a temporary variable for use across components during the creation/editing process.
  setTempTripData(data: any) {
    this.currentTripData = data;
  }
  
  // Retrieves the temporarily stored trip data, which can be used to pre-fill forms or display unsaved changes.
  getTempTripData() {
    return this.currentTripData;
  }
  
  // Sends a GET request to retrieve the edit history of a trip by ID, which can be used to display past changes and versions.
  getTripHistory(id: string): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/${id}/history`);
  }
}