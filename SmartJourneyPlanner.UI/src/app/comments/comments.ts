import {Component, OnInit, OnDestroy,ChangeDetectorRef, NgZone, ViewChild, ElementRef} from '@angular/core';
import { CommentsService, CommentItem } from '../services/comments.service';
import { SignalrService }  from '../services/signalr.service';
import { FormsModule }     from '@angular/forms';
import { CommonModule }    from '@angular/common';
import { Subscription }    from 'rxjs';
import { HttpEventType }   from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-comments',
    imports: [FormsModule, CommonModule],
    templateUrl: './comments.html',
    styleUrls: ['./comments.css']
})
export class CommentsComponent implements OnInit, OnDestroy {

  @ViewChild('chatWrapper') chatWrapperRef!: ElementRef;

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

  constructor(
    private commentsService: CommentsService,
    private signalrService:  SignalrService,
    private cdr:             ChangeDetectorRef,
    private zone:            NgZone
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.setupSignalRListeners();
  }

  ngOnDestroy(): void {
    if (this.commentSub)       this.commentSub.unsubscribe();
    if (this.commentDeleteSub) this.commentDeleteSub.unsubscribe();

    if (this.signalrService.hubConnection) {
      this.signalrService.hubConnection.off('CommentDeleted');
      this.signalrService.hubConnection.off('CommentUpdated');
    }
  }

  loadInitialData(): void {
    this.isLoading = true;
    this.commentsService.getComments().subscribe({
      next: (comments) => {
        this.zone.run(() => {
          this.isLoading   = false;
          this.allComments = comments.sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          this.scrollToBottom();
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.isLoading = false;
        Swal.fire('Error', 'Could not load messages. Please refresh.', 'error');
      }
    });
  }

  setupSignalRListeners(): void {
    this.commentSub = this.signalrService.messageReceived.subscribe((comment: any) => {
      this.zone.run(() => {
        const newMsg: CommentItem = {
          id:          comment.id          || comment.Id,
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
      });
    });

    if (this.signalrService.hubConnection) {

      this.signalrService.hubConnection.on('CommentDeleted', (commentId: string) => {
        this.zone.run(() => {
          this.allComments = this.allComments.filter(c => c.id !== commentId);
          // Clear search if deleted message was a match
          if (this.searchQuery) this.runSearch();
          this.cdr.detectChanges();
        });
      });

      this.signalrService.hubConnection.on('CommentUpdated', (updatedComment: any) => {
        this.zone.run(() => {
          const cId   = updatedComment.id || updatedComment.Id;
          const index = this.allComments.findIndex(c => c.id === cId);
          if (index !== -1) {
            this.allComments[index].text = updatedComment.text || updatedComment.Text;
            // Refresh search results in case updated text affects matches
            if (this.searchQuery) this.runSearch();
            this.cdr.detectChanges();
          }
        });
      });
    }
  }

  postCommentToLatest(): void {
    const text = this.globalCommentText.trim();
    if (!text) return;

    if (this.isEditing && this.editingCommentId) {
      this.commentsService.updateComment(this.editingCommentId, text).subscribe({
        next:  () => this.cancelEditing(),
        error: () => Swal.fire('Error', 'Update failed. Please try again.', 'error')
      });
    } else {
      const comment: CommentItem = {
        user:      this.currentUser,
        text,
        createdAt: new Date()
      };
      this.commentsService.addComment(comment).subscribe({
        next:  () => { this.globalCommentText = ''; },
        error: () => Swal.fire('Error', 'Message could not be sent.', 'error')
      });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    input.value = '';

    if (file.type !== 'application/pdf') {
      Swal.fire('Invalid file', 'Only PDF files can be shared.', 'warning');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      Swal.fire('File too large', 'PDF must be under 20 MB.', 'warning');
      return;
    }

    this.isUploading    = true;
    this.uploadProgress = 0;

    this.commentsService.uploadPdf(file, this.currentUser).subscribe({
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
      error: () => {
        this.isUploading = false;
        Swal.fire('Upload failed', 'Could not upload the PDF. Please try again.', 'error');
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
    if (bytes < 1024)         return `${bytes} B`;
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
          error: () => Swal.fire('Error', 'Could not delete the message.', 'error')
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

    // Match text messages by content, PDF messages by file name
    this.searchResults = this.allComments.filter(c => {
      if (c.messageType === 'pdf') {
        return c.fileName?.toLowerCase().includes(query);
      }
      return c.text?.toLowerCase().includes(query);
    });

    // Reset to first match whenever query changes
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

  // Returns true if this comment is a search match
  isMatch(comment: CommentItem): boolean {
    return this.searchResults.some(r => r.id === comment.id);
  }

  // Returns true if this comment is the currently focused match
  isActiveMatch(comment: CommentItem): boolean {
    return this.currentMatchIndex >= 0 &&
           this.searchResults[this.currentMatchIndex]?.id === comment.id;
  }
}