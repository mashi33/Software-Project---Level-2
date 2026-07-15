import {Component,OnInit,HostListener,AfterViewInit,ChangeDetectorRef} from '@angular/core';
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
import { TripMemory } from '../models/memory.model';
import { AuthService } from '../services/auth.service';
import Swal from 'sweetalert2';

interface CommunityAlbum {
  tripName: string;
  memories: TripMemory[];
  latestImage: string;
  latestDate: string | Date;
  currentDisplayImage: string;
  slideIndex: number;
  slideshowInterval?: ReturnType<typeof setInterval> | null;
}

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
    }
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

  constructor(
    private readonly memoryService: MemoryService,
    private readonly authService: AuthService,
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
        this.allMemories = data
          .filter(m => m.isPublic)
          .map(m => this.formatData(m))
          .slice(0, 500);
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
      isPublic: Boolean(memory['isPublic'] ?? memory['IsPublic'] ?? false),
      likeCount: Number(memory['likeCount'] || memory['LikeCount'] || 0),
      likedByUsers: (memory['likedByUsers'] || memory['LikedByUsers'] || []) as string[],
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

  private applyFilters(): void {
    let memories = [...this.allMemories];

    if (this.searchQuery?.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      memories = memories.filter(m =>
        m.locationName?.toLowerCase().includes(query)
      );
    }

    this.filteredMemories = this.sortMemoriesByLikesAndDate(memories);
    this.topRatedMemories = this.getTopRatedMemories(this.filteredMemories, 10);
    this.groupMemoriesByTrip(this.filteredMemories);
    this.refreshMapMarkers(this.filteredMemories);
    //this.cdr.detectChanges();
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
    const now = Date.now();

    return [...memories].sort((a, b) => {
      const scoreA = this.calculatePriorityScore(a, now);
      const scoreB = this.calculatePriorityScore(b, now);
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
    const sorted = this.sortMemoriesByLikesAndDate(memories);
    return sorted.slice(0, count);
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

    if (!memoryId) return;
    const currentUserId = this.authService.getUserId();
    const currentUserName = this.authService.getUserName();
    if (!currentUserId) return;
    const memory = this.allMemories.find(m => m.id === memoryId);
    const isLiked = memory ? this.hasUserLiked(memory) : false;
    this.memoryService.toggleLike(memoryId, currentUserId, currentUserName || '').subscribe({

      next: (updatedMemory) => {
        this.updateLocalMemoryState(memoryId, updatedMemory);
        this.applyFilters();
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
    if (!currentUserId || this.albumLikeInProgress) return;
    const allLiked = this.isAlbumFullyLiked(album);
    const targets = album.memories.filter(m =>
      m.id && (allLiked ? this.hasUserLiked(m) : !this.hasUserLiked(m))
    );

    if (!targets.length) return;
    this.albumLikeInProgress = true;
    const requests = targets.map(m => this.memoryService.toggleLike(m.id!, currentUserId, currentUserName || ''));

    forkJoin(requests).subscribe({
      next: (updatedMemories) => {
        updatedMemories.forEach(m => {
          if (m.id) this.updateLocalMemoryState(m.id, m);
        });
        this.applyFilters();
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
        list[idx] = { ...list[idx], ...updatedMemory };
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
    } else if (this.selectedMemory?.id === memoryId) {
      this.selectedMemory = { ...this.selectedMemory, ...updatedMemory };
    }

    this.refreshMapMarkers(this.filteredMemories);
    //this.cdr.detectChanges();
  }

  getTotalLikes(album: CommunityAlbum): number {
    return album.memories.reduce((sum, m) => sum + (m.likeCount || 0), 0);
  }

  getPriorityScore(memory: TripMemory): number {
    return this.calculatePriorityScore(memory);
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
  }

  openLightboxForMemory(memory: TripMemory, album?: CommunityAlbum): void {
    if (!memory) return;
    if (album) {
      this.selectedAlbum = album;
      this.currentMemoryIndex = album.memories.findIndex(m => m.id === memory.id);
      if (this.currentMemoryIndex < 0) this.currentMemoryIndex = 0;
    } else {
      const matchingAlbum = this.groupedAlbums.find(a =>
        a.memories.some(m => m.id === memory.id)
      );
      this.selectedAlbum = matchingAlbum || null;
      this.currentMemoryIndex = matchingAlbum
        ? matchingAlbum.memories.findIndex(m => m.id === memory.id)
        : 0;
    }

    this.selectedMemory = memory;
    this.isLightboxOpen = true;
    this.cdr.detectChanges();
  }

  nextMemory(): void {
    if (!this.selectedAlbum) return;
    this.currentMemoryIndex = (this.currentMemoryIndex + 1) % this.selectedAlbum.memories.length;
    this.selectedMemory = this.selectedAlbum.memories[this.currentMemoryIndex];
  }

  prevMemory(): void {
    if (!this.selectedAlbum) return;
    this.currentMemoryIndex =
      (this.currentMemoryIndex - 1 + this.selectedAlbum.memories.length) %
      this.selectedAlbum.memories.length;
    this.selectedMemory = this.selectedAlbum.memories[this.currentMemoryIndex];
  }

  closeLightbox(): void {
    this.isLightboxOpen = false;
    this.selectedAlbum = null;
    this.selectedMemory = null;
  }

  //  SLIDESHOW 

  startSlideshow(album: CommunityAlbum): void {
    if (album.memories.length <= 1) return;
    album.slideIndex = 0;
    album.currentDisplayImage = album.memories[0].imageUrl;
    album.slideshowInterval = setInterval(() => {
      album.slideIndex = (album.slideIndex + 1) % album.memories.length;
      album.currentDisplayImage = album.memories[album.slideIndex].imageUrl;
      //this.cdr.detectChanges();
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
        // Create new marker
        const marker = leaflet.marker([memory.latitude, memory.longitude]);
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
            <span class="popup-visibility public">Public</span>
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
              <path fill="currentColor" d="M23,10C23,8.89 22.11,8 21,8H14.68L15.64,3.43C15.66,3.33 15.67,3.22 15.67,3.11C15.67,2.7 15.5,2.32 15.23,2.05L14.17,1L7.59,7.58C7.22,7.95 7,8.45 7,9V19A2,2 0 0,0 9,21H18C18.83,21 19.54,20.5 19.84,19.78L22.86,12.73C22.95,12.5 23,12.26 23,12V10M1,9V21H5V9H1Z"/>
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

    popupEl.querySelector('.popup-like-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (memory.id) {
        this.toggleLike(memory.id);
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

  @HostListener('window:viewBig', ['$event'])
  onViewBig(event: Event): void {
    const memoryId = (event as CustomEvent<string>).detail;
    const foundMemory = this.filteredMemories.find(m => m.id === memoryId);
    if (foundMemory) {
      this.openLightboxForMemory(foundMemory);
    }
  }
}


