import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SignalrService } from './signalr.service';

// Define the structure for voting options and user choices
export interface VoteOption { optionText: string; voteCount: number; }
export interface UserVoteRecord { userId: string; optionText: string; }

// Main interface for a discussion or poll item
export interface DiscussionItem {
  id?: string; 
  tripId?: string;
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

  // ── UPDATED: passes requestingUser so the backend can return only
  // this user's own vote (anonymizing everyone else's choices)
  getDiscussionsByTrip(tripId: string, requestingUser: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/trip/${tripId}?requestingUser=${encodeURIComponent(requestingUser)}`);
  }

  // Fetch all comments linked to a specific trip
  getCommentsByTrip(tripId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/comments/trip/${tripId}`);
  }

  // Get a list of all discussions from the database
  getDiscussions(): Observable<DiscussionItem[]> {
    return this.http.get<DiscussionItem[]>(this.apiUrl);
  }

  // Save a new discussion proposal to the server
  createDiscussion(item: DiscussionItem): Observable<DiscussionItem> {
    return this.http.post<DiscussionItem>(this.apiUrl, item);
  }

  // ── UPDATED: now also sends userEmail so the backend can verify the
  // voter is an actual trip member (creator or invited), not just any name.
  // `user` stays as the display name (unchanged UI behavior); `userEmail`
  // is the value used purely for server-side membership validation.
  vote(id: string, option: string, user: string, userEmail: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/vote`, {
      optionText: option,
      userName: user,
      userEmail: userEmail
    });
  }

  // Remove a discussion item by its ID
  deleteDiscussion(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Manually mark a discussion as confirmed
  confirmDiscussion(id: string): Observable<DiscussionItem> {
    return this.http.put<DiscussionItem>(`${this.apiUrl}/${id}/confirm`, {});
  }
}