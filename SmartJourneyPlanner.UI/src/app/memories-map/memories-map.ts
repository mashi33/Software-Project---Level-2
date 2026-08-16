import { Component, OnInit, HostListener, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import * as leaflet from 'leaflet';
import 'leaflet.markercluster';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-memories-map',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './memories-map.html',
  styleUrls: ['./memories-map.css']
})
export class MemoriesMapComponent implements OnInit, AfterViewInit, OnDestroy {
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

  private apiUrl = 'http://localhost:5233/api/memories';

  visibilityStatus: string = 'private';

  newMemory = {
    title: '',
    locationName: '',
    imageUrl: '',
    description: '',
    latitude: 0,
    longitude: 0,
    visibility: 'private'
  };

  searchQuery: string = '';
  allMemories: any[] = [];
  myRecentUploads: any[] = [];
  selectedMemory: any | null = null;
  allTrips: any[] = [];
  selectedTripId: string = '';
  selectedTrip: any = null;
  groupedAlbums: any[] = [];
  selectedAlbum: any | null = null;
  currentMemoryIndex: number = 0;
  isLightboxOpen = false;
  showMax: number = 3;
  showAllAlbums: boolean = false;
  activeTab: 'upload' | 'albums' = 'upload';
  showLikedUsers: boolean = false;

