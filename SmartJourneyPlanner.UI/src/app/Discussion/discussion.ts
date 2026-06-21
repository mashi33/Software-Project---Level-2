import { Component, ViewEncapsulation, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { DiscussionService, DiscussionItem } from '../services/discussion.service';
import { SignalrService } from '../services/signalr.service';
import { TripService } from '../services/trip.service'; 
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs'; 
import Swal from 'sweetalert2';
import { CommentsComponent } from '../comments/comments';
import { VotePlacesService, VotePlacePrediction } from '../services/vote-places';
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

  // Places autocomplete state
  placeSuggestions: VotePlacePrediction[] = [];
  isPlaceValid: boolean = false;
  selectedPlaceId: string = '';
  showSuggestions: boolean = false;
  
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
    private votePlacesService: VotePlacesService,
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

  // Load trips associated with the user — filters by the logged-in user's email
  // so the trip dropdown only shows trips the user created or was invited to
  loadUserTrips() {
    const email = localStorage.getItem('email') ?? '';

    if (!email) {
      console.error('No user email found in localStorage — cannot load trips.');
      return;
    }

    this.tripService.getTripsByEmail(email).subscribe({ 
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

    this.discussionService.getDiscussionsByTrip(this.selectedTripId, this.currentUser).subscribe({
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
    if (item.type === 'Trip') {
      return !!(item.isConfirmed || item.isRejected);
    }
    return false; // Other type — no confirmed/rejected 
  }

  // ── NEW — finds the CURRENT logged-in user's own vote in the userVotes array.
  // Used by the template instead of userVotes?.[0], which always read the
  // first voter in the array regardless of who is actually viewing the page.
  getMyVote(item: any): string | null {
    if (!item?.userVotes) return null;
    const myVote = item.userVotes.find((v: any) => {
      const id = v.userId ?? v.UserId ?? '';
      return id.trim().toLowerCase() === this.currentUser.trim().toLowerCase();
    });
    return myVote ? myVote.optionText : null;
  }

  // Listen for real-time events from SignalR (votes, deletions, new posts)
  setupSignalRListeners() {
    // When someone votes, update the specific discussion in the list
    this.voteSub = this.signalrService.voteUpdated.subscribe((updatedItem: any) => {
      this.zone.run(() => {
        const uId = updatedItem.id || updatedItem.Id;
        const index = this.discussions.findIndex(d => d.id === uId);
        if (index !== -1) {
          // Replace entire item so all fields (userVotes, options, status) are always in sync
          this.discussions[index] = {
            ...this.discussions[index],
            options:     updatedItem.options     || updatedItem.Options     || this.discussions[index].options,
            userVotes:   updatedItem.userVotes   || updatedItem.UserVotes   || this.discussions[index].userVotes,
            votedUsers:  updatedItem.votedUsers  || updatedItem.VotedUsers  || this.discussions[index].votedUsers,
            memberLimit: updatedItem.memberLimit ?? updatedItem.MemberLimit ?? this.discussions[index].memberLimit,
            isConfirmed: updatedItem.isConfirmed ?? updatedItem.IsConfirmed ?? false,
            isRejected:  updatedItem.isRejected  ?? updatedItem.IsRejected  ?? false,
          };

          this.discussions = [...this.discussions];
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
    if (item.type !== 'Trip') return;
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
      } else if (!item.isConfirmed && !item.isRejected) {
        // Tie — all members voted but result is equal, votes remain editable
        Swal.fire({
          icon: 'info',
          title: "It's a Tie!",
          text: `"${item.title}" is tied. All members can change their vote to break it.`,
          timer: 3000
        });
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

    const limit = item.memberLimit || 1;

    // Normalize both sides to lowercase for safe comparison regardless of casing
    const hasAlreadyVoted = item.userVotes?.some(
      (v: any) => {
        const id = v.userId ?? v.UserId ?? v.user ?? v.User ?? '';
        return id.trim().toLowerCase() === this.currentUser.trim().toLowerCase();
      }
    );

    // Only block NEW voters when all slots are filled; existing voters can always change their vote
    if (!hasAlreadyVoted && (item.userVotes?.length || 0) >= limit) {
      Swal.fire('Limit Reached', 'All member slots are filled. Only existing voters can change their vote.', 'warning');
      return;
    }

    // userEmail is read separately from userName — userName stays the display
    // name shown in the UI, userEmail is only used by the backend to verify
    // this person is actually a member of the trip (security check).
    const userEmail = localStorage.getItem('email') ?? '';

    this.discussionService.vote(discussionId, optionText, this.currentUser, userEmail).subscribe({
      next: (updatedItem: any) => {
        console.log('Vote processed');
      },
      error: (err) => {
        console.error('Voting failed:', err);
        if (err.status === 403) {
          Swal.fire('Not Allowed', 'Only trip members can vote on this proposal.', 'error');
        } else if (err.status === 400) {
          Swal.fire('Info', err.error?.message || 'Voting is closed.', 'info');
        } else {
          Swal.fire('Error', 'Vote cast failed.', 'error');
        }
      }
    });
  }

  // ── FIXED: validate title — skip consonant check if Google Places selected
  // Google Places API already validated the place name, no need for consonant rules
  validateTitle(title: string): boolean {
    if (!title) return false;
    const t = title.trim();

    // If a valid place was selected from Google Places, skip all regex checks
    if (this.isPlaceValid) return true;

    if (t.length < 3 || t.length > 50) return false;
    const letterCount = (t.match(/[a-zA-Z]/g) || []).length;
    if (letterCount < 3) return false;
    const hasVowel = /[aeiouy]/i;
    if (!hasVowel.test(t)) return false;
    const excessiveConsonants = /[^aeiouy\s\d]{5,}/i; 
    if (excessiveConsonants.test(t)) return false;
    return true;
  }

  private searchTimeout: any = null;
  // Places autocomplete — when user types in the title for a Trip proposal, show place suggestions based on input
  onTitleInput() {
    const input = this.newTrip.title.trim();

    // validate title first — only search if it looks like a real place name, not just random text
    if (this.newTrip.type !== 'Trip' || input.length < 2) {
      this.placeSuggestions = [];
      this.showSuggestions = false;
      return;
    }

    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.votePlacesService.autocomplete(input).subscribe((suggestions: VotePlacePrediction[]) => {
        this.zone.run(() => {
          this.placeSuggestions = suggestions;
          this.showSuggestions = suggestions.length > 0;
          this.isPlaceValid = false;
          this.cdr.detectChanges();
        });
      });
    }, 350);
  }

  // when user clicks on a place suggestion, fill the title with the place name and store the place ID for validation on post
  selectPlace(prediction: VotePlacePrediction) {
    this.newTrip.title    = prediction.description;
    this.selectedPlaceId  = prediction.place_id;
    this.isPlaceValid     = true;
    this.showSuggestions  = false;
    this.placeSuggestions = [];
    this.votePlacesService.resetSession();
    this.cdr.detectChanges();
  }

  // ── FIXED: Post button enable/disable logic
  // Trip type: valid place must be selected from Google Places
  // Other type: only title validation needed, no place required
  isReadyToPost(): boolean {
    // Trip type — place selected via Google Places bypasses title consonant rules
    if (this.newTrip.type === 'Trip') {
      return this.isPlaceValid;
    }
    // Other type — normal title validation
    return this.validateTitle(this.newTrip.title);
  }

  // when user changes the proposal type (Trip vs Other), reset place-related state since only Trip type requires a valid place
  onTypeChange() {
    this.isPlaceValid     = false;
    this.selectedPlaceId  = '';
    this.placeSuggestions = [];
    this.showSuggestions  = false;
  }

  // ── FIXED: Submit — skip validateTitle() check for Trip type if place already validated
  addNewTrip() {
    const title = this.newTrip.title.trim();

    // For Other type, still validate the title normally
    if (this.newTrip.type !== 'Trip' && !this.validateTitle(title)) {
      Swal.fire('Invalid Title', 'Please provide a meaningful title (at least 3 letters and 1 vowel).', 'warning');
      return;
    }

    this.tripService.getTripById(this.selectedTripId).subscribe({
      next: (actualTripData) => {
        const members = actualTripData.members || actualTripData.Members || [];
        const memberCount = members.length;

        // memberCount = invited members, + 1 for creator (stored separately in CreatedBy)
        const dynamicLimit = memberCount + 1;

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
          tripId: this.selectedTripId,
          // NEW — place info so backend can push it into Trip.SavedPlaces once confirmed
          placeId: this.newTrip.type === 'Trip' ? this.selectedPlaceId : null,
          placeName: this.newTrip.type === 'Trip' ? title : null
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

  // NEW — returns discussions sorted by status priority: Pending first, then Confirmed, then Rejected.
  // Within each status group, newest first (by createdAt).
  // 'Other' type polls (no confirm/reject state) are treated as Pending.
  get sortedDiscussions(): DiscussionItem[] {
    const statusRank = (item: any): number => {
      if (item.type !== 'Trip') return 0;       // polls — treat like Pending
      if (!item.isConfirmed && !item.isRejected) return 0; // Pending
      if (item.isConfirmed) return 1;            // Confirmed
      return 2;                                  // Rejected
    };

    return [...this.discussions].sort((a: any, b: any) => {
      const rankDiff = statusRank(a) - statusRank(b);
      if (rankDiff !== 0) return rankDiff;
      // Same status group — newest first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  // UI Helpers: reset form, manage dynamic poll options, and calculate percentages
  resetForm() {
    this.newTrip = { title: '', description: '', type: 'Trip', customOptions: ['', ''] };
    this.isPlaceValid     = false;
    this.selectedPlaceId  = '';
    this.placeSuggestions = [];
    this.showSuggestions  = false;
  }

  addOptionField() { this.newTrip.customOptions.push(''); }
  removeOptionField(index: number) { if (this.newTrip.customOptions.length > 2) this.newTrip.customOptions.splice(index, 1); }
  trackByIndex(index: number) { return index; }
  
  getVotePercentage(item: any, index: number): number {
    if (!item || !item.options) return 0;
    const total = item.options.reduce((acc: number, curr: any) => acc + (curr.voteCount || 0), 0);
    return total === 0 ? 0 : Math.round(((item.options[index].voteCount || 0) / total) * 100);
  }

  // Navigate back to the traveller dashboard
  navigateToDashboard() {
    this.router.navigate(['/traveller-dashboard']);
  }

  navigateToSummary() {
    if (this.selectedTripId) {
      this.router.navigate(['/trip-summary', this.selectedTripId]);
    } else {
      Swal.fire('Error', 'No trip selected to view summary.', 'error');
    }
  }
}