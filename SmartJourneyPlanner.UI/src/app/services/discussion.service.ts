import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
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
  private readonly REQUEST_TIMEOUT = 10000;

  constructor(
    private http: HttpClient,
    private signalrService: SignalrService
  ) {}

  // ── UPDATED: passes requestingUser so the backend can return only
  // this user's own vote (anonymizing everyone else's choices)
    getDiscussionsByTrip(tripId: string, requestingUser: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/trip/${tripId}?requestingUser=${encodeURIComponent(requestingUser)}`)
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError(err => throwError(() => this.normalizeError(err)))
      );
  }

  // Fetch all comments linked to a specific trip
  getCommentsByTrip(tripId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/comments/trip/${tripId}`)
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError(err => throwError(() => this.normalizeError(err)))
      );
  }

  // Get a list of all discussions from the database
  getDiscussions(): Observable<DiscussionItem[]> {
    return this.http.get<DiscussionItem[]>(this.apiUrl)
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError(err => throwError(() => this.normalizeError(err)))
      );
  }

  // Save a new discussion proposal to the server
    createDiscussion(item: DiscussionItem): Observable<DiscussionItem> {
    return this.http.post<DiscussionItem>(this.apiUrl, item)
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError(err => throwError(() => this.normalizeError(err)))
      );
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
    }).pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError(err => throwError(() => this.normalizeError(err)))
    );
  }

  // Remove a discussion item by its ID
  deleteDiscussion(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`)
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError(err => throwError(() => this.normalizeError(err)))
      );
  }

  // Manually mark a discussion as confirmed
  confirmDiscussion(id: string): Observable<DiscussionItem> {
    return this.http.put<DiscussionItem>(`${this.apiUrl}/${id}/confirm`, {})
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError(err => throwError(() => this.normalizeError(err)))
      );
  }

    // Normalizes network/timeout/server errors into a consistent shape
  // so components can show one friendly message regardless of failure type.
  private normalizeError(err: any): any {
    if (err.name === 'TimeoutError') {
      return { status: 0, error: { message: 'Request timed out. Please check your internet connection.' } };
    }
    if (err.status === 0) {
      return { status: 0, error: { message: 'Cannot reach the server. Please check your internet connection.' } };
    }
    return err; // Keep original (e.g. 400, 403, 503 with backend message) as-is
  }
}