import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  constructor() { }

  getDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Admin/dashboard-stats`);
  }

  // PROVIDER MANAGEMENT METHODS
  getPendingProviders(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Admin/pending-providers`);
  }

  getProviderById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Admin/provider-detail/${id}`);
  }

  updateProviderStatus(id: string, status: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put(`${this.baseUrl}/Admin/update-status/${id}`, JSON.stringify(status), { headers });
  }

  // TRIP MEMORIES AUDITING METHODS
  getAllUploadedMemories(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Admin/all-memories`);
  }

  updateMemoryStatus(memoryId: string, status: string): Observable<any> {
  const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
  return this.http.put(`${this.baseUrl}/Admin/update-memory-status/${memoryId}`, JSON.stringify(status), { headers });
  }

  deleteMemoryPost(memoryId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/Admin/delete-memory/${memoryId}`);
  }

  getAllVehiclesDetailed(): Observable<any[]> {
  return this.http.get<any[]>(`${this.baseUrl}/Admin/all-vehicles-detailed`);
  }

  getAllExpenses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Admin/all-expenses`);
  }

  getBudgetDetails(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Admin/budget-details`);
  }

  // USER ACCESS & MANAGEMENT METHODS
  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Admin/all-users`);
  }

  updateUserRole(userId: string, newRole: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const body = JSON.stringify(newRole);
    return this.http.put(`${this.baseUrl}/Admin/promote-user/${userId}`, body, { headers });
  }

  blockUser(userId: string, blockType: 'Temporary' | 'Permanent'): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put(`${this.baseUrl}/Admin/block-user/${userId}`, { blockType }, { headers });
  }

  unblockUser(userId: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put(`${this.baseUrl}/Admin/unblock-user/${userId}`, {}, { headers });
  }

  toggleBlockUser(userId: string, isBlocked: boolean): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put(`${this.baseUrl}/Admin/toggle-block/${userId}`, { isBlocked }, { headers });
  }

  deleteUser(userId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/Admin/delete-user/${userId}`);
  }

  getVehicleBookings(vehicleId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Admin/vehicle-bookings/${vehicleId}`);
  }

  getAllBookings(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Admin/all-bookings`);
  }

  sendCustomerAlert(customerId: string, message: string, vehicleName: string, bookingId?: string): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const body = JSON.stringify({ customerId, message, vehicleName, bookingId });
    return this.http.post(`${this.baseUrl}/Admin/send-customer-alert`, body, { headers });
  }

  cancelBooking(bookingId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/Admin/cancel-booking/${bookingId}`, {});
  }
}