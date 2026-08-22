import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone, ViewChild, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommentsService, CommentItem } from '../services/comments.service';
import { SignalrService } from '../services/signalr.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { HttpEventType } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-comments',
    standalone: true,
    imports: [FormsModule, CommonModule],
    templateUrl: './comments.html',
    styleUrls: ['./comments.css']
})
export class CommentsComponent implements OnInit, OnDestroy, OnChanges {

  @ViewChild('chatWrapper') chatWrapperRef!: ElementRef;
  
  // Trip Id from parent component (Discussion) to load comments for the selected trip
  @Input() selectedTripId: string = '';

  allComments:       CommentItem[]    = [];
  globalCommentText: string           = '';
  isEditing:         boolean          = false;
  editingCommentId:  string | null    = null;
  isLoading:         boolean          = false;
  isUploading:       boolean          = false;
  uploadProgress:    number           = 0;

  currentUser: string = 'Guest User';

  viewingFileIds: Set<string> = new Set();

  // ── SEARCH ──
  searchQuery:        string        = '';
  searchResults:      CommentItem[] = [];
  currentMatchIndex:  number        = -1;
  isSearchOpen:       boolean       = false;

  private commentSub!:       Subscription;
  private commentDeleteSub!: Subscription;
  private connectionRestoredSub!: Subscription;
    private loadRetryTimeout: any = null; 
  private avatarColors: string[] = [
  '#4facfe', '#ff5a5f', '#4cd964', '#ffb84c',
  '#a66cff', '#ff6ec7', '#00d2ff', '#ffd54f',
  '#ff8a5c', '#5ce1e6', '#c77dff', '#7ee787',
  '#f472b6', '#38bdf8', '#fb923c', '#818cf8'
];

getAvatarColor(username: string): string {
  const name = (username || 'Guest').trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const index = hash % this.avatarColors.length;
  return this.avatarColors[index];
}

  constructor(
    private commentsService: CommentsService,
    private signalrService:  SignalrService,
    private cdr:             ChangeDetectorRef,
    private zone:            NgZone
  ) {}

  ngOnInit(): void {
    this.setupSignalRListeners();
    // NEW — load the logged-in user's name so chat bubbles align correctly
  const storedUser = localStorage.getItem('userName');
  this.currentUser = storedUser ? storedUser : 'Guest User';

    
  }

