import {Component,OnInit,HostListener,AfterViewInit,ChangeDetectorRef,ElementRef,ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import * as leaflet from 'leaflet';
import 'leaflet.markercluster';
import { forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { MemoryService } from '../services/memory';
import { TripMemory, MemoryComment } from '../models/memory.model';
import { AuthService } from '../services/auth.service';
import Swal from 'sweetalert2';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';

interface CommunityAlbum {
  tripName: string;
  memories: TripMemory[];
  latestImage: string;
  latestDate: string | Date;
  currentDisplayImage: string;
  slideIndex: number;
  slideshowInterval?: ReturnType<typeof setInterval> | null;
}

type PopularSortMode = 'score' | 'date' | 'likes' | 'location';

@Component({
  selector: 'app-community-map',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './community-map.html',
  styleUrl: './community-map.css'
})

export class CommunityMapComponent implements OnInit, AfterViewInit {
  private map!: leaflet.Map;
  private markersLayer = (leaflet as any).markerClusterGroup({
    iconCreateFunction: (cluster: any) => {
      const count = cluster.getChildCount();
      return leaflet.divIcon({
        html: `<div class="custom-cluster-icon"><span>${count}</span></div>`,
        className: 'my-cluster-wrapper',
        iconSize: leaflet.point(40, 40)
      });
    },
    zoomToBoundsOnClick: false,
    spiderfyOnMaxZoom: false,
    showCoverageOnHover: false,
    animate: true,
    animateAddingMarkers: false,
    maxClusterRadius: 70,
    spiderfyDistanceMultiplier: 1.6
  });

  private readonly sriLankaBounds = leaflet.latLngBounds(
    leaflet.latLng(5.9, 79.5),
    leaflet.latLng(9.9, 82.0)
  );

  searchQuery = '';
  allMemories: TripMemory[] = [];
  filteredMemories: TripMemory[] = [];
  groupedAlbums: CommunityAlbum[] = [];
  topRatedMemories: TripMemory[] = [];
  selectedMemory: TripMemory | null = null;
  selectedAlbum: CommunityAlbum | null = null;
  currentMemoryIndex = 0;
  isLightboxOpen = false;
  activeTab: 'popular' | 'albums' = 'popular';
  showAllAlbums = false;
  showAllTopRated = false;
  albumLikeInProgress = false;
  private searchSubject = new Subject<string>();
  private markerCache = new Map<string, leaflet.Marker>();
  shouldAnimateTopRated = false;
  isPopularReordering = false;
  popularEntranceComplete = false;
  sortMode: PopularSortMode = 'score';

  // Comments
  comments: MemoryComment[] = [];
  newCommentText = '';
  isLoadingComments = false;
  isSubmittingComment = false;

  // Fixed reference time for priority score calculation.
  // Set once on page load / data refresh. Prevents score drift when sorting.
  // Score is only recalculated for a memory when its likeCount changes.
  private priorityScoreBaseTime = Date.now();

  @ViewChild('popularGrid') popularGridRef?: ElementRef<HTMLElement>;

  constructor(
    private readonly memoryService: MemoryService,
    public readonly authService: AuthService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fixLeafletIcons();
    this.loadCommunityMemories();
    this.setupSearchDebounce();
  }

  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery = query;
      this.applyFilters();
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  // DATA LOADING 

  loadCommunityMemories(): void {
    this.memoryService.getPublicMemories().subscribe({
      next: (data) => {
        // Reset base time only on full data load / page refresh
        this.priorityScoreBaseTime = Date.now();

        this.allMemories = data
          .filter(m => m.visibility === 'public')
          .map(m => this.formatData(m))
          .slice(0, 500);

        // Compute initial priority scores once using the fixed base time
        this.allMemories.forEach(m => {
          (m as any).priorityScore = this.calculatePriorityScore(m, this.priorityScoreBaseTime);
        });

        this.applyFilters();
      },
      error: (err) => console.error('Failed to load community memories:', err)
    });
  }

  private formatData(raw: TripMemory | Record<string, unknown>): TripMemory {
    const memory = raw as Record<string, unknown>;
    return {
      id: (memory['id'] || memory['_id'] || memory['Id']) as string,
      title: (memory['title'] || memory['Title'] || 'Untitled') as string,
      imageUrl: (memory['imageUrl'] || memory['ImageUrl'] || '') as string,
      description: (memory['description'] || memory['Description'] || '') as string,
      latitude: Number(memory['latitude'] || memory['Latitude'] || 0),
      longitude: Number(memory['longitude'] || memory['Longitude'] || 0),
      locationName: (memory['locationName'] || memory['LocationName'] || 'Unknown Location') as string,
      startDate: memory['startDate'] as Date,
      endDate: memory['endDate'] as Date,
      visibility: (memory['visibility'] ?? memory['Visibility'] ?? 'private') as string,
      likeCount: Number(memory['likeCount'] || memory['LikeCount'] || 0),
      likedByUsers: (memory['likedByUsers'] || memory['LikedByUsers'] || []) as string[],
      commentCount: Number(memory['commentCount'] || memory['CommentCount'] || 0),
      tripId: (memory['tripId'] || memory['TripId']) as string | undefined,
      tripName: (memory['tripName'] || memory['TripName']) as string | undefined,
      userId: (memory['userId'] || memory['UserId'] || '') as string,
      fullName: (memory['fullName'] || memory['FullName']) as string | undefined,
      createdAt: (memory['createdAt'] || memory['CreatedAt']) as Date | undefined
    };
  }

  // FILTER & ALBUMS

  filterMemories(): void {
    this.searchSubject.next(this.searchQuery);
  }

  private applyFilters(options?: { flipFrom?: Map<string, DOMRect>; likedMemoryId?: string }): void {
    let memories = [...this.allMemories];

    if (this.searchQuery?.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      memories = memories.filter(m =>
        m.locationName?.toLowerCase().includes(query)
      );
    }

    // Do NOT recompute priority scores here.
    // Scores are computed on load and only updated when likeCount changes.

    this.filteredMemories = this.sortMemories(memories, this.sortMode);
    this.topRatedMemories = this.getTopRatedMemories(this.filteredMemories, 10);
    this.groupMemoriesByTrip(this.filteredMemories);
    this.refreshMapMarkers(this.filteredMemories);

    if (options?.flipFrom?.size) {
      this.cdr.detectChanges();
      requestAnimationFrame(() => this.playGSAPFlipAnimation(options.flipFrom!, options.likedMemoryId));
    } else if (!this.shouldAnimateTopRated) {
      this.shouldAnimateTopRated = true;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.playGSAPStaggeredEntrance();
      }, 100);
    }
  }

  setSortMode(mode: PopularSortMode): void {
    if (this.sortMode === mode || this.isPopularReordering) return;
    const flipFrom = this.capturePopularCardRects();
    this.sortMode = mode;
    this.applyFilters({ flipFrom });
  }

  trackByMemoryId(_index: number, memory: TripMemory): string {
    return memory.id || String(_index);
  }

  private sortMemories(memories: TripMemory[], mode: PopularSortMode): TripMemory[] {
    const sorted = [...memories];

    switch (mode) {
      case 'likes':
        return sorted.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
      case 'date':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.startDate || a.createdAt || 0).getTime();
          const dateB = new Date(b.startDate || b.createdAt || 0).getTime();
          return dateB - dateA;
        });
      case 'location':
        return sorted.sort((a, b) =>
          (a.locationName || '').localeCompare(b.locationName || '', undefined, { sensitivity: 'base' })
        );
      case 'score':
      default:
        return this.sortMemoriesByLikesAndDate(sorted);
    }
  }

  private capturePopularCardRects(): Map<string, DOMRect> {
    const rects = new Map<string, DOMRect>();
    const grid = this.popularGridRef?.nativeElement
      ?? document.querySelector<HTMLElement>('.top-rated-section .popular-memory-grid');
    if (!grid) return rects;

    grid.querySelectorAll<HTMLElement>('.thumb-card[data-memory-id]').forEach(card => {
      const id = card.dataset['memoryId'];
      if (id) rects.set(id, card.getBoundingClientRect());
    });

    return rects;
  }

  private playGSAPStaggeredEntrance(): void {
    const grid = this.popularGridRef?.nativeElement
      ?? document.querySelector<HTMLElement>('.top-rated-section .popular-memory-grid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll<HTMLElement>('.thumb-card'));
    if (!cards.length) return;

    // Set initial state for entrance animation
    gsap.set(cards, {
      opacity: 0,
      y: 50,
      scale: 0.9
    });

    // Staggered entrance animation
    gsap.to(cards, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.6,
      stagger: 0.1,
      ease: 'back.out(1.7)',
      onComplete: () => {
        this.popularEntranceComplete = true;
        this.cdr.detectChanges();
      }
    });
  }

  private playGSAPFlipAnimation(beforeRects: Map<string, DOMRect>, likedMemoryId?: string): void {
    const grid = this.popularGridRef?.nativeElement
      ?? document.querySelector<HTMLElement>('.top-rated-section .popular-memory-grid');
    if (!grid || !beforeRects.size) return;

    const cards = Array.from(
      grid.querySelectorAll<HTMLElement>('.thumb-card[data-memory-id]')
    );
    if (!cards.length) return;

    this.isPopularReordering = true;
    grid.classList.add('is-reordering');

    // Calculate movements and organize by direction
    const movements: Array<{ element: HTMLElement; deltaY: number; distance: number; direction: 'up' | 'down' }> = [];

    cards.forEach(card => {
      const id = card.dataset['memoryId'];
      if (!id) return;

      const before = beforeRects.get(id);
      if (!before) return;

      const after = card.getBoundingClientRect();
      const deltaY = before.top - after.top;
      if (Math.abs(deltaY) < 2) return;

      movements.push({
        element: card,
        deltaY,
        distance: Math.abs(deltaY),
        direction: deltaY > 0 ? 'up' : 'down'
      });
    });

    // Find the liked box and calculate cascading timing
    const likedMovement = movements.find(m => m.element.dataset['memoryId'] === likedMemoryId);
    const otherMovements = movements.filter(m => m.element.dataset['memoryId'] !== likedMemoryId);

    // Sort other movements by their position relative to liked box
    otherMovements.sort((a, b) => {
      // Sort by distance from liked box's starting position
      const likedStartY = likedMovement?.deltaY || 0;
      const aDistanceFromLiked = Math.abs(a.deltaY - likedStartY);
      const bDistanceFromLiked = Math.abs(b.deltaY - likedStartY);
      return aDistanceFromLiked - bDistanceFromLiked;
    });

    // Create GSAP timeline for cascading animation
    const timeline = gsap.timeline({
      onComplete: () => {
        grid.classList.remove('is-reordering');
        this.isPopularReordering = false;
        this.cdr.detectChanges();
      }
    });

    // Start with liked box if it exists
    if (likedMovement) {
      const { element, deltaY, direction } = likedMovement;

      gsap.set(element, {
        y: deltaY,
        scale: 1.05,
        zIndex: 1000,
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        border: '3px solid rgba(99, 102, 241, 0.6)'
      });

      timeline.to(element, {
        y: 0,
        scale: 1,
        duration: 0.8,
        ease: 'power2.inOut',
        boxShadow: '0 0 0 rgba(0,0,0,0)',
        border: '0px solid rgba(99, 102, 241, 0)',
        zIndex: 1,
        onComplete: () => {
          gsap.set(element, { clearProps: 'all' });
        }
      }, 0);
    }

    // Add other movements with cascading timing based on when liked box crosses their positions
    otherMovements.forEach((movement, index) => {
      const { element, deltaY, direction } = movement;

      // Calculate when this box should start based on liked box's progress
      const likedDistance = likedMovement?.distance || 1;
      const thisDistance = movement.distance;
      const progressRatio = thisDistance / (likedDistance + thisDistance);
      const startTime = likedMovement ? (progressRatio * 0.6) : (index * 0.2);

      const zIndex = direction === 'up' ? 100 + index : 50 + index;
      gsap.set(element, {
        y: deltaY,
        scale: 1.02,
        zIndex: zIndex,
        boxShadow: direction === 'up' ? '0 12px 24px rgba(0,0,0,0.25)' : '0 6px 16px rgba(0,0,0,0.15)',
        border: direction === 'up' ? '2px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(99, 102, 241, 0.2)'
      });

      timeline.to(element, {
        y: 0,
        scale: 1,
        duration: 0.6,
        ease: 'power2.inOut',
        boxShadow: '0 0 0 rgba(0,0,0,0)',
        border: '0px solid rgba(99, 102, 241, 0)',
        zIndex: 1,
        onComplete: () => {
          gsap.set(element, { clearProps: 'all' });
        }
      }, startTime);
    });
  }

  // SweetAlert Helper
  private showSweetAlert(message: string, type: 'like' | 'unlike' | 'album_like' | 'album_unlike' = 'like') {
    const config: any = {
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
      customClass: {
        popup: 'swal-custom-toast',
        title: 'swal-custom-title'
      }
    };

    switch (type) {
      case 'like':
        config.icon = 'success';
        config.title = `<div class="swal-like-content"><i class="bi bi-heart-fill"></i> ${message}</div>`;
        config.background = '#fff1f2';
        config.color = '#be123c';
        break;
      case 'unlike':
        config.icon = 'info';
        config.title = `<div class="swal-unlike-content"><i class="bi bi-heart"></i> ${message}</div>`;
        config.background = '#f1f5f9';
        config.color = '#64748b';
        break;
      case 'album_like':
        config.icon = 'success';
        config.title = `<div class="swal-album-like-content"><i class="bi bi-images"></i> ${message}</div>`;
        config.background = '#eff6ff';
        config.color = '#2563eb';
        break;
      case 'album_unlike':
        config.icon = 'info';
        config.title = `<div class="swal-album-unlike-content"><i class="bi bi-images"></i> ${message}</div>`;
        config.background = '#f1f5f9';
        config.color = '#64748b';
        break;
    }
    (Swal as any).fire(config);
  }

  private sortMemoriesByLikesAndDate(memories: TripMemory[]): TripMemory[] {
    // Use the pre-computed / locked priorityScore (only changes on like or page load)
    return [...memories].sort((a, b) => {
      const scoreA = (a as any).priorityScore ?? 0;
      const scoreB = (b as any).priorityScore ?? 0;
      return scoreB - scoreA;
    });
  }

  private calculatePriorityScore(memory: TripMemory, now: number = Date.now()): number {
    const date = memory.startDate ? new Date(memory.startDate).getTime() : 
                 memory.createdAt ? new Date(memory.createdAt).getTime() : now;
    const ageInHours = Math.max(0.1, (now - date) / (1000 * 60 * 60));
    
    // Priority algorithm: (likes * 1.5 + 1) / (age_in_hours + 2) * 100
    // This gives higher priority to memories with more likes and newer uploads
    const likeWeight = 1.5;
    const recencyWeight = 1.0;
    
    const score = ((memory.likeCount || 0) * likeWeight + 1) / (ageInHours * recencyWeight + 2) * 100;
    return score;
  }

  private getTopRatedMemories(memories: TripMemory[], count: number = 10): TripMemory[] {
    return memories.slice(0, count);
  }

  private groupMemoriesByTrip(memories: TripMemory[]): void {
    const groups = new Map<string, CommunityAlbum>();

    memories.forEach(memory => {
      const tripId = memory.tripId || memory.id || 'no-trip';
      const tripName = memory.tripName || memory.title || 'Unknown Trip';
      const memoryDate = memory.startDate || memory.endDate || memory.createdAt;

      if (!groups.has(tripId)) {
        groups.set(tripId, {
          tripName,
          memories: [],
          latestImage: memory.imageUrl,
          latestDate: memoryDate,
          currentDisplayImage: memory.imageUrl,
          slideIndex: 0
        });
      }

      const album = groups.get(tripId)!;
      album.memories.push(memory);
      const albumDate = new Date(album.latestDate);
      const currentDate = new Date(memoryDate);

      if (currentDate > albumDate) {
        album.latestImage = memory.imageUrl;
        album.latestDate = memoryDate;
        album.currentDisplayImage = memory.imageUrl;
      }
    });

    this.groupedAlbums = Array.from(groups.values()).sort((a, b) => {
      const likesA = this.getTotalLikes(a);
      const likesB = this.getTotalLikes(b);
      return likesB - likesA;
    });
  }

  get displayedAlbums(): CommunityAlbum[] {
    return this.showAllAlbums ? this.groupedAlbums : this.groupedAlbums.slice(0, 3);
  }

  get displayedTopRatedMemories(): TripMemory[] {
    return this.showAllTopRated ? this.topRatedMemories : this.topRatedMemories.slice(0, 3);
  }

  toggleTopRatedSeeMore(): void {
    this.showAllTopRated = !this.showAllTopRated;
  }

  setActiveTab(tab: 'popular' | 'albums'): void {
    this.activeTab = tab;
  }

  toggleSeeMore(): void {
    this.showAllAlbums = !this.showAllAlbums;
  }

  trackByFn(index: number, item: CommunityAlbum): string | number {
    return item.tripName || index;
  }

  //  LIKES

  hasUserLiked(memory: TripMemory): boolean {
    const userName = this.authService.getUserName();
    if (!userName || !memory.likedByUsers) return false;
    return memory.likedByUsers.includes(userName);
  }

  isAlbumFullyLiked(album: CommunityAlbum): boolean {
    return album.memories.length > 0 && album.memories.every(m => this.hasUserLiked(m));
  }

  toggleLike(memoryId: string | undefined, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();

    if (!memoryId || this.isPopularReordering) return;
    const currentUserId = this.authService.getUserId();
    const currentUserName = this.authService.getUserName();
    if (!currentUserId) return;
    const memory = this.allMemories.find(m => m.id === memoryId);
    const isLiked = memory ? this.hasUserLiked(memory) : false;
    const flipFrom = this.capturePopularCardRects();

    this.memoryService.toggleLike(memoryId, currentUserId, currentUserName || '').subscribe({
      next: (updatedMemory) => {
        this.updateLocalMemoryState(memoryId, updatedMemory);
        this.applyFilters({ flipFrom, likedMemoryId: memoryId });
        const newLikeCount = updatedMemory.likeCount || 0;
        const action = isLiked ? 'unlike' : 'like';
        const message = isLiked
          ? `Removed like! (${newLikeCount} likes)`
          : `Liked! (${newLikeCount} likes)`;

        this.showSweetAlert(message, action);
      },

      error: (err) => console.error('Failed to toggle like:', err)
    });
  }

  toggleAlbumLike(album: CommunityAlbum, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();

    const currentUserId = this.authService.getUserId();
    const currentUserName = this.authService.getUserName();
    if (!currentUserId || this.albumLikeInProgress || this.isPopularReordering) return;
    const allLiked = this.isAlbumFullyLiked(album);
    const targets = album.memories.filter(m =>
      m.id && (allLiked ? this.hasUserLiked(m) : !this.hasUserLiked(m))
    );

    if (!targets.length) return;
    this.albumLikeInProgress = true;
    const flipFrom = this.capturePopularCardRects();
    const requests = targets.map(m => this.memoryService.toggleLike(m.id!, currentUserId, currentUserName || ''));

    forkJoin(requests).subscribe({
      next: (updatedMemories) => {
        updatedMemories.forEach(m => {
          if (m.id) this.updateLocalMemoryState(m.id, m);
        });
        this.applyFilters({ flipFrom });
        this.albumLikeInProgress = false;
        const totalLikes = this.getTotalLikes(album);
        const action = allLiked ? 'album_unlike' : 'album_like';
        const message = allLiked
          ? `Removed likes from ${targets.length} memories! (${totalLikes} total)`
          : `Liked ${targets.length} memories! (${totalLikes} total)`;

        this.showSweetAlert(message, action);
        this.cdr.detectChanges();
      },

      error: (err) => {
        console.error('Failed to toggle album likes:', err);
        this.albumLikeInProgress = false;
      }
    });
  }

  private updateLocalMemoryState(memoryId: string, updatedMemory: TripMemory): void {
    const updateInList = (list: TripMemory[]) => {
      const idx = list.findIndex(m => m.id === memoryId);
      if (idx !== -1) {
        // Merge updated fields (including new likeCount)
        list[idx] = { ...list[idx], ...updatedMemory };

        // Recalculate priority score ONLY because likeCount changed.
        // Uses the same fixed base time so only likes affect the score value.
        (list[idx] as any).priorityScore = this.calculatePriorityScore(
          list[idx],
          this.priorityScoreBaseTime
        );
      }
    };

    updateInList(this.allMemories);
    updateInList(this.filteredMemories);
    this.groupMemoriesByTrip(this.filteredMemories);

    if (this.selectedAlbum) {
      const refreshed = this.groupedAlbums.find(a => a.tripName === this.selectedAlbum!.tripName);
      if (refreshed) {
        this.selectedAlbum = refreshed;
        this.selectedMemory = refreshed.memories[this.currentMemoryIndex] || null;
      }
    } else if (this.selectedMemory && this.selectedMemory.id === memoryId) {
      this.selectedMemory = { ...this.selectedMemory, ...updatedMemory };
      // Keep selectedMemory score in sync as well
      (this.selectedMemory as any).priorityScore = this.calculatePriorityScore(
        this.selectedMemory,
        this.priorityScoreBaseTime
      );
    }

    this.refreshMapMarkers(this.filteredMemories);
  }

  getTotalLikes(album: CommunityAlbum): number {
    return album.memories.reduce((sum, m) => sum + (m.likeCount || 0), 0);
  }

  // Returns the locked / pre-computed priorityScore
  getPriorityScore(memory: TripMemory): number {
    return (memory as any).priorityScore ?? this.calculatePriorityScore(memory, this.priorityScoreBaseTime);
  }

  openTopRatedMemory(memory: TripMemory): void {
    this.openLightboxForMemory(memory);
  }

  // LIGHTBOX 

  openAlbum(album: CommunityAlbum): void {
    this.selectedAlbum = album;
    this.currentMemoryIndex = 0;
    this.selectedMemory = album.memories[0] || null;
    this.isLightboxOpen = true;
    if (this.selectedMemory?.id) {
      this.loadComments(this.selectedMemory.id);
    }
  }

  openLightboxForMemory(memory: TripMemory, album?: CommunityAlbum): void {
    if (!memory) return;
    if (album) {
      this.selectedAlbum = album;
      this.currentMemoryIndex = album.memories.findIndex(m => m.id === memory.id);
      if (this.currentMemoryIndex < 0) this.currentMemoryIndex = 0;
    } else {
      // Map pin or Popular memory, do not connect album, just show the single memory
      this.selectedAlbum = null;
      this.currentMemoryIndex = 0;
    }

    this.selectedMemory = memory;
    this.isLightboxOpen = true;
    this.cdr.detectChanges();

    if (memory.id) {
      this.loadComments(memory.id);
    }
  }

  nextMemory(): void {
    if (!this.selectedAlbum) return;
    this.currentMemoryIndex = (this.currentMemoryIndex + 1) % this.selectedAlbum.memories.length;
    this.selectedMemory = this.selectedAlbum.memories[this.currentMemoryIndex];
    if (this.selectedMemory?.id) {
      this.loadComments(this.selectedMemory.id);
    }
  }

  prevMemory(): void {
    if (!this.selectedAlbum) return;
    this.currentMemoryIndex =
      (this.currentMemoryIndex - 1 + this.selectedAlbum.memories.length) %
      this.selectedAlbum.memories.length;
    this.selectedMemory = this.selectedAlbum.memories[this.currentMemoryIndex];
    if (this.selectedMemory?.id) {
      this.loadComments(this.selectedMemory.id);
    }
  }

  closeLightbox(): void {
    this.isLightboxOpen = false;
    this.selectedAlbum = null;
    this.selectedMemory = null;
    this.comments = [];
    this.newCommentText = '';
  }

  // COMMENTS

  get isLoggedIn(): boolean {
    return !!this.authService.getUserId();
  }

  loadComments(memoryId: string): void {
    this.isLoadingComments = true;
    this.comments = [];
    this.memoryService.getComments(memoryId).subscribe({
      next: (data) => {
        this.comments = data;
        this.isLoadingComments = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load comments:', err);
        this.isLoadingComments = false;
      }
    });
  }

  submitComment(): void {
    if (!this.selectedMemory?.id || !this.newCommentText.trim() || this.isSubmittingComment) return;

    const currentUserId = this.authService.getUserId();
    const currentUserName = this.authService.getUserName();
    if (!currentUserId) return;

    this.isSubmittingComment = true;
    this.memoryService.addComment(
      this.selectedMemory.id,
      currentUserId,
      currentUserName || '',
      this.newCommentText.trim()
    ).subscribe({
      next: (comment) => {
        this.comments.unshift(comment);
        this.newCommentText = '';
        this.isSubmittingComment = false;

        // Update local commentCount
        if (this.selectedMemory) {
          this.selectedMemory.commentCount = (this.selectedMemory.commentCount || 0) + 1;
        }
        const mem = this.allMemories.find(m => m.id === this.selectedMemory?.id);
        if (mem) {
          mem.commentCount = (mem.commentCount || 0) + 1;
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to add comment:', err);
        this.isSubmittingComment = false;
      }
    });
  }

  deleteComment(comment: MemoryComment): void {
    if (!comment.id) return;
    const currentUserId = this.authService.getUserId();
    if (!currentUserId || comment.userId !== currentUserId) return;

    this.memoryService.deleteComment(comment.id, currentUserId).subscribe({
      next: () => {
        this.comments = this.comments.filter(c => c.id !== comment.id);

        if (this.selectedMemory) {
          this.selectedMemory.commentCount = Math.max(0, (this.selectedMemory.commentCount || 0) - 1);
        }
        const mem = this.allMemories.find(m => m.id === this.selectedMemory?.id);
        if (mem) {
          mem.commentCount = Math.max(0, (mem.commentCount || 0) - 1);
        }

        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to delete comment:', err)
    });
  }

  canDeleteComment(comment: MemoryComment): boolean {
    const currentUserId = this.authService.getUserId();
    return !!currentUserId && comment.userId === currentUserId;
  }

  //  SLIDESHOW 

  startSlideshow(album: CommunityAlbum): void {
    if (album.memories.length <= 1) return;
    album.slideIndex = 0;
    album.currentDisplayImage = album.memories[0].imageUrl;
    album.slideshowInterval = setInterval(() => {
      album.slideIndex = (album.slideIndex + 1) % album.memories.length;
      album.currentDisplayImage = album.memories[album.slideIndex].imageUrl;
    }, 2000);
  }

  stopSlideshow(album: CommunityAlbum): void {
    if (album.slideshowInterval) {
      clearInterval(album.slideshowInterval);
      album.slideshowInterval = null;
    }
    album.currentDisplayImage = album.memories[0]?.imageUrl || album.latestImage;
  }

  // DATE HELPERS 

  getOldestCreatedAt(album: CommunityAlbum): Date | null {
    if (!album.memories?.length) return null;
    const dates = album.memories
      .map(m => new Date(m.createdAt || m.startDate || m.endDate))
      .filter(d => !isNaN(d.getTime()));
    return dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
  }

  getNewestCreatedAt(album: CommunityAlbum): Date | null {
    if (!album.memories?.length) return null;
    const dates = album.memories
      .map(m => new Date(m.createdAt || m.startDate || m.endDate))
      .filter(d => !isNaN(d.getTime()));

    return dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;
  }

  // MAP

  private refreshMapMarkers(memories: TripMemory[]): void {
    if (!this.map) return;

    const currentMemoryIds = new Set(memories.map(m => m.id));
    const cachedIds = new Set(this.markerCache.keys());

    // Remove markers for memories no longer in filtered list
    cachedIds.forEach(id => {
      if (!currentMemoryIds.has(id)) {
        const marker = this.markerCache.get(id);
        if (marker) {
          this.markersLayer.removeLayer(marker);
          this.markerCache.delete(id);
        }
      }
    });

    // Add or update markers for current memories
    memories.forEach(memory => {
      if (!memory.latitude || !memory.longitude || !memory.id) return;

      if (this.markerCache.has(memory.id)) {
        // Marker exists, update popup if needed
        const marker = this.markerCache.get(memory.id)!;
        const popupHtml = this.getPopupHtml(memory);
        marker.setPopupContent(popupHtml);
      } else {
        const pinHtml = `
          <div class="vignette-pin-container" style="--pin-color: #6366f1">
            <div class="vignette-image-holder">
              <img src="${memory.imageUrl || 'assets/placeholder-image.jpg'}" alt="${this.escapeHtml(memory.title)}" />
            </div>
            <div class="vignette-pin-tail"></div>
            <div class="vignette-location-badge">${this.escapeHtml(memory.title || 'Untitled')}</div>
          </div>
        `;

        const customIcon = leaflet.divIcon({
          html: pinHtml,
          className: 'vignette-map-pin-wrapper', 
          iconSize: leaflet.point(52, 64),       
          iconAnchor: [26, 64],                  
          popupAnchor: [0, -68]                  
        });

        // Create new marker with custom 3D icon
        const marker = leaflet.marker([memory.latitude, memory.longitude], { icon: customIcon });
        const popupHtml = this.getPopupHtml(memory);
        marker.bindPopup(popupHtml, {
          maxWidth: 320,
          minWidth: 280,
          className: 'memory-popup-wrapper'
        })
        .on('popupopen', (e: any) => {
          const popupEl = e.popup.getElement();
          if (popupEl) this.attachPopupListeners(popupEl, memory);
        });

        this.markersLayer.addLayer(marker);
        this.markerCache.set(memory.id, marker);
      }
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
  }

  private getPopupHtml(memory: TripMemory): string {
    const title = this.escapeHtml(memory.title || 'Untitled');
    const location = this.escapeHtml(memory.locationName || 'Unknown');
    const imageUrl = this.escapeHtml(memory.imageUrl || '');
    const id = this.escapeHtml(String(memory.id));
    const tripName = this.escapeHtml(memory.tripName || 'Unknown Trip');
    const liked = this.hasUserLiked(memory);
    const visibility = memory.visibility === 'public' ? 'Public' : memory.visibility === 'tripMembers' ? 'Only for trip members' : 'Private';
    const visibilityClass = memory.visibility === 'public' ? 'public' : memory.visibility === 'tripMembers' ? 'trip-members' : 'private';

    return `

      <div class="map-popup" data-memory-id="${id}">
        <div class="popup-image-outer">
          <div class="popup-image-wrap view-big-image" data-memory-id="${id}" title="Click to view full size">
            <img src="${imageUrl}" alt="${title}" class="popup-image" />
            <div class="popup-image-overlay">
              <span class="popup-zoom-hint">View full size</span>
            </div>
          </div>
        </div>

        <div class="popup-body">
          <div class="popup-header">
            <h6 class="popup-title">${title}</h6>
            <span class="popup-visibility ${visibilityClass}">${visibility}</span>
          </div>

          <span class="popup-trip-badge">${tripName}</span>

          <p class="popup-location">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
            </svg>
            <span>${location}</span>
          </p>

          <div class="popup-likes">
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                 <path fill="#be123c" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span class="like-num">${memory.likeCount || 0}</span>
          </div>

          <div class="popup-actions">
            <button type="button" class="popup-btn popup-btn-view view-big-image" data-memory-id="${id}">
              Open details
            </button>
            <button type="button" class="popup-btn popup-btn-like popup-like-btn ${liked ? 'liked' : ''}" data-memory-id="${id}">
              ${liked ? 'Liked' : 'Like'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private attachPopupListeners(popupEl: HTMLElement, memory: TripMemory): void {
    const openDetail = () => {
      window.dispatchEvent(new CustomEvent('viewBig', { detail: memory.id }));
    };

    popupEl.querySelectorAll('.view-big-image').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openDetail();
      });
    });

    popupEl.querySelector('.popup-like-btn')?.addEventListener('click', (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      if (memory.id) {
        this.toggleLike(memory.id, e); 
        this.map.closePopup();
      }
    });
  }

  private initMap(): void {
    this.map = leaflet.map('map', {
      center: [7.8731, 80.7718],
      zoom: 8,
      minZoom: 8,
      maxBounds: this.sriLankaBounds,
      maxBoundsViscosity: 1.0
    });

    leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);

    this.markersLayer.addTo(this.map);
    this.refreshMapMarkers(this.filteredMemories);

    this.markersLayer.on('clusterclick', (e: any) => {
      const cluster = e.layer;
      if (!cluster) return;

      // Unspiderfy if already expanded
      if ((cluster as any)._spiderfied) {
        cluster.unspiderfy();
        return;
      }

      // Close any other open spiderfied clusters
      try { 
        this.markersLayer.unspiderfy(); 
      } catch {}

      const childMarkers = cluster.getAllChildMarkers();
      if (!childMarkers.length) return;

      const latLngs = childMarkers.map((m: any) => m.getLatLng());
      const first = latLngs[0];

      // Check if ALL child markers share the exact same coordinates
      const allSameLocation = latLngs.every((ll: any) =>
        Math.abs(ll.lat - first.lat) < 0.00001 &&
        Math.abs(ll.lng - first.lng) < 0.00001
      );

      // Stop any active map movements
      this.map.stop();

      if (allSameLocation) {
        // EXACT SAME LOCATION: NO flying/zooming at all.
        // Directly spiderfy on the spot without map movement or visual shaking.
        if (cluster.getChildCount() > 1 && !(cluster as any)._spiderfied) {
          cluster.spiderfy();
        }
      } else {
        // DIFFERENT / NEARBY LOCATIONS: Perform flight/zoom to bounds
        const bounds = cluster.getBounds().pad(0.15);
        const currentZoom = this.map.getZoom();
        const targetZoom = Math.min(17, this.map.getBoundsZoom(bounds, false, leaflet.point(50, 50)));

        const needsZoom =
          currentZoom < targetZoom - 0.5 ||
          !this.map.getBounds().contains(bounds);

        if (needsZoom) {
          this.map.flyToBounds(bounds, {
            padding: [50, 50],
            maxZoom: 17,
            duration: 1.2,
            easeLinearity: 0.25
          });

          this.map.once('moveend', () => {
            // Wait for map movement and CSS transitions to settle before spiderfying
            setTimeout(() => {
              const activeCluster = this.markersLayer.getVisibleParent(childMarkers[0]) || cluster;
              if (activeCluster && typeof activeCluster.spiderfy === 'function' && !(activeCluster as any)._spiderfied) {
                activeCluster.spiderfy();
              }
            }, 180);
          });
        } else {
          // Already zoomed in close enough -> spiderfy immediately
          if (cluster.getChildCount() > 1 && !(cluster as any)._spiderfied) {
            cluster.spiderfy();
          }
        }
      }
    });
  }

  private fixLeafletIcons(): void {
    const iconDefault = leaflet.icon({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    leaflet.Marker.prototype.options.icon = iconDefault;
  }

  goBack(): void {
    this.router.navigate(['/memories-welcome']);
  }

  onEnterPress(event: Event): void {
  const keyboardEvent = event as KeyboardEvent;

  // Shift + Enter 
  if (keyboardEvent.shiftKey) {
    return;
  }

  // submit comment for Enter keypress 
  keyboardEvent.preventDefault();

  // if has Comment and now not Posting, Submit 
  if (this.newCommentText.trim() && !this.isSubmittingComment) {
    this.submitComment();
  }
}

  @HostListener('window:viewBig', ['$event'])
  onViewBig(event: Event): void {
    const memoryId = (event as CustomEvent<string>).detail;
    const foundMemory = this.filteredMemories.find(m => m.id === memoryId);
    if (foundMemory) {
      // Close popup first
      if (this.map) {
        this.map.closePopup();
      }
      this.openLightboxForMemory(foundMemory);
    }
  }
}