import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CommentItem {
  id?:          string;
  user:         string;
  text:         string;
  createdAt:    Date;
  messageType?: string;  // "text" | "pdf"
  fileId?:      string;
  fileName?:    string;
  fileSize?:    number;
}

@Injectable({ providedIn: 'root' })
export class CommentsService {

  private apiUrl  = 'http://localhost:5233/api/comments';
  private fileUrl = 'http://localhost:5233/api/file';

  // ✅ SignalrService is NOT injected here — service only handles HTTP calls.
  // SignalR listeners are set up in the component via SignalrService directly.
  constructor(private http: HttpClient) {}

  getComments(): Observable<CommentItem[]> {
    return this.http.get<CommentItem[]>(`${this.apiUrl}/all`);
  }

  addComment(comment: CommentItem): Observable<CommentItem> {
    // Only POST to backend. Backend broadcasts to ALL clients via SignalR hub context,
    // including the sender. No manual SignalR invoke from frontend needed.
    return this.http.post<CommentItem>(this.apiUrl, comment);
  }

  updateComment(id: string, text: string): Observable<CommentItem> {
    return this.http.put<CommentItem>(`${this.apiUrl}/${id}`, { text });
  }

  deleteComment(commentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${commentId}`);
  }

  uploadPdf(file: File, user: string): Observable<HttpEvent<any>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user', user);

    const req = new HttpRequest('POST', `${this.fileUrl}/upload`, formData, {
      reportProgress: true
    });

    return this.http.request(req);
  }

  getFileUrl(fileId: string): string {
    return `${this.fileUrl}/download/${fileId}`;
  }

  getViewUrl(fileId: string): string {
  return `http://localhost:5233/api/file/view/${fileId}`;
}
}