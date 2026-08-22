import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { Vehicle } from '../models/transport.model';

/**
 * This service handles all communication with the backend for Vehicle data.
 * It uses the HttpClient to perform GET, POST, PUT, and DELETE requests.
 * 🚀 Includes Instant In-Memory Caching for 0ms page transitions.
 */
@Injectable({
  providedIn: 'root'
})
export class TransportVehicleService {
  // The URL where our backend server is running
  private apiUrl = 'http://localhost:5233/api/TransportVehicles';
  
  // In-memory cache for instant vehicle detail loading
  private vehicleCache = new Map<string, Vehicle>();
  private cachedVehiclesList: Vehicle[] | null = null;
  private readonly STORAGE_KEY = 'sjp_vehicles_fleet_cache';

  constructor(private http: HttpClient) {
    this.hydrateFromStorage();
  }

  /**
   * Hydrates memory cache from browser storage on startup for 0ms initial render
   */
  private hydrateFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY) || sessionStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.cachedVehiclesList = parsed;
          parsed.forEach(v => {
            if (v && v.id) this.vehicleCache.set(v.id, v);
          });
        }
      }
    } catch {
      // Storage safe guard
    }
  }

  /**
   * Gets the full list of all vehicles available in the system.
   * ⚡ Instant Stale-While-Revalidate: Returns instantly from cache (0ms) and syncs in background.
   */
  getVehicles(forceRefresh = false): Observable<Vehicle[]> {
    if (!forceRefresh && this.cachedVehiclesList && this.cachedVehiclesList.length > 0) {
      // Trigger background silent update to keep data fresh
      this.fetchAndCache().subscribe({ next: () => {}, error: () => {} });
      return of(this.cachedVehiclesList);
    }
    return this.fetchAndCache();
  }

  /**
   * Pre-fetches vehicle list silently in background on app launch or user login
   */
  preloadVehicles(): void {
    this.fetchAndCache().subscribe({
      next: (vehicles) => {
        console.log(`⚡ [Fleet Cache] Preloaded ${vehicles?.length || 0} vehicles in background.`);
      },
      error: () => {}
    });
  }

  private fetchAndCache(): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(this.apiUrl).pipe(
      tap(vehicles => {
        if (Array.isArray(vehicles) && vehicles.length > 0) {
          this.cachedVehiclesList = vehicles;
          vehicles.forEach(v => {
            if (v && v.id) {
              this.vehicleCache.set(v.id, v);
            }
          });
          try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(vehicles));
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(vehicles));
          } catch {
            // Storage quota safe guard
          }
        }
      })
    );
  }

  /**
   * Gets only the vehicles belonging to a specific owner (provider).
   */
  getProviderVehicles(providerId: string): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(`${this.apiUrl}/provider/${providerId}`);
  }

  /**
   * Gets all the technical and pricing details for a single vehicle by its ID.
   * ⚡ Returns from instant memory cache if available (0ms delay), else fetches from API.
   */
  getVehicleById(id: string): Observable<Vehicle> {
    if (this.vehicleCache.has(id)) {
      return of(this.vehicleCache.get(id)!);
    }
    return this.http.get<Vehicle>(`${this.apiUrl}/${id}`).pipe(
      tap(v => {
        if (v && v.id) {
          this.vehicleCache.set(v.id, v);
        }
      })
    );
  }

  /**
   * Sends new vehicle data to the server to be saved in the database.
   */
  createVehicle(vehicle: Vehicle): Observable<Vehicle> {
    // 🔑 THE FIX: Get the active token and attach it as a secure Bearer header
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    return this.http.post<Vehicle>(this.apiUrl, vehicle, { headers });
  }
  /**
   * Updates an existing vehicle's information (e.g. price, features).
   */
  updateVehicle(id: string, vehicle: Vehicle): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    return this.http.put<any>(`${this.apiUrl}/${id}`, vehicle, { headers });
  }

  /**
   * Permanently deletes a vehicle from the system.
   */
  deleteVehicle(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Submits a user's star rating and comment for a specific vehicle.
   * 🚀 In-Place Cache Update: Updates cached vehicle rating immediately so Find Transport loads in 0ms!
   */
  addVehicleReview(vehicleId: string, review: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${vehicleId}/reviews`, review).pipe(
      tap(() => {
        // 1. Update vehicle inside the fleet list cache
        let listVehicle: Vehicle | undefined;
        if (this.cachedVehiclesList) {
          listVehicle = this.cachedVehiclesList.find(v => v.id === vehicleId);
          if (listVehicle) {
            listVehicle.reviews = listVehicle.reviews || [];
            listVehicle.reviews.push(review);
          }
          try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cachedVehiclesList));
          } catch {}
        }

        // 2. Update individual vehicle cache only if it's a different object reference
        if (this.vehicleCache.has(vehicleId)) {
          const mapVehicle = this.vehicleCache.get(vehicleId);
          if (mapVehicle && mapVehicle !== listVehicle) {
            mapVehicle.reviews = mapVehicle.reviews || [];
            mapVehicle.reviews.push(review);
          }
        }
      })
    );
  }
}
