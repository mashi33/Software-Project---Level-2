import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommentsService } from '../services/comments.service'; 
import { SignalrService } from '../services/signalr.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs'; 
import Swal from 'sweetalert2';

@Component({
  selector: 'app-comments',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './comments.html',
  styleUrls: ['./comments.css']
})
export class CommentsComponent implements OnInit, OnDestroy { 
  allComments: any[] = []; 
  globalCommentText: string = '';
  
  isEditing: boolean = false;
  editingCommentId: string | null = null;

  private commentSub!: Subscription;
  private commentDeleteSub!: Subscription; 

  currentUser: string = 'Guest User';

  constructor(
    private commentsService: CommentsService, 
    private signalrService: SignalrService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone 
  ) {}

  ngOnInit() {
    this.loadInitialData();
    this.setupSignalRListeners();
  }

  ngOnDestroy() {
    if (this.commentSub) this.commentSub.unsubscribe();
    if (this.commentDeleteSub) this.commentDeleteSub.unsubscribe();
  }

  loadInitialData() {
    this.commentsService.getComments().subscribe({
      next: (comments) => {
        this.zone.run(() => {
          this.allComments = comments.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          this.scrollToBottom();
          this.cdr.detectChanges();
        });
      },
      error: (err) => console.error('Error loading comments:', err)
    });
  }

  setupSignalRListeners() {
    this.commentSub = this.signalrService.messageReceived.subscribe((comment: any) => {
      this.zone.run(() => {
        const cId = comment.id || comment.Id;
        const isAlreadyInList = this.allComments.some(c => (c.id === cId || (c as any).Id === cId));

        if (!isAlreadyInList && cId) {
          const newMsg = {
            id: cId,
            text: comment.text || comment.Text,
            user: comment.user || comment.User || 'Guest',
            createdAt: comment.createdAt || comment.CreatedAt || new Date()
          };

          this.allComments.push(newMsg);
          this.allComments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          
          this.scrollToBottom();
          this.cdr.detectChanges(); 
        }
      });
    });

    if (this.signalrService.hubConnection) {
      this.signalrService.hubConnection.on('CommentDeleted', (commentId: string) => {
        this.zone.run(() => {
          this.allComments = this.allComments.filter(c => c.id !== commentId);
          this.cdr.detectChanges();
        });
      });

      this.signalrService.hubConnection.on('CommentUpdated', (updatedComment: any) => {
        this.zone.run(() => {
          const cId = updatedComment.id || updatedComment.Id;
          const index = this.allComments.findIndex(c => c.id === cId);
          if (index !== -1) {
            this.allComments[index].text = updatedComment.text || updatedComment.Text;
            this.cdr.detectChanges();
          }
        });
      });
    }
  }

  postCommentToLatest() {
    const text = this.globalCommentText.trim();
    if (!text) return;

    if (this.isEditing && this.editingCommentId) {
      this.commentsService.updateComment(this.editingCommentId, text).subscribe({
        next: () => { 
          this.cancelEditing(); 
          // Load comments again is optional here if SignalR handles the update
        },
        error: (err) => Swal.fire('Error', 'Update failed', 'error')
      });
    } else {
      const comment: any = {
        user: this.currentUser,
        text: text,
        createdAt: new Date()
      };

      this.commentsService.addComment(comment).subscribe({
        next: () => { 
          this.globalCommentText = ''; 
          // Message will be added via SignalR listener
        },
        error: (err) => Swal.fire('Error', 'Message could not be sent', 'error')
      });
    }
  }

  startEditing(comment: any) {
    this.isEditing = true;
    this.editingCommentId = comment.id;
    this.globalCommentText = comment.text;
  }

  cancelEditing() {
    this.isEditing = false;
    this.editingCommentId = null;
    this.globalCommentText = '';
  }

  deleteComment(commentId: string) {
    if (!commentId) return;

    Swal.fire({
      title: 'Are you sure?',
      text: "Do you want to delete this message?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.commentsService.deleteComment(commentId).subscribe({
          error: (err) => Swal.fire('Error', 'Could not delete the message.', 'error')
        });
      }
    });
  }

  scrollToBottom() {
    setTimeout(() => {
      const chatWrapper = document.querySelector('.chat-area-wrapper');
      if (chatWrapper) {
        chatWrapper.scrollTo({ top: chatWrapper.scrollHeight, behavior: 'smooth' });
      }
    }, 100);
  }

  isNewDay(prevDate: any, currDate: any): boolean {
    if (!prevDate) return true;
    return new Date(prevDate).toDateString() !== new Date(currDate).toDateString();
  }
}