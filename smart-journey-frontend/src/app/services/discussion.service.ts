import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { SignalrService } from './signalr.service';
import * as signalR from '@microsoft/signalr';

export interface VoteOption { optionText: string; voteCount: number; }

// discussionId ඉවත් කරන ලදී
export interface CommentItem { id?: string; user: string; text: string; createdAt: Date; }

// නව එකතු කිරීම: ඡන්දය සහ පුද්ගලයා ගැලපීමට
export interface UserVoteRecord {
  userId: string;
  optionText: string;
}

export interface DiscussionItem {
  id?: string; 
  title: string; 
  description: string; 
  user: string;
  type: 'Trip' | 'Other'; 
  createdAt: Date; 
  options: VoteOption[];
  comments?: CommentItem[]; 
  isConfirmed: boolean; 
  
  // --- නව යාවත්කාලීන කිරීම: Backend එකට ගැලපෙන පරිදි ---
  isRejected: boolean;      // ප්‍රතික්ෂේප වූ බව හඳුනා ගැනීමට
  memberLimit: number;      // සාමාජික සීමාව ගබඩා කිරීමට
  // -----------------------------------------------

  votes?: number[];
  userVotes?: UserVoteRecord[];
  votedUsers?: string[];
}

@Injectable({ providedIn: 'root' })
export class DiscussionService {
  private apiUrl = 'http://localhost:5233/api/discussions';

  constructor(
    private http: HttpClient,
    private signalrService: SignalrService
  ) {}

  // --- Real-time Comment Logic ---
  
  // පණිවිඩ ස්වාධීන බැවින් ID එක ඉවත් කර Endpoint එක වෙනස් කරන ලදී
  addComment(comment: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/comments`, comment).pipe(
      tap(() => {
        // HTTP හරහා Save කළ පසු SignalR හරහා අන් අයට දැනුම් දෙයි
        this.sendSignalRMessage(comment);
      })
    );
  }

  private async sendSignalRMessage(comment: any) {
    try {
      if (this.signalrService.hubConnection.state === signalR.HubConnectionState.Connected) {
        console.log("🚀 Invoking SignalR for Comment");
        
        // මින්පසු id එකක් අවශ්‍ය නොවේ, comment එක පමණක් යවයි
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

  getDiscussions(): Observable<DiscussionItem[]> {
    return this.http.get<DiscussionItem[]>(this.apiUrl);
  }

  // සියලුම පණිවිඩ (Global Chat) ලබා ගැනීමට Endpoint එක වෙනස් කරන ලදී
  getComments(): Observable<CommentItem[]> {
    return this.http.get<CommentItem[]>(`${this.apiUrl}/comments/all`);
  }

  createDiscussion(item: DiscussionItem): Observable<DiscussionItem> {
    return this.http.post<DiscussionItem>(this.apiUrl, item);
  }

  vote(id: string, option: string, user: string): Observable<any> {
    // Backend එකේ [FromBody] VoteRequest එකට ගැලපෙන පරිදි UserName සහ OptionText යැවීම
    return this.http.post<any>(`${this.apiUrl}/${id}/vote`, { optionText: option, userName: user });
  }

  deleteDiscussion(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // පණිවිඩය යාවත්කාලීන කිරීමට
  updateComment(id: string, text: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/comments/${id}`, { text: text });
  }

  deleteComment(commentId: string) {
    return this.http.delete(`${this.apiUrl}/comments/${commentId}`);
  }

  // මෙය දැන් අවශ්‍ය නොවේ (Backend එකේ Vote logic එකෙන් Confirm/Reject සිදු වේ)
  confirmDiscussion(id: string): Observable<DiscussionItem> {
    return this.http.put<DiscussionItem>(`${this.apiUrl}/${id}/confirm`, {});
  }
}