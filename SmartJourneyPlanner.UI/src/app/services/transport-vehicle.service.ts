import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Vehicle } from '../models/transport.model';

/**
 * This service handles all communication with the backend for Vehicle data.
 * It uses the HttpClient to perform GET, POST, PUT, and DELETE requests.
 */
@Injectable({
  providedIn: 'root'
})
export class TransportVehicleService {
  // The URL where our backend server is running
  private apiUrl = 'http://localhost:5233/api/TransportVehicles';

  constructor(private http: HttpClient) { }

  /**
   * Gets the full list of all vehicles available in the system.
   */
  getVehicles(): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(this.apiUrl);
  }

  /**
   * Gets only the vehicles belonging to a specific owner (provider).
   */
  getProviderVehicles(providerId: string): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(`${this.apiUrl}/provider/${providerId}`);
  }

  /**
   * Gets all the technical and pricing details for a single vehicle by its ID.
   */
  getVehicleById(id: string): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.apiUrl}/${id}`);
  }

  /**
   * Sends new vehicle data to the server to be saved in the database.
   */
  createVehicle(vehicle: Vehicle): Observable<Vehicle> {
    return this.http.post<Vehicle>(this.apiUrl, vehicle);
  }

  /**
   * Updates an existing vehicle's information (e.g. price, features).
   */
  updateVehicle(id: string, vehicle: Vehicle): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, vehicle);
  }

  /**
   * Permanently deletes a vehicle from the system.
   */
  deleteVehicle(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Submits a user's star rating and comment for a specific vehicle.
   */
  addVehicleReview(vehicleId: string, review: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${vehicleId}/reviews`, review);
  }
}