  constructor(
    private http: HttpClient,
    private location: Location,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fixLeafletIcons();
    this.loadAccessibleTrips();
    this.loadMyMemories();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {}

  setActiveTab(tab: 'upload' | 'albums') {
    this.activeTab = tab;
  }

  toggleLikedUsers(): void {
    this.showLikedUsers = !this.showLikedUsers;
  }

  isObject(val: any): boolean {
    return val !== null && typeof val === 'object';
  }

  // SWEETALERT HELPERS 

  private showSuccess(title: string, text?: string) {
    return Swal.fire({
      icon: 'success',
      title,
      text,
      confirmButtonColor: '#2563eb'
    });
  }

  private showError(title: string, text?: string) {
    return Swal.fire({
      icon: 'error',
      title,
      text,
      confirmButtonColor: '#2563eb'
    });
  }

  private showWarning(title: string, text?: string) {
    return Swal.fire({
      icon: 'warning',
      title,
      text,
      confirmButtonColor: '#2563eb'
    });
  }

  private showInfo(title: string, text?: string) {
    return Swal.fire({
      icon: 'info',
      title,
      text,
      confirmButtonColor: '#2563eb'
    });
  }

  private confirmDelete(title: string, text: string, confirmText = 'Yes, delete it') {
    return Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: confirmText,
      cancelButtonText: 'Cancel',
      reverseButtons: true
    });
  }

  // FILE UPLOAD

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      this.showError(
        'File too large',
        'Please choose an image under 2MB.'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.newMemory.imageUrl = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  goBack(): void {
    this.location.back();
  }

  removeImage(fileInput: HTMLInputElement): void {
    this.newMemory.imageUrl = '';
    fileInput.value = '';
  }

  // LIGHTBOX 

  openAlbum(album: any) {
    this.selectedAlbum = album;
    this.currentMemoryIndex = 0;
    this.selectedMemory = album.memories[0] || null;
    this.isLightboxOpen = true;
  }

  openLightboxForMemory(memory: any, album?: any) {
    if (!memory) return;

    if (album) {
      this.selectedAlbum = album;
      this.currentMemoryIndex = album.memories.findIndex((m: any) => m.id === memory.id);
      if (this.currentMemoryIndex < 0) this.currentMemoryIndex = 0;
    } else {
      this.selectedAlbum = null;
    this.currentMemoryIndex = 0;
    }

    this.selectedMemory = memory;
    this.isLightboxOpen = true;
    this.cdr.detectChanges();
  }

  nextMemory() {
    if (!this.selectedAlbum) return;
    this.currentMemoryIndex = (this.currentMemoryIndex + 1) % this.selectedAlbum.memories.length;
    this.selectedMemory = this.selectedAlbum.memories[this.currentMemoryIndex];
  }

  prevMemory() {
    if (!this.selectedAlbum) return;
    this.currentMemoryIndex =
      (this.currentMemoryIndex - 1 + this.selectedAlbum.memories.length) %
      this.selectedAlbum.memories.length;
    this.selectedMemory = this.selectedAlbum.memories[this.currentMemoryIndex];
  }

  closeLightbox() {
    this.isLightboxOpen = false;
    this.selectedAlbum = null;
    this.selectedMemory = null;
  }

  closeModal() {
    this.selectedMemory = null;
  }

  // TRIPS

  loadAccessibleTrips() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any[]>(`http://localhost:5233/api/trips/user-accessible`, { headers }).subscribe({
      next: (data) => {
        this.allTrips = data;
        this.enrichMemoriesWithTripNames();
        this.groupMemoriesByTrip();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching trips:', err);
        this.showError('Could not load trips', 'Please check your connection and try again.');
      }
    });
  }

  onTripChange(event: any) {
    const tripId = event.target.value;
    this.selectedTripId = tripId;
    this.selectedTrip = this.allTrips.find(t => t.id == tripId) || null;
  }

  // DATA HELPERS

  private formatData(memory: any) {
    return {
      id: memory.id || memory._id || memory.Id,
      title: memory.title || memory.Title || 'Untitled',
      imageUrl: memory.imageUrl || memory.ImageUrl || '',
      description: memory.description || memory.Description || '',
      latitude: Number(memory.latitude || memory.Latitude || 0),
      longitude: Number(memory.longitude || memory.Longitude || 0),
      locationName: memory.locationName || memory.LocationName || 'Unknown Location',
      startDate: memory.startDate,
      endDate: memory.endDate,
      visibility: memory.visibility ?? memory.Visibility ?? 'private',
      likeCount: memory.likeCount || 0,
      likedByUsers: memory.likedByUsers || memory.LikedByUsers || [],
      tripId: memory.tripId || memory.TripId || null,
      tripName: memory.tripName || memory.TripName || null,
      createdAt: memory.createdAt || memory.CreatedAt
    };
  }

  private enrichMemoriesWithTripNames() {
    this.allMemories = this.allMemories.map(m => {
      const trip = this.allTrips.find(t => t.id === m.tripId);
      return {
        ...m,
        tripName: trip?.tripName || m.tripName || 'No Trip Assigned'
      };
    });
  }

  groupMemoriesByTrip() {
    const groups = new Map<string, any>();

    this.allMemories.forEach(memory => {
      const tripName = memory.tripName || 'No Trip';

      if (!groups.has(tripName)) {
        groups.set(tripName, {
          tripName,
          memories: [],
          latestImage: memory.imageUrl,
          latestDate: memory.startDate || memory.endDate || memory.createdAt,
          currentDisplayImage: memory.imageUrl,
          slideIndex: 0
        });
      }

      const album = groups.get(tripName)!;
      album.memories.push(memory);

      const memoryDate = new Date(memory.startDate || memory.endDate || memory.createdAt);
      const albumDate = new Date(album.latestDate);

      if (memoryDate > albumDate) {
        album.latestImage = memory.imageUrl;
        album.latestDate = memory.startDate || memory.endDate || memory.createdAt;
        album.currentDisplayImage = memory.imageUrl;
      }
    });

    this.groupedAlbums = Array.from(groups.values());
  }

  loadMyMemories() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    this.http.get<any[]>(`${this.apiUrl}/user/${userId}`).subscribe({
      next: (data) => {
        this.allMemories = data.map(m => {
          const formatted = this.formatData(m);
          const trip = this.allTrips.find(t => t.id === m.tripId);
          formatted.tripName = trip?.tripName || formatted.tripName || 'No Trip Assigned';
          return formatted;
        });

        this.groupMemoriesByTrip();
        this.refreshMapMarkers();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading memories:', err);
        this.showError('Could not load memories', 'Please check your backend server.');
      }
    });
  }

  get displayedAlbums() {
    return this.showAllAlbums ? this.groupedAlbums : this.groupedAlbums.slice(0, 3);
  }

  toggleSeeMore() {
    this.showAllAlbums = !this.showAllAlbums;
    this.cdr.detectChanges();
  }

  // SEARCH & SAVE 

  searchLocation() {
    if (!this.searchQuery) {
      this.showInfo('Enter a location', 'Please enter a city name (e.g., Kandy).');
      return;
    }

    const query = encodeURIComponent(this.searchQuery + ', Sri Lanka');
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}`;

    Swal.fire({
      title: 'Searching...',
      text: 'Looking up your location',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.http.get<any[]>(url).subscribe({
      next: (res) => {
        Swal.close();

        if (res?.length) {
          const lat = parseFloat(res[0].lat);
          const lon = parseFloat(res[0].lon);

          if (this.sriLankaBounds.contains([lat, lon])) {
            this.newMemory.latitude = lat;
            this.newMemory.longitude = lon;
            this.newMemory.locationName = res[0].display_name;
            this.map.flyTo([lat, lon], 14);

            Swal.fire({
              toast: true,
              position: 'top-end',
              icon: 'success',
              title: 'Location found!',
              showConfirmButton: false,
              timer: 2000,
              timerProgressBar: true
            });
          } else {
            this.showWarning(
              'Outside Sri Lanka',
              'This location is outside of Sri Lanka. Please search within Sri Lanka.'
            );
          }
        } else {
          this.showWarning('Location not found', 'Try another city name.');
        }
      },
      error: () => {
        Swal.close();
        this.showError('Search failed', 'Could not search for your location. Please try again.');
      }
    });
  }

  saveMemory() {
    const userId = localStorage.getItem('userId');
    const fullName = localStorage.getItem('userName');
    if (!userId) {
      this.showWarning('Login required', 'Please log in to save memories.');
      return;
    }

    this.newMemory.visibility = this.visibilityStatus;

    const body = {
      ...this.newMemory,
      userId,
      fullName,
      visibility: this.newMemory.visibility,
      tripId: this.selectedTrip?.id || null,
      tripName: this.selectedTrip?.tripName || null
    };

    Swal.fire({
      title: 'Saving memory...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.http.post(this.apiUrl, body).subscribe({
      next: (response: any) => {
        Swal.close();

        const savedData = this.formatData(response);
        savedData.tripName = this.selectedTrip?.tripName || savedData.tripName || 'No Trip Assigned';

        this.allMemories.push(savedData);
        this.myRecentUploads.unshift(savedData);
        if (this.myRecentUploads.length > 6) this.myRecentUploads.pop();

        this.groupMemoriesByTrip();
        this.refreshMapMarkers();

        this.newMemory = {
          title: '',
          locationName: '',
          imageUrl: '',
          description: '',
          latitude: 0,
          longitude: 0,
          visibility: 'private'
        };
        this.visibilityStatus = 'private';
        this.searchQuery = '';
        this.selectedTrip = null;
        this.selectedTripId = '';
        this.cdr.detectChanges();

        this.showSuccess('Memory pinned!', 'Your memory has been saved and added to the map.');
      },
      error: () => {
        Swal.close();
        this.showError(
          'Save failed',
          'Could not save memory. Please check your backend server.'
        );
      }
    });
  }

  // DELETE 

  deleteMemory(id: string, event?: Event) {
    event?.stopPropagation();
    event?.preventDefault();

    this.confirmDelete(
      'Delete this memory?',
      'This action cannot be undone.'
    ).then(result => {
      if (!result.isConfirmed) return;

      Swal.fire({
        title: 'Deleting...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      this.http.delete(`${this.apiUrl}/${id}`).subscribe({
        next: () => {
          Swal.close();

          this.allMemories = this.allMemories.filter(m => m.id !== id);
          this.myRecentUploads = this.myRecentUploads.filter(m => m.id !== id);

          if (this.selectedMemory?.id === id) {
            this.closeLightbox();
          }

          this.groupMemoriesByTrip();
          this.refreshMapMarkers();
          this.cdr.detectChanges();

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Memory deleted',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
          });
        },
        error: (err) => {
          Swal.close();
          console.error('Delete failed', err);
          this.showError('Delete failed', 'Could not delete memory. Check backend connection.');
        }
      });
    });
  }

  deleteAlbum(album: any, event?: Event) {
    event?.stopPropagation();
    event?.preventDefault();

    if (!album?.memories?.length) return;

    const count = album.memories.length;
    const label = album.tripName || 'this album';

    this.confirmDelete(
      `Delete "${label}"?`,
      `This will permanently delete all ${count} memor${count === 1 ? 'y' : 'ies'} in this album.`,
      'Yes, delete album'
    ).then(result => {
      if (!result.isConfirmed) return;

      Swal.fire({
        title: 'Deleting album...',
        text: `Removing ${count} memor${count === 1 ? 'y' : 'ies'}...`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const requests = album.memories.map((m: any) => this.http.delete(`${this.apiUrl}/${m.id}`));

      forkJoin(requests).subscribe({
        next: () => {
          Swal.close();

          const ids = new Set(album.memories.map((m: any) => m.id));

          this.allMemories = this.allMemories.filter(m => !ids.has(m.id));
          this.myRecentUploads = this.myRecentUploads.filter(m => !ids.has(m.id));

          if (this.selectedAlbum?.tripName === album.tripName) {
            this.closeLightbox();
          }

          this.groupMemoriesByTrip();
          this.refreshMapMarkers();
          this.cdr.detectChanges();

          this.showSuccess('Album deleted', `"${label}" and all its memories were removed.`);
        },
        error: (err) => {
          Swal.close();
          console.error('Album delete failed', err);
          this.showError(
            'Album delete failed',
            'Some items may not have been deleted. Refreshing your list...'
          );
          this.loadMyMemories();
        }
      });
    });
  }

  // MAP POPUP 

  private isUserLiked(memory: any): boolean {
    const userName = localStorage.getItem('userName');
    if (!userName || !memory.likedByUsers) return false;
    return memory.likedByUsers.includes(userName);
  }

  private getHeartAnimationHtml(memory: any): string {
    if (!this.isUserLiked(memory)) return '';
    
    return `
      <div class="heart-animation-container" id="heart-anim-${memory.id}">
        <svg class="floating-heart" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        <svg class="floating-heart" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        <svg class="floating-heart" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

  private getPopupHtml(memory: any): string {
    if (!memory) return '<div class="map-popup">No data available</div>';

    const title = this.escapeHtml(memory.title || 'Untitled');
    const location = this.escapeHtml(memory.locationName || 'Unknown');
    const imageUrl = this.escapeHtml(memory.imageUrl || '');
    const id = this.escapeHtml(String(memory.id));
    const visibility = memory.visibility === 'public' ? 'Public' : memory.visibility === 'tripMembers' ? 'Only for trip members' : 'Private';
    const visibilityClass = memory.visibility === 'public' ? 'public' : memory.visibility === 'tripMembers' ? 'trip-members' : 'private';

    const likeHtml = memory.visibility === 'public'
      ? `<div class="popup-likes">
           <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                 <path fill="#be123c" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
           <span class="like-num">${memory.likeCount || 0}</span>
         </div>`
      : '';

    return `
      <div class="map-popup" data-memory-id="${id}">
        <div class="popup-image-wrap view-big-image" data-memory-id="${id}" title="Click to view full size">
          <img src="${imageUrl}" alt="${title}" class="popup-image" />
          <div class="popup-image-overlay">
            <span class="popup-zoom-hint">View full size</span>
          </div>
        </div>

        <div class="popup-body">
          <div class="popup-header">
            <h6 class="popup-title">${title}</h6>
            <span class="popup-visibility ${visibilityClass}">${visibility}</span>
          </div>

          <p class="popup-location">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
            </svg>
            <span>${location}</span>
          </p>

          ${likeHtml}

          <div class="popup-actions">
            <button type="button" class="popup-btn popup-btn-view view-big-image" data-memory-id="${id}">
              Open details
            </button>
            <button type="button" class="popup-btn popup-btn-delete delete-memory-btn" data-memory-id="${id}">
              Delete
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private attachPopupListeners(popupEl: HTMLElement, memory: any) {
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

    const deleteBtn = popupEl.querySelector('.delete-memory-btn');
    deleteBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.deleteMemory(memory.id);
      this.map.closePopup();
    });
  }

  refreshMapMarkers(): void {
  this.markersLayer.clearLayers();

  const likedMemories = this.allMemories.filter(memory => this.isUserLiked(memory));
  const totalLikedPins = likedMemories.length;

  this.allMemories.forEach((memory) => {
    if (!memory.latitude || !memory.longitude) return;

    const likedIndex = likedMemories.findIndex(m => m.id === memory.id);
    const isLikedMemory = likedIndex !== -1;

    const heartAnimationHtml = isLikedMemory ? this.getHeartAnimationHtml(memory) : '';

    const pinStyle = isLikedMemory ? `
      --pin-color: ${memory.visibility === 'public' ? '#6366f1' : memory.visibility === 'tripMembers' ? '#10b981' : '#f59e0b'};
      --pin-index: ${likedIndex};
      --total-pins: ${totalLikedPins};
      --pin-delay: calc(2s + (${likedIndex} * 10s));
    ` : `
      --pin-color: ${memory.visibility === 'public' ? '#6366f1' : memory.visibility === 'tripMembers' ? '#10b981' : '#f59e0b'};
    `;
    const pinHtml = `
      <div class="vignette-pin-container" style="${pinStyle}">
        ${heartAnimationHtml}
        <div class="vignette-image-holder">
          <img src="${memory.imageUrl || 'assets/placeholder-image.jpg'}" alt="${this.escapeHtml(memory.title || '')}" />
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

    const marker = leaflet.marker([memory.latitude, memory.longitude], { 
      icon: customIcon,
      riseOnHover: true 
    });
    const popupHtml = this.getPopupHtml(memory);

    marker
      .bindPopup(popupHtml, {
        maxWidth: 320,
        minWidth: 280,
        className: 'memory-popup-wrapper'
      })
      .on('popupopen', (e: any) => {
        const popupEl = e.popup.getElement();
        if (popupEl) this.attachPopupListeners(popupEl, memory);
      });

    this.markersLayer.addLayer(marker);
  });
}

  // SLIDESHOW 

  startSlideshow(album: any) {
    if (album.memories.length <= 1) return;

    album.slideIndex = 0;
    album.currentDisplayImage = album.memories[0].imageUrl;

    album.slideshowInterval = setInterval(() => {
      album.slideIndex = (album.slideIndex + 1) % album.memories.length;
      album.currentDisplayImage = album.memories[album.slideIndex].imageUrl;
      this.cdr.detectChanges();
    }, 2000);
  }

  stopSlideshow(album: any) {
    if (album.slideshowInterval) {
      clearInterval(album.slideshowInterval);
      album.slideshowInterval = null;
    }
    album.currentDisplayImage = album.memories[0]?.imageUrl || album.latestImage;
  }

  // MAP INIT 

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
    this.refreshMapMarkers();
  }

  trackByFn(index: number, item: any) {
    return item.id || item.tripName || index;
  }

  private fixLeafletIcons() {
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

  // ALBUM HELPERS 

  getTotalLikes(album: any): number {
    return album.memories.reduce((sum: number, m: any) => sum + (m.likeCount || 0), 0);
  }

  getOldestCreatedAt(album: any): Date | null {
    if (!album.memories?.length) return null;

    const dates = album.memories
      .map((m: any) => new Date(m.createdAt))
      .filter((d: Date) => !isNaN(d.getTime()));

    return dates.length > 0 ? new Date(Math.min(...dates.map((d: Date) => d.getTime()))) : null;
  }

  getNewestCreatedAt(album: any): Date | null {
    if (!album.memories?.length) return null;

    const dates = album.memories
      .map((m: any) => new Date(m.createdAt))
      .filter((d: Date) => !isNaN(d.getTime()));

    return dates.length > 0 ? new Date(Math.max(...dates.map((d: Date) => d.getTime()))) : null;
  }

  getVisibilityLabel(visibility: string): string {
    switch (visibility) {
      case 'public':
        return 'Public';
      case 'tripMembers':
        return 'Only for trip members';
      case 'private':
      default:
        return 'Private';
    }
  }

  // EVENTS 

  @HostListener('window:viewBig', ['$event'])
  onViewBig(event: any) {
    const memoryId = event.detail;
    const foundMemory = this.allMemories.find(m => m.id === memoryId);

    if (foundMemory) {
      this.openLightboxForMemory(foundMemory);
    } else {
      this.showError('Memory not found', 'This memory could not be loaded.');
    }
  }

  openLightboxById(id: string) {
    const foundMemory = this.allMemories.find(m => m.id === id);
    if (foundMemory) {
      this.openLightboxForMemory(foundMemory);
    }
  }
}