  // Identify when switched to a different trip in the parent component and load comments for that trip
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedTripId'] && !changes['selectedTripId'].firstChange) {
      this.loadInitialData();
    } else if (changes['selectedTripId'] && changes['selectedTripId'].firstChange) {
      this.loadInitialData();
    }
  }

  ngOnDestroy(): void {
    if (this.commentSub)       this.commentSub.unsubscribe();
    if (this.commentDeleteSub) this.commentDeleteSub.unsubscribe();
    if (this.connectionRestoredSub) this.connectionRestoredSub.unsubscribe(); 
    if (this.loadRetryTimeout) clearTimeout(this.loadRetryTimeout); 

    if (this.signalrService.hubConnection) {
      this.signalrService.hubConnection.off('CommentDeleted');
      this.signalrService.hubConnection.off('CommentUpdated');
    }
  }

    loadInitialData(): void {
    if (!this.selectedTripId) return;

    this.isLoading = true;

    this.commentsService.getCommentsByTrip(this.selectedTripId).subscribe({
      next: (comments) => {
        this.zone.run(() => {
          this.isLoading   = false;
          this.allComments = comments.sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          this.scrollToBottom();
          this.cdr.detectChanges();
        });
        if (this.loadRetryTimeout) clearTimeout(this.loadRetryTimeout);
      },
      error: (err) => {
        this.isLoading = false;

        if (err?.status === 0 || err?.status === 503) {
          // Silently retry — discussion.component.ts already shows the
          // "reconnecting" popup for the whole page's initial-load sequence.
          this.loadRetryTimeout = setTimeout(() => this.loadInitialData(), 5000);
        } else {
          this.showNetworkError(err, 'Could not load messages for this trip.');
        }
      }
    });
  }

  setupSignalRListeners(): void {
    this.commentSub = this.signalrService.messageReceived.subscribe((comment: any) => {
      this.zone.run(() => {
        const nTripId = comment.tripId || comment.TripId;

        // Filter incoming comments to only add those that belong to the currently selected trip.
        //  This ensures that users only see real-time updates relevant to the trip they are viewing.
        if (nTripId === this.selectedTripId) {
          const newMsg: CommentItem = {
            id:          comment.id          || comment.Id,
            tripId:      nTripId,
            text:        comment.text        || comment.Text        || '',
            user:        comment.user        || comment.User        || 'Guest',
            createdAt:   comment.createdAt   || comment.CreatedAt   || new Date(),
            messageType: comment.messageType || comment.MessageType || 'text',
            fileId:      comment.fileId      || comment.FileId      || undefined,
            fileName:    comment.fileName    || comment.FileName    || undefined,
            fileSize:    comment.fileSize    || comment.FileSize    || undefined
          };

          this.allComments.push(newMsg);
          this.allComments.sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          this.scrollToBottom();
          this.cdr.detectChanges();
        }
      });
    });

    if (this.signalrService.hubConnection) {

      this.signalrService.hubConnection.on('CommentDeleted', (commentId: string) => {
        this.zone.run(() => {
          this.allComments = this.allComments.filter(c => c.id !== commentId);
          if (this.searchQuery) this.runSearch();
          this.cdr.detectChanges();
        });
      });

        this.signalrService.hubConnection.on('CommentUpdated', (updatedComment: any) => {
        this.zone.run(() => {
          const cId   = updatedComment.id || updatedComment.Id;
          const index = this.allComments.findIndex(c => c.id === cId);
          if (index !== -1) {
            // Replace the whole comment so isDeleted, messageType, fileId etc.
            // all stay in sync — not just the text (needed for the delete-placeholder flow)
            this.allComments[index] = {
              ...this.allComments[index],
              text:        updatedComment.text        ?? updatedComment.Text        ?? '',
              isDeleted:   updatedComment.isDeleted    ?? updatedComment.IsDeleted   ?? false,
              isEdited:    updatedComment.isEdited     ?? updatedComment.IsEdited    ?? false, 
              messageType: updatedComment.messageType  ?? updatedComment.MessageType ?? this.allComments[index].messageType,
              fileId:      updatedComment.fileId       ?? updatedComment.FileId,
              fileName:    updatedComment.fileName     ?? updatedComment.FileName,
              fileSize:    updatedComment.fileSize     ?? updatedComment.FileSize,
            };
            if (this.searchQuery) this.runSearch();
            this.cdr.detectChanges();
          }
        });
      });
    }

    //— reload comments once connection is restored, to catch any messages
    // sent by others while this client was disconnected
    this.connectionRestoredSub = this.signalrService.connectionRestored.subscribe(() => {
      this.zone.run(() => {
        this.loadInitialData();
      });
    });
  }

  postCommentToLatest(): void {
    const text = this.globalCommentText.trim();
    if (!text || !this.selectedTripId) return;

    if (this.isEditing && this.editingCommentId) {
      this.commentsService.updateComment(this.editingCommentId, text).subscribe({
        next:  () => this.cancelEditing(),
        error: (err) => this.showNetworkError(err, 'Update failed. Please try again.')
      });
    } else {
      const comment: CommentItem = {
        tripId:    this.selectedTripId,
        user:      this.currentUser,
        text,
        createdAt: new Date()
      };
      this.commentsService.addComment(comment).subscribe({
        next:  () => { this.globalCommentText = ''; },
        error: (err) => this.showNetworkError(err, 'Message could not be sent.')
      });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file || !this.selectedTripId) return;

    input.value = '';

    if (file.type !== 'application/pdf') {
      Swal.fire('Invalid file', 'Only PDF files can be shared.', 'warning');
      return;
    }

    this.isUploading    = true;
    this.uploadProgress = 0;

    // Upload the PDF using trip id
    this.commentsService.uploadPdf(file, this.currentUser, this.selectedTripId).subscribe({
      next: (httpEvent) => {
        if (httpEvent.type === HttpEventType.UploadProgress && httpEvent.total) {
          this.uploadProgress = Math.round(100 * httpEvent.loaded / httpEvent.total);
          this.cdr.detectChanges();
        } else if (httpEvent.type === HttpEventType.Response) {
          this.isUploading    = false;
          this.uploadProgress = 0;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.isUploading = false;
        if (err?.status === 0 || err?.status === 503) {
          this.showNetworkError(err, 'PDF upload failed.');
        } else {
          Swal.fire('Upload failed', 'Only PDF files under 20MB can be shared.', 'error');
        }
      }
    });
  }

  getFileUrl(fileId: string): string {
    return this.commentsService.getFileUrl(fileId);
  }

  getViewUrl(fileId: string): string {
    return this.commentsService.getViewUrl(fileId);
  }

  openPdfInline(fileId: string): void {
    this.viewingFileIds.add(fileId);
    this.cdr.detectChanges();

    const url = this.getViewUrl(fileId);
    window.open(url, '_blank');

    setTimeout(() => {
      this.viewingFileIds.delete(fileId);
      this.cdr.detectChanges();
    }, 1500);
  }

  formatFileSize(bytes: number = 0): string {
    if (bytes < 1024)          return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  startEditing(comment: CommentItem): void {
    this.isEditing         = true;
    this.editingCommentId  = comment.id!;
    this.globalCommentText = comment.text;
  }

  cancelEditing(): void {
    this.isEditing         = false;
    this.editingCommentId  = null;
    this.globalCommentText = '';
  }

  deleteComment(commentId: string): void {
    if (!commentId) return;
    Swal.fire({
      title:               'Are you sure?',
      text:                'Do you want to delete this message?',
      icon:                'warning',
      showCancelButton:    true,
      confirmButtonColor:  '#d33',
      cancelButtonColor:   '#3085d6',
      confirmButtonText:   'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.commentsService.deleteComment(commentId).subscribe({
          error: (err) => this.showNetworkError(err, 'Could not delete the message.')
        });
      }
    });
  }

  scrollToBottom(): void {
    setTimeout(() => {
      if (this.chatWrapperRef?.nativeElement) {
        this.chatWrapperRef.nativeElement.scrollTo({
          top:      this.chatWrapperRef.nativeElement.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);
  }

  isNewDay(prevDate: any, currDate: any): boolean {
    if (!prevDate) return true;
    return new Date(prevDate).toDateString() !== new Date(currDate).toDateString();
  }

  // ── SEARCH METHODS ──
  toggleSearch(): void {
    this.isSearchOpen = !this.isSearchOpen;
    if (!this.isSearchOpen) {
      this.clearSearch();
    }
  }

  onSearchInput(): void {
    if (!this.searchQuery.trim()) {
      this.clearSearch();
      return;
    }
    this.runSearch();
  }

  private runSearch(): void {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      this.clearSearch();
      return;
    }

    this.searchResults = this.allComments.filter(c => {
      if (c.messageType === 'pdf') {
        return c.fileName?.toLowerCase().includes(query);
      }
      return c.text?.toLowerCase().includes(query);
    });

    this.currentMatchIndex = this.searchResults.length > 0 ? 0 : -1;
    if (this.currentMatchIndex === 0) {
      this.scrollToMatch(this.searchResults[0]);
    }
    this.cdr.detectChanges();
  }

  goToNextMatch(): void {
    if (this.searchResults.length === 0) return;
    this.currentMatchIndex = (this.currentMatchIndex + 1) % this.searchResults.length;
    this.scrollToMatch(this.searchResults[this.currentMatchIndex]);
  }

  goToPrevMatch(): void {
    if (this.searchResults.length === 0) return;
    this.currentMatchIndex =
      (this.currentMatchIndex - 1 + this.searchResults.length) % this.searchResults.length;
    this.scrollToMatch(this.searchResults[this.currentMatchIndex]);
  }

  private scrollToMatch(comment: CommentItem): void {
    setTimeout(() => {
      const el = document.querySelector(`[data-comment-id="${comment.id}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  }

  clearSearch(): void {
    this.searchQuery       = '';
    this.searchResults     = [];
    this.currentMatchIndex = -1;
    this.cdr.detectChanges();
  }

  isMatch(comment: CommentItem): boolean {
    return this.searchResults.some(r => r.id === comment.id);
  }

  isActiveMatch(comment: CommentItem): boolean {
    return this.currentMatchIndex >= 0 &&
           this.searchResults[this.currentMatchIndex]?.id === comment.id;
  }

  // Shows a friendly popup for network/timeout/server errors.
  // status === 0 means the request never reached the server (offline, timeout, unreachable).
  private showNetworkError(err: any, fallbackMsg: string = 'Something went wrong. Please try again.') {
    if (err?.status === 0) {
      Swal.fire({
        icon: 'error',
        title: 'Connection Problem',
        text: err.error?.message || 'Cannot reach the server. Please check your internet connection.',
      });
    } else if (err?.status === 503) {
      Swal.fire({
        icon: 'error',
        title: 'Server Unavailable',
        text: err.error?.message || 'The server is temporarily unavailable. Please try again shortly.',
      });
    } else {
      Swal.fire('Error', err?.error?.message || fallbackMsg, 'error');
    }
  }
}