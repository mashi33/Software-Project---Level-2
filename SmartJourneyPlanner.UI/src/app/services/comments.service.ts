import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';

// Define the structure of a comment or message object
export interface CommentItem {
  id?:          string;
  tripId:       string;
  user:         string;
  text:         string;
  createdAt:    Date;
  messageType?: string;  // Type of message: "text" or "pdf"
  fileId?:      string;
  fileName?:    string;
  fileSize?:    number;
  isDeleted?:   boolean;
  isEdited?:    boolean;
}

@Injectable({ providedIn: 'root' })
export class CommentsService {

  // Backend API endpoints for comments and file management
  private apiUrl  = 'http://localhost:5233/api/comments';
  private fileUrl = 'http://localhost:5233/api/file';
  private readonly REQUEST_TIMEOUT = 10000;

  constructor(private http: HttpClient) {}

  // Fetch all comments for a specific trip
  getCommentsByTrip(tripId: string): Observable<CommentItem[]> {
    return this.http.get<CommentItem[]>(`${this.apiUrl}/trip/${tripId}`)
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError(err => throwError(() => this.normalizeError(err)))
      );
  }

  // Fetch every comment stored in the database
  getComments(): Observable<CommentItem[]> {
    return this.http.get<CommentItem[]>(`${this.apiUrl}/all`)
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError(err => throwError(() => this.normalizeError(err)))
      );
  }

  // Send a new comment to the server
  addComment(comment: CommentItem): Observable<CommentItem> {
    return this.http.post<CommentItem>(this.apiUrl, comment)
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError(err => throwError(() => this.normalizeError(err)))
      );
  }

  // Edit the text of an existing comment
  updateComment(id: string, text: string): Observable<CommentItem> {
    return this.http.put<CommentItem>(`${this.apiUrl}/${id}`, { text })
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError(err => throwError(() => this.normalizeError(err)))
      );
  }

  // Delete a comment by its ID
  deleteComment(commentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${commentId}`)
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError(err => throwError(() => this.normalizeError(err)))
      );
  }

  // Upload a PDF file with user and trip information.
  // Uses a longer 30s timeout since file uploads take longer than normal requests.
  uploadPdf(file: File, user: string, tripId: string): Observable<HttpEvent<any>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user', user);
    formData.append('tripId', tripId);

    const req = new HttpRequest('POST', `${this.fileUrl}/upload`, formData, {
      reportProgress: true
    });

    return this.http.request(req).pipe(
      timeout(30000),
      catchError(err => throwError(() => this.normalizeError(err)))
    );
  }

  // Generate a link to download a file
  getFileUrl(fileId: string): string {
    return `${this.fileUrl}/download/${fileId}`;
  }

  // Generate a link to view a file in the browser
  getViewUrl(fileId: string): string {
    return `${this.fileUrl}/view/${fileId}`;
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
    return err;
  }
}