import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { SignalrService } from './signalr.service';
import * as signalR from '@microsoft/signalr';

export interface CommentItem { id?: string; user: string; text: string; createdAt: Date; }

@Injectable({ providedIn: 'root' })
export class CommentsService {
  private apiUrl = 'http://localhost:5233/api/comments'; // Backend route updated

  constructor(
    private http: HttpClient,
    private signalrService: SignalrService
  ) {}

  getComments(): Observable<CommentItem[]> {
    return this.http.get<CommentItem[]>(`${this.apiUrl}/all`);
  }

  addComment(comment: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, comment).pipe(
      tap(() => {
        this.sendSignalRMessage(comment);
      })
    );
  }

  private async sendSignalRMessage(comment: any) {
    try {
      if (this.signalrService.hubConnection.state === signalR.HubConnectionState.Connected) {
        console.log("🚀 Invoking SignalR for Comment");
        await this.signalrService.hubConnection.invoke('SendMessage', comment);
        console.log("✅ SignalR broadcast successful!");
      } else {
        console.warn("⚠️ SignalR not connected. Attempting to reconnect...");
        await this.signalrService.hubConnection.start();
        await this.signalrService.hubConnection.invoke('SendMessage', comment);
      }
    } catch (err) {
      console.error('❌ SignalR Invoke Error:', err);
    }
  }

  updateComment(id: string, text: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, { text: text });
  }

  deleteComment(commentId: string) {
    return this.http.delete(`${this.apiUrl}/${commentId}`);
  }
}