import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SignalrService } from './signalr.service';

export interface VoteOption { optionText: string; voteCount: number; }
export interface UserVoteRecord { userId: string; optionText: string; }

export interface DiscussionItem {
  id?: string; 
  title: string; 
  description: string; 
  user: string;
  type: 'Trip' | 'Other'; 
  createdAt: Date; 
  options: VoteOption[];
  isConfirmed: boolean; 
  isRejected: boolean;
  memberLimit: number;
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