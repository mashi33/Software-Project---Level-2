import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Vehicle } from '../models/transport.model';

@Injectable({
  providedIn: 'root'
})
export class TransportVehicleService {
  private apiUrl = 'http://localhost:5233/api/TransportVehicles';

  constructor(private http: HttpClient) { }

  getVehicles(): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(this.apiUrl);
  }

  getProviderVehicles(providerId: string): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(`${this.apiUrl}/provider/${providerId}`);
  }

  getVehicleById(id: string): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.apiUrl}/${id}`);
  }

  createVehicle(vehicle: Vehicle): Observable<Vehicle> {
    return this.http.post<Vehicle>(this.apiUrl, vehicle);
  }

  updateVehicle(id: string, vehicle: Vehicle): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, vehicle);
  }

  deleteVehicle(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  addVehicleReview(vehicleId: string, review: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${vehicleId}/reviews`, review);
  }
}
