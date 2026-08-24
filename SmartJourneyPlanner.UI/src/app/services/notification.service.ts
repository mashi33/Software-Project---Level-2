import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import * as signalR from '@microsoft/signalr';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private apiUrl = 'http://localhost:5233/api/notifications';
  
  // SignalR Hub URL එක (Backend එකේ Map කර ඇති URL එකට അനുസൃതව වෙනස් කරන්න)
  private hubUrl = 'http://localhost:5233/notificationHub'; 
  private hubConnection!: signalR.HubConnection;

  constructor(private http: HttpClient) {}

  // ==========================================
  // 🚀 SIGNALR METHODS (Background Connection)
  // ==========================================

  public startConnection = () => {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl)
      .withAutomaticReconnect() // සම්බන්ධතාවය බිඳ වැටුණොත් ස්වයංක්‍රීයව නැවත උත්සාහ කිරීමට
      .build();

    // Page load වීම බ්ලොක් නොවන පරිදි background එකෙන් පටන් ගැනීම (.then/.catch මඟින්)
    this.hubConnection
      .start()
      .then(() => console.log('SignalR Connection started successfully!'))
      .catch(err => {
        console.error('Error while starting SignalR connection: ', err);
      });
  }

  public addNotificationListener = (callback: (data: any) => void) => {
    if (this.hubConnection) {
      this.hubConnection.on('ReceiveNotification', (data) => {
        callback(data);
      });
    }
  }

  public stopConnection = () => {
    if (this.hubConnection) {
      this.hubConnection.stop()
        .then(() => console.log('SignalR Connection stopped'))
        .catch(err => console.error('Error stopping connection: ', err));
    }
  }

  // ==========================================
  // 🌐 REST API METHODS (Existing)
  // ==========================================

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
