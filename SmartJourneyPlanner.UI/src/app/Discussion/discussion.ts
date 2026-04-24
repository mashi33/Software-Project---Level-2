import { Component, ViewEncapsulation, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { DiscussionService, DiscussionItem } from '../services/discussion.service';
import { SignalrService } from '../services/signalr.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs'; 
import Swal from 'sweetalert2';
import { CommentsComponent } from '../comments/comments';

@Component({
    selector: 'app-discussion',
    imports: [FormsModule, CommonModule, CommentsComponent],
    templateUrl: './discussion.html',
    styleUrls: ['./discussion.css'],
    encapsulation: ViewEncapsulation.None
})
export class DiscussionComponent implements OnInit, OnDestroy { 
  discussions: DiscussionItem[] = [];
  private voteSub!: Subscription;
  private deleteSub!: Subscription;
  private newDiscussionSub!: Subscription;
  currentUser: string = 'Guest User';
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

  ngOnDestroy() {
    if (this.voteSub) this.voteSub.unsubscribe();
    if (this.deleteSub) this.deleteSub.unsubscribe();
    if (this.newDiscussionSub) this.newDiscussionSub.unsubscribe();
  }

  loadInitialData() {
    this.discussionService.getDiscussions().subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.discussions = data;
        });
      },
      error: (err) => console.error('Error loading discussions:', err)
    });
  }

  isVotingDisabled(item: any): boolean {
    return !!(item.isConfirmed || item.isRejected);
  }

  setupSignalRListeners() {
    this.voteSub = this.signalrService.voteUpdated.subscribe((updatedItem: any) => {
      this.zone.run(() => {
        const uId = updatedItem.id || updatedItem.Id;
        const index = this.discussions.findIndex(d => d.id === uId);
        if (index !== -1) {
          this.discussions[index].options = updatedItem.options || updatedItem.Options;
          this.discussions[index].isConfirmed = updatedItem.isConfirmed || updatedItem.IsConfirmed;
          this.discussions[index].isRejected = updatedItem.isRejected || updatedItem.IsRejected;
          this.discussions[index].userVotes = updatedItem.userVotes || updatedItem.UserVotes;
          this.discussions[index].memberLimit = updatedItem.memberLimit || updatedItem.MemberLimit;
          this.checkStatusAlerts(this.discussions[index]);
          this.cdr.detectChanges();
        }
      });
    });

    this.deleteSub = this.signalrService.discussionDeleted.subscribe((id: string) => {
      this.zone.run(() => {
        this.discussions = this.discussions.filter(d => d.id !== id);
        this.cdr.detectChanges();
      });
    });

    this.newDiscussionSub = this.signalrService.newDiscussion.subscribe((newItem: any) => {
      this.zone.run(() => {
        const nId = newItem.id || newItem.Id;
        if (!this.discussions.some(d => d.id === nId)) {
          this.discussions = [...this.discussions, newItem];
          this.cdr.detectChanges();
        }
      });
    });
  }

  private checkStatusAlerts(item: DiscussionItem) {
    const totalVotes = item.userVotes?.length || 0;
    if (totalVotes >= item.memberLimit) {
      if (item.isConfirmed) {
        Swal.fire({
          icon: 'success',
          title: 'Trip Confirmed!',
          text: `The proposal "${item.title}" reached the majority and is added to the trip!`,
          timer: 3000
        });
      } else if (item.isRejected && item.user === this.currentUser) {
        this.showRejectedChoice(item);
      }
    }
  }

  showRejectedChoice(item: DiscussionItem) {
    Swal.fire({
      title: 'Proposal Rejected',
      text: "Member limit reached but majority disagreed. Keep this box or remove it?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Remove Box',
      cancelButtonText: 'Keep it'
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteDiscussion(item);
      }
    });
  }

  castVote(discussionId: string | undefined, optionText: string) {
    if (!discussionId) return;
    const item = this.discussions.find(d => d.id === discussionId);
    
    if (this.isVotingDisabled(item)) {
      Swal.fire('Locked', 'Voting is already closed for this item.', 'info');
      return;
    }

    const currentVotes = item?.userVotes?.length || 0;
    const limit = item?.memberLimit || 5;
    const hasAlreadyVoted = item?.userVotes?.some(
      (v: any) => (v.userId || v.UserId) === this.currentUser
    );

    if (!hasAlreadyVoted && currentVotes >= limit) {
      Swal.fire('Limit Reached', 'All member slots are filled. Only existing voters can change their vote.', 'warning');
      return;
    }

    this.discussionService.vote(discussionId, optionText, this.currentUser).subscribe({
      next: (updatedItem: any) => {
        console.log('Vote processed');
      },
      error: (err) => {
        console.error('Voting failed:', err);
        if (err.status === 400) {
          Swal.fire('Info', err.error.message || 'Voting is closed.', 'info');
        } else {
          Swal.fire('Error', 'Vote cast failed.', 'error');
        }
      }
    });
  }

  validateTitle(title: string): boolean {
    if (!title) return false;
    const t = title.trim();
    if (t.length < 3 || t.length > 50) return false;
    const letterCount = (t.match(/[a-zA-Z]/g) || []).length;
    if (letterCount < 3) return false;
    const hasVowel = /[aeiouy]/i;
    if (!hasVowel.test(t)) return false;
    const excessiveConsonants = /[^aeiouy\s\d]{5,}/i; 
    if (excessiveConsonants.test(t)) return false;
    return true;
  }

  addNewTrip() {
    const title = this.newTrip.title.trim();
    if (!this.validateTitle(title)) {
      Swal.fire('Invalid Title', 'Please provide a meaningful title (at least 3 letters and 1 vowel).', 'warning');
      return;
    }
    let options = [];
    if (this.newTrip.type === 'Other') {
      const validOptions = this.newTrip.customOptions
        .map((opt: string) => opt.trim())
        .filter((opt: string) => opt !== '');
      if (validOptions.length < 2) {
        Swal.fire('Info', 'Please add at least 2 options for a poll.', 'info');
        return;
      }
      options = validOptions.map((opt: string) => ({ optionText: opt, voteCount: 0 }));
    } else {
      options = [
        { optionText: 'Agree', voteCount: 0 },
        { optionText: 'Disagree', voteCount: 0 }
      ];
    }
    const item: any = {
      title: title,
      description: this.newTrip.description,
      type: this.newTrip.type,
      user: this.currentUser,
      createdAt: new Date(),
      isConfirmed: false,
      isRejected: false,
      options: options,
      comments: [],
      memberLimit: 5
    };
    this.discussionService.createDiscussion(item).subscribe({
      next: () => {
        this.resetForm();
        Swal.fire({ icon: 'success', title: 'Posted', showConfirmButton: false, timer: 1500 });
      },
      error: (err) => console.error('Creation error:', err)
    });
  }

  deleteDiscussion(item: DiscussionItem) {
    if (!item || !item.id) return;
    if (item.user !== this.currentUser) {
      Swal.fire({ icon: 'error', title: 'Unauthorized', text: 'Only the creator can delete this vote box!' });
      return;
    }
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.discussionService.deleteDiscussion(item.id!).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Deleted!', text: 'The vote box has been deleted.', showConfirmButton: false, timer: 1500 });
          },
          error: (err) => Swal.fire('Error', 'Could not delete the discussion.', 'error')
        });
      }
    });
  }

  resetForm() { this.newTrip = { title: '', description: '', type: 'Trip', customOptions: ['', ''] }; }
  addOptionField() { this.newTrip.customOptions.push(''); }
  removeOptionField(index: number) { if (this.newTrip.customOptions.length > 2) this.newTrip.customOptions.splice(index, 1); }
  trackByIndex(index: number) { return index; }
  
  getVotePercentage(item: any, index: number): number {
    if (!item || !item.options) return 0;
    const total = item.options.reduce((acc: number, curr: any) => acc + (curr.voteCount || 0), 0);
    return total === 0 ? 0 : Math.round(((item.options[index].voteCount || 0) / total) * 100);
  }

  showNotReadyAlert() {
    Swal.fire({ title: 'Coming Soon!', text: 'This page is currently under development.', icon: 'info', confirmButtonColor: '#6e8efb' });
  }
}