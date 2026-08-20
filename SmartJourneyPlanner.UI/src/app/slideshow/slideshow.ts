import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, Input, Output, EventEmitter, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import Swal from 'sweetalert2';
import * as L from 'leaflet';
import 'leaflet.markercluster';

import { MemoryService } from '../services/memory';
import { TripService } from '../services/trip.service';
import { MapAnimationService } from '../services/map-animation.service';
import { TripMemory } from '../models/memory.model';

@Component({
  selector: 'app-slideshow',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './slideshow.html',
  styleUrls: ['./slideshow.css']
})
export class SlideshowComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('container') containerRef!: ElementRef;
  @ViewChild('slideshowScreen') slideshowScreenRef!: ElementRef;

  @Input() showCloseButton: boolean = true;
  @Output() close = new EventEmitter<void>();

  tripId: string = '';
  tripDurationDays: number = 0;
  tripDetails: any = null;

  isLightMode: boolean = true;
  isFullscreen: boolean = false;
  isPlaying: boolean = false;
  isDownloading: boolean = false;
  isAlbumDownloading: boolean = false;
  activeIndex: number = 0;
  playbackInterval: any;

  private map!: L.Map;
  private markersClusterGroup: any = (L as any).markerClusterGroup({
    iconCreateFunction: (cluster: any) => {
      const count = cluster.getChildCount();
      return L.divIcon({
        html: `<div class="custom-cluster-icon"><span>${count}</span></div>`,
        className: 'my-cluster-wrapper',
        iconSize: L.point(40, 40)
      });
    }
  });
  private mapMarkers: L.Marker[] = [];
  private pathLine!: L.Polyline;
  private lightTileLayer!: L.TileLayer;
  private darkTileLayer!: L.TileLayer;
  private vehicleMarker!: L.Marker;

  // Data Binding Variables
  allMemories: TripMemory[] = [];
  filteredMemories: any[] = [];
  selectedTripName: string = '';

  // Member Tracking Variables
  tripMembers: any[] = [];
  memberCount: number = 0;

  // Angular Services Injection
  private readonly memoryService = inject(MemoryService);
  private readonly tripService = inject(TripService);
  private readonly mapAnimationService = inject(MapAnimationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    const tripParam = this.route.snapshot.paramMap.get('tripName');
    if (tripParam) {
      this.selectedTripName = decodeURIComponent(tripParam);
    }

    const idParam = this.route.snapshot.queryParamMap.get('tripId');
    if (idParam) {
      this.tripId = idParam;
    } else {
      const navigation = this.router.getCurrentNavigation();
      if (navigation?.extras.state && navigation.extras.state['tripId']) {
        this.tripId = navigation.extras.state['tripId'];
      } else if (history.state && history.state.tripId) {
        this.tripId = history.state.tripId;
      }
    }

    if (this.tripId) {
      this.loadTripMetadata();
    }

    this.loadAndFilterMemories();
    document.addEventListener('fullscreenchange', this.onFullscreenChange.bind(this));
    document.addEventListener('keydown', this.handleKeyboard.bind(this));
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
    }

    document.removeEventListener('fullscreenchange', this.onFullscreenChange.bind(this));
    document.removeEventListener('keydown', this.handleKeyboard.bind(this));

    if (this.map) {
      this.map.off();
      this.map.remove();
    }
  }

  public onClose(): void {
    this.showCloseButton = false;
    this.close.emit();

    if (!this.map) return;

    this.renderImageMarkers();

    if (this.filteredMemories.length > 0) {
      const bounds = this.filteredMemories
        .filter((m) => m.latitude && m.longitude)
        .map((m) => L.latLng(m.latitude, m.longitude));

      if (bounds.length > 0) {
        this.map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 14 });
      }
    }
  }

  public onReopenSlideshow(): void {
    this.showCloseButton = true;
  }

  goBackToSummary(): void {
    let targetId = this.tripId;

    if (!targetId && this.tripDetails) {
      targetId = this.tripDetails.id || this.tripDetails._id;
    }

    if (!targetId && this.filteredMemories.length > 0) {
      targetId = this.filteredMemories[0].tripId;
    }

    if (targetId) {
      this.router.navigate(['/trip-summary', targetId]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  private buildTripMembers(): void {
    if (!this.tripDetails) return;

    const details = this.tripDetails.data || this.tripDetails;
    const rawMembers: any[] = details.members || details.Members || [];

    this.tripMembers = [];
    const seenEmails = new Set<string>();
    const uploaderSet = new Set<string>();

    this.filteredMemories.forEach((m) => {
      if (m.userId) uploaderSet.add(m.userId.toLowerCase().trim());
      if (m.fullName) uploaderSet.add(m.fullName.toLowerCase().trim());
      if (m.email) uploaderSet.add(m.email.toLowerCase().trim());
      if (m.createdBy) uploaderSet.add(m.createdBy.toLowerCase().trim());
    });

    if (Array.isArray(rawMembers)) {
      rawMembers.forEach((m: any) => {
        const email = (m.email || '').toLowerCase().trim();
        const displayName = m.name || m.Name || m.email || 'Member';
        const role = m.role || m.Role || 'Member';
        const memberId = (m.id || m.userId || '').toLowerCase().trim();

        if (email && !seenEmails.has(email)) {
          seenEmails.add(email);

          const hasUploaded =
            uploaderSet.has(email) ||
            uploaderSet.has(displayName.toLowerCase().trim()) ||
            (memberId !== '' && uploaderSet.has(memberId));

          this.tripMembers.push({
            name: displayName,
            email: m.email || '',
            role: role.toLowerCase() === 'owner' ? 'Owner' : role,
            hasMemory: hasUploaded
          });
        }
      });
    }

    this.memberCount = this.tripMembers.length;
    this.cdr.detectChanges();
  }

  private loadTripMetadata(): void {
    if (!this.tripId) return;
    this.tripService.getTripById(this.tripId).subscribe({
      next: (trip: any) => {
        this.tripDetails = trip;
        const details = trip.data || trip;

        if (details.duration || details.tripDurationDays) {
          this.tripDurationDays = details.duration || details.tripDurationDays;
        } else if (details.startDate && details.endDate) {
          const start = new Date(details.startDate).getTime();
          const end = new Date(details.endDate).getTime();
          const diffTime = Math.abs(end - start);
          this.tripDurationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }

        this.buildTripMembers();
      },
      error: (err) => console.error('Error fetching trip details:', err)
    });
  }

  private loadAndFilterMemories(): void {
    if (this.tripId) {
      this.memoryService.getTripMemories(this.tripId).subscribe({
        next: (data: TripMemory[]) => {
          this.allMemories = data;

          this.filteredMemories = this.allMemories
            .map((m) => ({
              ...m,
              visibility: m.visibility ?? 'private'
            }))
            .filter((m) => m.visibility === 'public' || m.visibility === 'tripMembers');

          const sortedDefault = [...this.filteredMemories].sort((a, b) => {
            const dateA = new Date(a.createdAt || a.startDate || '').getTime();
            const dateB = new Date(b.createdAt || b.startDate || '').getTime();
            return dateA - dateB;
          });

          const savedOrderIds = localStorage.getItem(`trip_order_${this.tripId || this.selectedTripName}`);

          if (savedOrderIds) {
            const idArray: string[] = JSON.parse(savedOrderIds);
            this.filteredMemories = idArray
              .map((id) => sortedDefault.find((m) => m.id === id || (m as any)._id === id))
              .filter((m) => m !== undefined) as any[];

            const missingMemories = sortedDefault.filter(
              (orig) => !this.filteredMemories.some((m) => m.id === orig.id || (m as any)._id === (orig as any)._id)
            );
            this.filteredMemories = [...this.filteredMemories, ...missingMemories];
          } else {
            this.filteredMemories = sortedDefault;
          }

          if (this.tripDetails) {
            this.buildTripMembers();
          }

          if (this.filteredMemories.length > 0) {
            if (!this.tripId && this.filteredMemories[0].tripId) {
              this.tripId = this.filteredMemories[0].tripId;
              this.loadTripMetadata();
            }

            setTimeout(() => {
              this.initMap();
            }, 200);
          }
        },
        error: (err: any) => {
          console.error('Failed to load memories:', err);
        }
      });
    } else {
      console.error('No tripId available to load memories');
    }
  }

  private initMap(): void {
    const mapElement = document.getElementById('leaflet-map-background');
    if (this.filteredMemories.length === 0 || !mapElement) return;

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/marker-icon-2x.png',
      iconUrl: 'assets/marker-icon.png',
      shadowUrl: 'assets/marker-shadow.png'
    });

    if (this.map) {
      this.map.off();
      this.map.remove();
    }

    const activeCoords = this.filteredMemories[this.activeIndex];
    if (!activeCoords || !activeCoords.latitude || !activeCoords.longitude) return;

    this.map = L.map('leaflet-map-background', {
      center: [activeCoords.latitude, activeCoords.longitude],
      zoom: 10,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true,
      scrollWheelZoom: true,
      boxZoom: true,
      bounceAtZoomLimits: true
    });

    this.lightTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png');
    this.darkTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png');

    if (this.isLightMode) {
      this.lightTileLayer.addTo(this.map);
    } else {
      this.darkTileLayer.addTo(this.map);
    }

    const latLngList = this.filteredMemories
      .filter((m) => m.latitude && m.longitude)
      .map((m) => L.latLng(m.latitude, m.longitude));

    this.pathLine = L.polyline(latLngList, { color: '#8b5cf6', weight: 4, dashArray: '8, 12' }).addTo(this.map);

    this.renderImageMarkers();

    const vehicleIcon = L.divIcon({
      className: 'custom-vehicle-marker',
      html: `<div class="vehicle-emoji">🚗</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
    this.vehicleMarker = L.marker([activeCoords.latitude, activeCoords.longitude], {
      icon: vehicleIcon,
      zIndexOffset: 3000
    }).addTo(this.map);

    this.map.on('moveend', () => {
      this.mapAnimationService.resetOpenCluster();
    });
  }

  private renderImageMarkers(): void {
  if (!this.map) return;

  this.markersClusterGroup.clearLayers();
  this.mapMarkers = [];

  this.filteredMemories.forEach((memory, idx) => {
    if (memory.latitude && memory.longitude) {
      const pinColor = this.getPinColor(idx);
      const locationName = memory.title ? memory.title.split(' ')[0] : 'Stop';
      const isActive = idx === this.activeIndex;

      const pulseMarkup = isActive
        ? `<div class="pin-pulse-wave"></div><div class="pin-pulse-wave delay"></div>`
        : '';

      const customPinIcon = L.divIcon({
        className: `vignette-pin-wrapper ${isActive ? 'active-pin-leaflet' : ''}`,
        html: `
          ${pulseMarkup}
          <div class="vignette-pin-container ${isActive ? 'active' : ''}" style="--pin-color: ${pinColor}">
            <div class="vignette-image-holder ${isActive ? 'active-border' : ''}">
              <img src="${memory.imageUrl}" alt="${memory.title || 'Trip stop'}" />
            </div>
            <div class="vignette-pin-tail"></div>
            <div class="vignette-location-badge">${locationName}</div>
          </div>
        `,
        iconSize: isActive ? [80, 100] : [60, 75],
        iconAnchor: isActive ? [40, 100] : [30, 75]
      });

      const marker = L.marker([memory.latitude, memory.longitude], {
        icon: customPinIcon,
        zIndexOffset: isActive ? 99999 : idx
      }).on('click', () => {
        this.setActiveIndex(idx);
        this.onReopenSlideshow();
      });

      this.mapMarkers.push(marker);
      this.markersClusterGroup.addLayer(marker);
    }
  });

  if (!this.map.hasLayer(this.markersClusterGroup)) {
    this.markersClusterGroup.addTo(this.map);
  }

  // Force active marker DOM element to highest z-index
  const activeMarker = this.mapMarkers[this.activeIndex];
  if (activeMarker) {
    activeMarker.setZIndexOffset(99999);
    const markerEl = activeMarker.getElement();
    if (markerEl) {
      markerEl.style.zIndex = '99999';
    }
  }
}

  private getPinColor(index: number): string {
    const colors = ['#e11d48', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];
    return colors[index % colors.length];
  }

  private async executeSequentialAnimation(
    oldCoords: L.LatLngLiteral,
    newCoords: L.LatLngLiteral,
    targetIndex: number
  ): Promise<void> {
    //  Hide slideshow screen FIRST (only in normal mode)
    if (this.slideshowScreenRef && !this.isFullscreen) {
      this.slideshowScreenRef.nativeElement.classList.add('hide-during-move');
    }

    // In FULLSCREEN mode, update activeIndex IMMEDIATELY so image changes without delay
    if (this.isFullscreen) {
      this.activeIndex = targetIndex;
      this.cdr.detectChanges();
    }

    //  Animate vehicle and map pan to target location
    await this.mapAnimationService.animateVehicleMovement(
      this.vehicleMarker,
      this.map,
      oldCoords,
      newCoords,
      this.isFullscreen
    );

    //  In NORMAL mode, update activeIndex NOW while the slideshow is hidden
    if (!this.isFullscreen) {
      this.activeIndex = targetIndex;
      this.cdr.detectChanges();
    }

    //  Update map pins and spiderfy target cluster if needed
    this.renderImageMarkers();

    const targetMarker = this.mapMarkers[this.activeIndex];
    if (targetMarker) {
      await this.mapAnimationService.triggerClusterSpiderify(this.markersClusterGroup, targetMarker);
    }

    //  Reveal slideshow screen (only in normal mode)
    if (this.slideshowScreenRef && !this.isFullscreen) {
      this.slideshowScreenRef.nativeElement.classList.remove('hide-during-move');
      await this.mapAnimationService.animateSlideshowBoxShow(this.slideshowScreenRef.nativeElement);
    }
  }

  setActiveIndex(index: number): void {
    if (this.activeIndex === index || this.filteredMemories.length === 0) return;
    const oldCoords = {
      lat: this.filteredMemories[this.activeIndex].latitude,
      lng: this.filteredMemories[this.activeIndex].longitude
    };
    const newCoords = {
      lat: this.filteredMemories[index].latitude,
      lng: this.filteredMemories[index].longitude
    };

    this.executeSequentialAnimation(oldCoords, newCoords, index);
  }

  prevSlide(): void {
    if (this.filteredMemories.length === 0) return;
    const oldCoords = {
      lat: this.filteredMemories[this.activeIndex].latitude,
      lng: this.filteredMemories[this.activeIndex].longitude
    };
    const newIndex = this.activeIndex === 0 ? this.filteredMemories.length - 1 : this.activeIndex - 1;
    const newCoords = {
      lat: this.filteredMemories[newIndex].latitude,
      lng: this.filteredMemories[newIndex].longitude
    };

    this.executeSequentialAnimation(oldCoords, newCoords, newIndex);
  }

  nextSlide(): void {
    if (this.filteredMemories.length === 0) return;
    const oldCoords = {
      lat: this.filteredMemories[this.activeIndex].latitude,
      lng: this.filteredMemories[this.activeIndex].longitude
    };
    const newIndex = this.activeIndex === this.filteredMemories.length - 1 ? 0 : this.activeIndex + 1;
    const newCoords = {
      lat: this.filteredMemories[newIndex].latitude,
      lng: this.filteredMemories[newIndex].longitude
    };

    this.executeSequentialAnimation(oldCoords, newCoords, newIndex);
  }

  public async downloadAlbumAsPhotos(): Promise<void> {
    if (this.filteredMemories.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Images Found',
        text: 'There are no images available to download in this album.',
        confirmButtonColor: '#8b5cf6'
      });
      return;
    }

    this.isAlbumDownloading = true;

    try {
      for (let i = 0; i < this.filteredMemories.length; i++) {
        const memory = this.filteredMemories[i];

        if (memory.imageUrl) {
          const response = await fetch(memory.imageUrl);
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);

          const anchor = document.createElement('a');
          anchor.href = downloadUrl;

          const fileExtension = blob.type.split('/')[1] || 'jpg';
          anchor.download = `${this.selectedTripName.replace(/\s+/g, '_')}_Photo_${i + 1}.${fileExtension}`;

          document.body.appendChild(anchor);
          anchor.click();

          document.body.removeChild(anchor);
          window.URL.revokeObjectURL(downloadUrl);

          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      Swal.fire({
        icon: 'success',
        title: 'Album Downloaded!',
        text: 'All available photos have been downloaded to your machine.',
        confirmButtonColor: '#8b5cf6'
      });
    } catch (err) {
      console.error('There is a problem while downloading images:', err);
      Swal.fire({
        icon: 'error',
        title: 'Download Failed',
        text: 'Some images could not be downloaded. Please check your network connection.',
        confirmButtonColor: '#e11d48'
      });
    } finally {
      this.isAlbumDownloading = false;
    }
  }

  toggleTheme(): void {
    this.isLightMode = !this.isLightMode;
    if (this.map) {
      if (this.isLightMode) {
        this.map.removeLayer(this.darkTileLayer);
        this.lightTileLayer.addTo(this.map);
      } else {
        this.map.removeLayer(this.lightTileLayer);
        this.darkTileLayer.addTo(this.map);
      }
    }
  }

  toggleFullscreen(): void {
    if (!this.showCloseButton) {
      this.onReopenSlideshow();
    }

    const element = this.containerRef.nativeElement;
    if (!document.fullscreenElement) {
      element
        .requestFullscreen()
        .then(() => {
          this.isFullscreen = true;
        })
        .catch((err: any) => console.error('Error entering fullscreen:', err));
    } else {
      document.exitFullscreen();
    }
  }

  private onFullscreenChange(): void {
    this.isFullscreen = !!document.fullscreenElement;
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
        if (this.filteredMemories.length > 0) {
          const activeCoords = this.filteredMemories[this.activeIndex];
          if (activeCoords && activeCoords.latitude && activeCoords.longitude) {
            this.map.setView([activeCoords.latitude, activeCoords.longitude], 10, { animate: true });
          }
        }
      }
    }, 250);
  }

  private handleKeyboard(event: KeyboardEvent): void {
    switch (event.code) {
      case 'Space':
        event.preventDefault();
        this.togglePlay();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.prevSlide();
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.nextSlide();
        break;
    }
  }

  togglePlay(): void {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      this.playbackInterval = setInterval(() => this.nextSlide(), 7000);
    } else {
      clearInterval(this.playbackInterval);
    }
  }

  onThumbnailDrop(event: CdkDragDrop<any[]>): void {
    moveItemInArray(this.filteredMemories, event.previousIndex, event.currentIndex);

    if (this.activeIndex === event.previousIndex) {
      this.activeIndex = event.currentIndex;
    } else if (this.activeIndex > event.previousIndex && this.activeIndex <= event.currentIndex) {
      this.activeIndex--;
    } else if (this.activeIndex < event.previousIndex && this.activeIndex >= event.currentIndex) {
      this.activeIndex++;
    }

    const orderIds = this.filteredMemories.map((m) => m.id || m._id);
    localStorage.setItem(`trip_order_${this.tripId || this.selectedTripName}`, JSON.stringify(orderIds));

    this.refreshMapPath();
    this.renderImageMarkers();
  }

  private refreshMapPath(): void {
    if (!this.map || this.filteredMemories.length === 0) return;

    if (this.pathLine) {
      this.map.removeLayer(this.pathLine);
    }

    const latLngList = this.filteredMemories
      .filter((m) => m.latitude && m.longitude)
      .map((m) => L.latLng(m.latitude, m.longitude));

    this.pathLine = L.polyline(latLngList, {
      color: '#8b5cf6',
      weight: 4,
      dashArray: '8, 12'
    }).addTo(this.map);
  }
}