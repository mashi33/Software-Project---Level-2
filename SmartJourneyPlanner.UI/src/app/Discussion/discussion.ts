import { Component, ViewEncapsulation, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { DiscussionService, DiscussionItem } from '../services/discussion.service';
import { SignalrService } from '../services/signalr.service';
import { TripService } from '../services/trip.service'; 
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs'; 
import Swal from 'sweetalert2';
import { CommentsComponent } from '../comments/comments';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'app-discussion',
    standalone: true, 
    imports: [FormsModule, CommonModule, CommentsComponent],
    templateUrl: './discussion.html',
    styleUrls: ['./discussion.css'],
    encapsulation: ViewEncapsulation.None
})
export class DiscussionComponent implements OnInit, OnDestroy { 
  // State variables for discussions and subscriptions
  discussions: DiscussionItem[] = [];
  private voteSub!: Subscription;
  private deleteSub!: Subscription;
  private newDiscussionSub!: Subscription;
  
  userTrips: any[] = []; 
  selectedTripId: string = '';
  
  currentUser: string = 'Guest User';
  newTrip: any = {
    title: '',
    description: '',
    type: 'Trip',
    customOptions: ['', '']
  };

  constructor(
    private route: ActivatedRoute,
    private discussionService: DiscussionService,
    private signalrService: SignalrService,
    private tripService: TripService, 
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private router: Router
  ) {}

  // Initialize component: check URL for tripId and setup data/listeners
  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const tripIdFromUrl = params['tripId'];
      
