import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';

import { DiscussionService, DiscussionItem, CommentItem } from './services/discussion.service';
import { SignalrService } from './services/signalr.service';
import Swal from 'sweetalert2';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
// 1. Import the new components
import { NavbarComponent } from './navbar/navbar';
import { FooterComponent } from './footer/footer';
@Component({
  selector: 'app-root',
  standalone: true,
  // 2. Add them to the imports list
  imports: [CommonModule, RouterOutlet, FormsModule, NavbarComponent, FooterComponent, DatePipe, DecimalPipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit {
  discussions: DiscussionItem[] = [];
  allComments: any[] = [];
  globalCommentText: string = '';
  
  newTrip: any = {
    title: '',
    description: '',
    type: 'Trip',
    customOptions: ['', '']
  };

  constructor(
    private discussionService: DiscussionService,
    private signalrService: SignalrService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone 
  ) {}

  ngOnInit() {
    this.loadInitialData();
    this.setupSignalRListeners();
  }

  loadInitialData() {
    this.discussionService.getDiscussions().subscribe({
      next: (data: DiscussionItem[]) => {
        this.zone.run(() => {
          this.discussions = data;
          this.updateGlobalComments();
        });
      },
      error: (err: any) => console.error('Error loading initial data:', err)
    });
  }

  setupSignalRListeners() {
    // 1. Listen for New Comments
    this.signalrService.messageReceived.subscribe((data: any) => {
      this.zone.run(() => {
        const dId = data.discussionId || data.DiscussionId;
        const comment = data.comment || data.Comment || data;
        const discussion = this.discussions.find(d => d.id === dId);
        
        if (discussion) {
          discussion.comments = discussion.comments || [];
          const commentText = comment.text || comment.Text;
          const isDuplicate = discussion.comments.some((c: { text: any; }) => (c.text || (c as any).Text) === commentText);

          if (!isDuplicate) {
            discussion.comments.push(comment);
            this.updateGlobalComments();
            this.cdr.detectChanges(); 
          }
        }
      });
    });

    // 2. Listen for Vote Updates
    this.signalrService.voteUpdated.subscribe((updatedItem: any) => {
      this.zone.run(() => {
        const uId = updatedItem.id || updatedItem.Id;
        const index = this.discussions.findIndex(d => d.id === uId);
        if (index !== -1) {
          this.discussions[index] = { ...updatedItem };
          this.cdr.detectChanges();
        }
      });
    });

    // 3. Listen for Deletions
    this.signalrService.discussionDeleted.subscribe((id: string) => {
      this.zone.run(() => {
        this.discussions = this.discussions.filter(d => d.id !== id);
        this.updateGlobalComments();
        this.cdr.detectChanges();
      });
    });

    // 4. Listen for New Discussions
    this.signalrService.newDiscussion.subscribe((newItem: any) => {
      this.zone.run(() => {
        const nId = newItem.id || newItem.Id;
        if (!this.discussions.some(d => d.id === nId)) {
          this.discussions = [...this.discussions, newItem];
          this.cdr.detectChanges();
        }
      });
    });
  }

  // --- Voting Logic with Duplicate Check Popup ---
  castVote(discussionId: string | undefined, optionText: string) {
    if (!discussionId) return;

    this.discussionService.vote(discussionId, optionText, 'Guest User').subscribe({
      next: (res: any) => {
        console.log('Vote cast successfully');
      },
      error: (err: { status: number; }) => {
        // If Backend returns 400 Bad Request, it means a duplicate vote
        if (err.status === 400) {
          Swal.fire({
            icon: 'warning',
            title: 'Already Voted!',
            text: 'You have already cast your vote for this item.',
            confirmButtonColor: '#3085d6'
          });
        } else {
          console.error('Vote error:', err);
          Swal.fire('Error', 'Could not process vote.', 'error');
        }
      }
    });
  }

  updateGlobalComments() {
    this.allComments = this.discussions
      .flatMap(d => (d.comments || []).map((c: { text: any; user: any; createdAt: any; }) => ({ 
        text: c.text || (c as any).Text || '', 
        user: c.user || (c as any).User || 'Guest',
        createdAt: c.createdAt || (c as any).CreatedAt || new Date(),
        discussionTitle: d.title 
      })))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    this.scrollToBottom();
  }

  postCommentToLatest() {
    const text = this.globalCommentText.trim();
    if (!text || this.discussions.length === 0) return;
    
    const latestDiscussion = this.discussions[this.discussions.length - 1];
    if (latestDiscussion && latestDiscussion.id) {
      const comment: CommentItem = {
        user: 'Guest User',
        text: text,
        createdAt: new Date()
      };

      this.discussionService.addComment(latestDiscussion.id, comment).subscribe({
        next: () => { this.globalCommentText = ''; },
        error: (err: any) => Swal.fire('Error', 'Message could not be sent', 'error')
      });
    }
  }

  deleteDiscussion(id: string | undefined, title: string = 'this item') {
    if (!id) return;
    
    Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete "${title}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then((result: { isConfirmed: any; }) => {
      if (result.isConfirmed) {
        this.discussionService.deleteDiscussion(id).subscribe({
          error: (err: any) => console.error('Delete error:', err)
        });
      }
    });
  }

  // --- Logic to Publish New Suggestion with Validation ---
  addNewTrip() {
    const title = this.newTrip.title.trim();

    // Validation: Check for Title
    if (!title) {
      Swal.fire('Warning', 'Please provide a title!', 'warning');
      return;
    }

    let options = [];

    // Validation: Check for Custom Poll Options
    if (this.newTrip.type === 'Other') {
      const validOptions = this.newTrip.customOptions
        .map((opt: string) => opt.trim())
        .filter((opt: string) => opt !== '');

      if (validOptions.length < 2) {
        Swal.fire({
          icon: 'info',
          title: 'Options Required',
          text: 'Please add at least 2 options for a custom poll.',
        });
        return;
      }
      options = validOptions.map((opt: string) => ({ optionText: opt, voteCount: 0 }));
    } else {
      // Default Trip options
      options = [
        { optionText: 'Agree', voteCount: 0 },
        { optionText: 'Disagree', voteCount: 0 }
      ];
    }

    const item: DiscussionItem = {
      title: title,
      description: this.newTrip.description,
      type: this.newTrip.type,
      user: 'Guest User',
      createdAt: new Date(),
      isConfirmed: false,
      options: options,
      comments: []
    };

    this.discussionService.createDiscussion(item).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Posted!',
          timer: 1500,
          showConfirmButton: false
        });
        this.resetForm();
      },
      error: (err: any) => console.error('Creation error:', err)
    });
  }

  resetForm() { 
    this.newTrip = { title: '', description: '', type: 'Trip', customOptions: ['', ''] }; 
  }
  
  addOptionField() { this.newTrip.customOptions.push(''); }
  
  removeOptionField(index: number) { 
    if (this.newTrip.customOptions.length > 2) this.newTrip.customOptions.splice(index, 1); 
  }
  
  trackByIndex(index: number) { return index; }

  scrollToBottom() {
    setTimeout(() => {
      const chatWrapper = document.querySelector('.chat-area-wrapper');
      if (chatWrapper) chatWrapper.scrollTop = chatWrapper.scrollHeight;
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 150);
  }

  getVotePercentage(item: any, index: number): number {
    if (!item || !item.options || !item.options[index]) return 0;
    const total = item.options.reduce((acc: number, curr: any) => acc + (curr.voteCount || 0), 0);
    return total === 0 ? 0 : Math.round(((item.options[index].voteCount || 0) / total) * 100);
  }

  isNewDay(prevDate: any, currDate: any): boolean {
    if (!prevDate) return true;
    return new Date(prevDate).toDateString() !== new Date(currDate).toDateString();
  }
}

