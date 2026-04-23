import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Vehicle } from '../models/transport.model';

@Injectable({
  providedIn: 'root'
})
export class TransportVehicleService {
  private apiUrl = 'http://localhost:5233/api/TransportVehicles'; // Backend API URL

  constructor(private http: HttpClient) { }

  // Get all available vehicles from the server
  getVehicles(): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(this.apiUrl);
  }

  // Get vehicles owned by a specific provider
  getProviderVehicles(providerId: string): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(`${this.apiUrl}/provider/${providerId}`);
  }

  // Get detailed information for one vehicle
  getVehicleById(id: string): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.apiUrl}/${id}`);
  }

  // Register a new vehicle in the system
  createVehicle(vehicle: Vehicle): Observable<Vehicle> {
    return this.http.post<Vehicle>(this.apiUrl, vehicle);
  }

  // Update details of an existing vehicle
  updateVehicle(id: string, vehicle: Vehicle): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, vehicle);
  }

  // Remove a vehicle from the system
  deleteVehicle(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Submit a customer review for a vehicle
  addVehicleReview(vehicleId: string, review: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${vehicleId}/reviews`, review);
  }
}