      if (tripIdFromUrl) {
        this.selectedTripId = tripIdFromUrl;
      }
      this.setUserData();
      this.loadUserTrips();
      this.setupSignalRListeners();
    });
  }

  // Get current user name from local storage
  setUserData() {
    const storedUser = localStorage.getItem('userName'); 
    this.currentUser = storedUser ? storedUser : 'Guest User';
    console.log('Current User set to:', this.currentUser);
  }

  // Cleanup: unsubscribe from SignalR events when leaving the page
  ngOnDestroy() {
    if (this.voteSub) this.voteSub.unsubscribe();
    if (this.deleteSub) this.deleteSub.unsubscribe();
    if (this.newDiscussionSub) this.newDiscussionSub.unsubscribe();
  }

  // Load trips associated with the user
  loadUserTrips() {
    this.tripService.getTripById('').subscribe({ 
      next: (data) => {
        this.userTrips = Array.isArray(data) ? data : [data]; 
        
        if (this.userTrips.length > 0) {
          if (!this.selectedTripId) {
            this.selectedTripId = this.userTrips[0].id || this.userTrips[0].Id;
          }
          this.joinSignalRGroup();
          this.loadInitialData(); 
        }
      },
      error: (err) => console.error('Error loading user trips:', err)
    });
  }

  // Tell SignalR to join a specific trip group for real-time updates
  joinSignalRGroup() {
    if (this.selectedTripId) {
      this.signalrService.hubConnection.invoke('JoinTripGroup', this.selectedTripId)
        .then(() => console.log(`Joined group: ${this.selectedTripId}`))
        .catch(err => console.error('Error joining group:', err));
    }
  }

  // Refresh data when a user selects a different trip from the dropdown
  onTripChange() {
    console.log('Trip changed to:', this.selectedTripId);
    this.discussions = []; 
    this.joinSignalRGroup(); 
    this.loadInitialData(); 
  }

  // Fetch discussions for the currently selected trip
  loadInitialData() {
    if (!this.selectedTripId) return;

    this.discussionService.getDiscussionsByTrip(this.selectedTripId).subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.discussions = data;
          this.cdr.detectChanges();
        });
      },
      error: (err) => console.error('Error loading discussions:', err)
    });
  }

  // Prevent voting if a proposal is already confirmed or rejected
  isVotingDisabled(item: any): boolean {
    if (!item) return true;
    return !!(item.isConfirmed || item.isRejected);
  }

  // Listen for real-time events from SignalR (votes, deletions, new posts)
  setupSignalRListeners() {
    // When someone votes, update the specific discussion in the list
    this.voteSub = this.signalrService.voteUpdated.subscribe((updatedItem: any) => {
      this.zone.run(() => {
        const uId = updatedItem.id || updatedItem.Id;
        const index = this.discussions.findIndex(d => d.id === uId);
        if (index !== -1) {
          this.discussions[index].options = updatedItem.options || updatedItem.Options;
          this.discussions[index].userVotes = updatedItem.userVotes || updatedItem.UserVotes;
          this.discussions[index].memberLimit = updatedItem.memberLimit || updatedItem.MemberLimit;
          
          // Use nullish coalescing to safely check status
          this.discussions[index].isConfirmed = updatedItem.isConfirmed ?? updatedItem.IsConfirmed ?? false;
          this.discussions[index].isRejected  = updatedItem.isRejected  ?? updatedItem.IsRejected  ?? false;
          
          this.checkStatusAlerts(this.discussions[index]);
          this.cdr.detectChanges();
        }
      });
    });

    // When a discussion is deleted, remove it from the local list
    this.deleteSub = this.signalrService.discussionDeleted.subscribe((id: string) => {
      this.zone.run(() => {
        this.discussions = this.discussions.filter(d => d.id !== id);
        this.cdr.detectChanges();
      });
    });

    // When a new discussion is created, add it to the list if it belongs to this trip
    this.newDiscussionSub = this.signalrService.newDiscussion.subscribe((newItem: any) => {
      this.zone.run(() => {
        const nId = newItem.id || newItem.Id;
        const nTripId = newItem.tripId || newItem.TripId;

        if (nTripId === this.selectedTripId && !this.discussions.some(d => d.id === nId)) {
          this.discussions = [...this.discussions, newItem];
          this.cdr.detectChanges();
        }
      });
    });
  }

  // Show pop-up alerts based on the final voting results
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

  // Ask the creator if they want to delete a rejected proposal
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

  // Cast a vote for a specific option
  castVote(discussionId: string | undefined, optionText: string) {
    if (!discussionId) return;

    const item = this.discussions.find(d => d.id === discussionId);

    if (!item || this.isVotingDisabled(item)) {
      Swal.fire('Locked', 'Voting is already closed for this item.', 'info');
      return;
    }

    const currentVotes = item.userVotes?.length || 0;
    const limit = item.memberLimit || 1;

    const hasAlreadyVoted = item.userVotes?.some(
      (v: any) => (v.userId || v.UserId) === this.currentUser
    );

    // Only allow vote if slots are available OR user is changing their existing vote
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

  // Validate title: must have 3 letters, a vowel, and no long consonant strings
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

  // Submit a new discussion proposal to the service
  addNewTrip() {
    const title = this.newTrip.title.trim();
    if (!this.validateTitle(title)) {
      Swal.fire('Invalid Title', 'Please provide a meaningful title (at least 3 letters and 1 vowel).', 'warning');
      return;
    }

    this.tripService.getTripById(this.selectedTripId).subscribe({
      next: (actualTripData) => {
        const members = actualTripData.members || actualTripData.Members || [];
        const memberCount = members.length;

        // Calculate how many people need to vote
        const dynamicLimit = (actualTripData.createdBy || actualTripData.CreatedBy) 
                             ? memberCount + 1 
                             : (memberCount > 0 ? memberCount : 1);

        console.log('Calculated dynamic limit:', dynamicLimit);

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
          memberLimit: dynamicLimit, 
          tripId: this.selectedTripId 
        };

        this.discussionService.createDiscussion(item).subscribe({
          next: () => {
            this.resetForm();
            Swal.fire({ icon: 'success', title: 'Posted', showConfirmButton: false, timer: 1500 });
          },
          error: (err) => console.error('Creation error:', err)
        });
      },
      error: (err) => Swal.fire('Error', 'Could not verify trip members.', 'error')
    });
  }

  // Remove a discussion (only allowed for the creator)
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

  // UI Helpers: reset form, manage dynamic poll options, and calculate percentages
  resetForm() { this.newTrip = { title: '', description: '', type: 'Trip', customOptions: ['', ''] }; }
  addOptionField() { this.newTrip.customOptions.push(''); }
  removeOptionField(index: number) { if (this.newTrip.customOptions.length > 2) this.newTrip.customOptions.splice(index, 1); }
  trackByIndex(index: number) { return index; }
  
  getVotePercentage(item: any, index: number): number {
    if (!item || !item.options) return 0;
    const total = item.options.reduce((acc: number, curr: any) => acc + (curr.voteCount || 0), 0);
    return total === 0 ? 0 : Math.round(((item.options[index].voteCount || 0) / total) * 100);
  }

  // Navigation and alerts
  showNotReadyAlert() {
    Swal.fire({ title: 'Coming Soon!', text: 'This page is currently under development.', icon: 'info', confirmButtonColor: '#6e8efb' });
  }

  navigateToSummary() {
    if (this.selectedTripId) {
      this.router.navigate(['/trip-summary', this.selectedTripId]);
    } else {
      Swal.fire('Error', 'No trip selected to view summary.', 'error');
    }
  }
}