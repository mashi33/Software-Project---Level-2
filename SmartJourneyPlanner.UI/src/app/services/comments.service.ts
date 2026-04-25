import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

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
}

@Injectable({ providedIn: 'root' })
export class CommentsService {

  // Backend API endpoints for comments and file management
  private apiUrl  = 'http://localhost:5233/api/comments';
  private fileUrl = 'http://localhost:5233/api/file';

  constructor(private http: HttpClient) {}

  // Fetch all comments for a specific trip
  getCommentsByTrip(tripId: string): Observable<CommentItem[]> {
    return this.http.get<CommentItem[]>(`${this.apiUrl}/trip/${tripId}`);
  }

  // Fetch every comment stored in the database
  getComments(): Observable<CommentItem[]> {
    return this.http.get<CommentItem[]>(`${this.apiUrl}/all`);
  }

  // Send a new comment to the server
  addComment(comment: CommentItem): Observable<CommentItem> {
    // The backend will broadcast this to other users via SignalR automatically
    return this.http.post<CommentItem>(this.apiUrl, comment);
  }

  // Edit the text of an existing comment
  updateComment(id: string, text: string): Observable<CommentItem> {
    return this.http.put<CommentItem>(`${this.apiUrl}/${id}`, { text });
  }

  // Delete a comment by its ID
  deleteComment(commentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${commentId}`);
  }

  // Upload a PDF file with user and trip information
  uploadPdf(file: File, user: string, tripId: string): Observable<HttpEvent<any>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user', user);
    formData.append('tripId', tripId);

    // Using HttpRequest to track and report the upload progress
    const req = new HttpRequest('POST', `${this.fileUrl}/upload`, formData, {
      reportProgress: true
    });

    return this.http.request(req);
  }

  // Generate a link to download a file
  getFileUrl(fileId: string): string {
    return `${this.fileUrl}/download/${fileId}`;
  }

  // Generate a link to view a file in the browser
  getViewUrl(fileId: string): string {
    return `${this.fileUrl}/view/${fileId}`;
  }
}