import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private apiUrl = 'http://localhost:5233/api/notifications';

  constructor(private http: HttpClient) {}

  getNotifications(userId: string, userType: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/${userId}?userType=${userType}`);
  }

  createNotification(notification: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, notification);
  }

  markAsRead(id: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/read`, {});
  }

  markAllAsRead(userId: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/user/${userId}/read-all`, {});
  }

  getSettings(userId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/user/${userId}/settings`);
  }

  saveSettings(settings: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/settings`, settings);
  }
}
