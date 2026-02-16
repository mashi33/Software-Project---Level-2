import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { SignalrService } from './signalr.service';
import * as signalR from '@microsoft/signalr'; // SignalR තත්ත්වය පරීක්ෂා කිරීමට

export interface VoteOption { optionText: string; voteCount: number; }
export interface CommentItem { user: string; text: string; createdAt: Date; }
export interface DiscussionItem {
  id?: string; title: string; description: string; user: string;
  type: 'Trip' | 'Other'; createdAt: Date; options: VoteOption[];
  comments: CommentItem[]; isConfirmed: boolean; votes?: number[];
}

@Injectable({ providedIn: 'root' })
export class DiscussionService {
  private apiUrl = 'http://localhost:5233/api/discussions';

  constructor(
    private http: HttpClient,
    private signalrService: SignalrService
  ) {}

  // --- Real-time Comment Logic ---
  addComment(id: string, comment: CommentItem): Observable<DiscussionItem> {
    // 1. මුලින්ම HTTP හරහා Database එකට සේව් කරන්න
    return this.http.post<DiscussionItem>(`${this.apiUrl}/${id}/comments`, comment).pipe(
      tap(() => {
        this.sendSignalRMessage(id, comment);
      })
    );
  }

  private async sendSignalRMessage(id: string, comment: CommentItem) {
    try {
      // Hub Connection එක 'Connected' තත්වයේ තිබේදැයි බලන්න
      if (this.signalrService.hubConnection.state === signalR.HubConnectionState.Connected) {
        
        console.log("🚀 Invoking SignalR for ID:", id);
        
        // Hub එකේ method නම 'SendMessage' බවත්, parameters 2ක් (id, object) යන බවත් සහතික කරගන්න
        await this.signalrService.hubConnection.invoke('SendMessage', id, comment);
        
        console.log("✅ SignalR broadcast successful!");
      } else {
        console.warn("⚠️ SignalR not connected. Current state:", this.signalrService.hubConnection.state);
        
        // පණිවිඩය යැවීමට පෙර නැවත සම්බන්ධ වීමට උත්සාහ කරන්න
        await this.signalrService.hubConnection.start();
        await this.signalrService.hubConnection.invoke('SendMessage', id, comment);
      }
    } catch (err) {
      console.error('❌ SignalR Invoke Error:', err);
    }
  }

  // --- අනෙකුත් Methods (වෙනසක් නැත) ---
  getDiscussions(): Observable<DiscussionItem[]> {
    return this.http.get<DiscussionItem[]>(this.apiUrl);
  }

  createDiscussion(item: DiscussionItem): Observable<DiscussionItem> {
    return this.http.post<DiscussionItem>(this.apiUrl, item);
  }

  vote(id: string, option: string, user: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/vote`, { optionText: option, userName: user });
  }

  deleteDiscussion(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  confirmDiscussion(id: string): Observable<DiscussionItem> {
    return this.http.put<DiscussionItem>(`${this.apiUrl}/${id}/confirm`, {});
  }
}