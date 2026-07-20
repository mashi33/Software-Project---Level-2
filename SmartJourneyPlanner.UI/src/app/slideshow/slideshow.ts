import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemoryService } from '../services/memory'; 
import { TripService } from '../services/trip.service'; 
import { TripMemory } from '../models/memory.model';
import * as L from 'leaflet';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';

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
  private markersGroup = L.layerGroup(); 
  private mapMarkers: L.Marker[] = [];
  private pathLine!: L.Polyline;
  private lightTileLayer!: L.TileLayer;
  private darkTileLayer!: L.TileLayer;
  private vehicleMarker!: L.Marker;
  private animationFrameId: number | null = null;

  // Data Binding Variables
  allMemories: TripMemory[] = [];
  filteredMemories: any[] = []; 
  selectedTripName: string = ''; 

  // Member Tracking Variables
  tripMembers: any[] = [];
  memberCount: number = 0;

  constructor(
    private readonly memoryService: MemoryService,
    private readonly tripService: TripService, 
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  public onClose(): void {
    this.showCloseButton = false; 
    this.close.emit();

    this.renderImageMarkers();

    if (this.filteredMemories.length > 0) {
      const bounds = this.filteredMemories
        .filter(m => m.latitude && m.longitude)
        .map(m => L.latLng(m.latitude, m.longitude));
        
      if (bounds.length > 0) {
        this.map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 14 });
      }
    }
  }

  public onReopenSlideshow(): void {
    this.showCloseButton = true; 
  }

  ngOnInit(): void {
    const tripParam = this.route.snapshot.paramMap.get('tripName');
    if (tripParam) {
      this.selectedTripName = decodeURIComponent(tripParam);
    }

    const idParam = this.route.snapshot.queryParamMap.get('tripId');
    if (idParam) {
      this.tripId = idParam;
      this.loadTripMetadata();
    } else {
      const navigation = this.router.getCurrentNavigation();
      if (navigation?.extras.state && navigation.extras.state['tripId']) {
        this.tripId = navigation.extras.state['tripId'];
        this.loadTripMetadata();
      } else if (history.state && history.state.tripId) {
        this.tripId = history.state.tripId;
        this.loadTripMetadata();
      }
    }

    this.loadAndFilterMemories();
    document.addEventListener('fullscreenchange', this.onFullscreenChange.bind(this));
  }

  ngOnDestroy(): void {
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    document.removeEventListener('fullscreenchange', this.onFullscreenChange.bind(this));

    if (this.map) {
      this.map.off();
      this.map.remove();
    }
  }

  ngAfterViewInit(): void {}

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
    this.tripMembers = [];

    const organizerName =
      this.tripDetails.createdByName ||
      this.tripDetails.creatorName ||
      this.tripDetails.createdBy ||
      this.tripDetails.CreatedByName || 
      "Organizer";

    const organizerEmail = this.tripDetails.createdByEmail || this.tripDetails.CreatedByEmail || "";

    this.tripMembers.push({ name: organizerName, email: organizerEmail, role: "Organizer" });

    const rawMembers = this.tripDetails.members || this.tripDetails.Members || [];

    if (Array.isArray(rawMembers)) {
      rawMembers.forEach((member: any) => {
        const extractedName =
          member.name || member.Name || member.fullName || member.FullName ||
          member.userName || member.UserName || member.email || member.Email || "Unknown Member";

        const extractedEmail = member.email || member.Email || "";
        this.tripMembers.push({ name: extractedName, email: extractedEmail, role: "Member" });
      });
    }

    this.memberCount = this.tripMembers.length;
  }

  private loadTripMetadata(): void {
    if (!this.tripId) return;
    this.tripService.getTripById(this.tripId).subscribe({
      next: (trip: any) => {
        this.tripDetails = trip;
        this.buildTripMembers();
      },
      error: err => console.error(err)
    });
  }

  private loadAndFilterMemories(): void {
    this.memoryService.getPublicMemories().subscribe({
      next: (data: TripMemory[]) => {
        this.allMemories = data;
        const tripFiltered = this.allMemories.filter(
          m => m.tripName && m.tripName.toLowerCase() === this.selectedTripName.toLowerCase()
        );

        const sortedDefault = tripFiltered.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.startDate || '').getTime();
          const dateB = new Date(b.createdAt || b.startDate || '').getTime();
          return dateA - dateB;
        });

        const savedOrderIds = localStorage.getItem(`trip_order_${this.tripId || this.selectedTripName}`);
        
        if (savedOrderIds) {
          const idArray: string[] = JSON.parse(savedOrderIds);
          this.filteredMemories = idArray
            .map(id => sortedDefault.find(m => m.id === id || (m as any)._id === id))
            .filter(m => m !== undefined) as any[];

          const missingMemories = sortedDefault.filter(
            orig => !this.filteredMemories.some(m => m.id === orig.id || (m as any)._id === (orig as any)._id)
          );
          this.filteredMemories = [...this.filteredMemories, ...missingMemories];
        } else {
          this.filteredMemories = sortedDefault;
        }

        if (this.filteredMemories.length > 0) {
          if (!this.tripId && this.filteredMemories[0].tripId) {
            this.tripId = this.filteredMemories[0].tripId;
          }

          setTimeout(() => { this.initMap(); }, 200);
        }
      },
      error: (err: any) => { console.error('Failed to load memories:', err); }
    });
  }

  private initMap(): void {
    const mapElement = document.getElementById('leaflet-map-background');
    if (this.filteredMemories.length === 0 || !mapElement) return;

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
      attributionControl: false
    });

    this.lightTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png');
    this.darkTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png');
    
    if (this.isLightMode) {
      this.lightTileLayer.addTo(this.map);
    } else {
      this.darkTileLayer.addTo(this.map);
    }

    const latLngList = this.filteredMemories
      .filter(m => m.latitude && m.longitude)
      .map(m => L.latLng(m.latitude, m.longitude));

    this.pathLine = L.polyline(latLngList, { color: '#8b5cf6', weight: 4, dashArray: '8, 12' }).addTo(this.map);

    this.renderImageMarkers();

    const vehicleIcon = L.divIcon({
      className: 'custom-vehicle-marker',
      html: `<div class="vehicle-emoji">🚗</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
    this.vehicleMarker = L.marker([activeCoords.latitude, activeCoords.longitude], { icon: vehicleIcon, zIndexOffset: 1000 }).addTo(this.map);
  }

  private renderImageMarkers(): void {
    this.markersGroup.clearLayers();
    this.mapMarkers = [];

    this.filteredMemories.forEach((memory, idx) => {
      if (memory.latitude && memory.longitude) {
        
        const pinColor = this.getPinColor(idx);
        const locationName = memory.title ? memory.title.split(' ')[0] : 'Stop';

        const customPinIcon = L.divIcon({
          className: 'vignette-map-pin-wrapper',
          html: `
            <div class="vignette-pin-container" style="--pin-color: ${pinColor}">
              <div class="vignette-image-holder">
                <img src="${memory.imageUrl}" alt="${memory.title || 'Trip stop'}" />
              </div>
              <div class="vignette-pin-tail"></div>
              <div class="vignette-location-badge">${locationName}</div>
            </div>
          `,
          iconSize: [60, 75],
          iconAnchor: [30, 75]
        });

        const marker = L.marker([memory.latitude, memory.longitude], { icon: customPinIcon })
          .on('click', () => {
            this.setActiveIndex(idx);
            this.onReopenSlideshow(); 
          });

        this.mapMarkers.push(marker);
        this.markersGroup.addLayer(marker);
      }
    });

    this.markersGroup.addTo(this.map);
  }

  private getPinColor(index: number): string {
    const colors = ['#e11d48', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];
    return colors[index % colors.length];
  }

  downloadCurrentVideo(): void {
    const currentStop = this.filteredMemories[this.activeIndex];
    if (!currentStop || !currentStop.imageUrl) return;

    this.isDownloading = true;
    setTimeout(() => {
      window.open(currentStop.imageUrl, '_blank');
      this.isDownloading = false;
      Swal.fire({
        icon: 'success',
        title: 'Download Started',
        text: 'Your image/video is opening in a new window.',
        timer: 2000,
        showConfirmButton: false
      });
    }, 1000);
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

          // memory Cleanup
          document.body.removeChild(anchor);
          window.URL.revokeObjectURL(downloadUrl);

          await new Promise(resolve => setTimeout(resolve, 200));
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

  private animateVehicle(fromCoords: L.LatLngLiteral, toCoords: L.LatLngLiteral, duration: number = 1800): void {
    const startTime = performance.now();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.slideshowScreenRef && !this.isFullscreen) {
      this.slideshowScreenRef.nativeElement.classList.add('hide-during-move');
    }

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      
      const currentLat = fromCoords.lat + (toCoords.lat - fromCoords.lat) * progress;
      const currentLng = fromCoords.lng + (toCoords.lng - fromCoords.lng) * progress;
      
      const newPos = L.latLng(currentLat, currentLng);
      if (this.vehicleMarker) {
        this.vehicleMarker.setLatLng(newPos);
      }

      if (!this.isFullscreen && this.map) {
        this.map.setView(newPos, this.map.getZoom(), { animate: false });
      }

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(step);
      } else {
        this.animationFrameId = null;
        if (this.slideshowScreenRef) {
          this.slideshowScreenRef.nativeElement.classList.remove('hide-during-move');
        }
      }
    };

    this.animationFrameId = requestAnimationFrame(step);
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
     // if Slideshow is closed, reopen it before go to Fullscreen 
    if (!this.showCloseButton) {
      this.onReopenSlideshow();
    }

    const element = this.containerRef.nativeElement;
    if (!document.fullscreenElement) {
      element.requestFullscreen().then(() => {
        this.isFullscreen = true;
      }).catch((err: any) => console.error('Error entering fullscreen:', err));
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

  setActiveIndex(index: number): void {
    if (this.activeIndex === index || this.filteredMemories.length === 0) return;
    const oldCoords = { 
      lat: this.filteredMemories[this.activeIndex].latitude, 
      lng: this.filteredMemories[this.activeIndex].longitude 
    };
    this.activeIndex = index;
    const newCoords = { 
      lat: this.filteredMemories[this.activeIndex].latitude, 
      lng: this.filteredMemories[this.activeIndex].longitude 
    };
    
    this.animateVehicle(oldCoords, newCoords);
  }

  prevSlide(): void {
    if (this.filteredMemories.length === 0) return;
    const oldCoords = { 
      lat: this.filteredMemories[this.activeIndex].latitude, 
      lng: this.filteredMemories[this.activeIndex].longitude 
    };
    this.activeIndex = this.activeIndex === 0 ? this.filteredMemories.length - 1 : this.activeIndex - 1;
    const newCoords = { 
      lat: this.filteredMemories[this.activeIndex].latitude, 
      lng: this.filteredMemories[this.activeIndex].longitude 
    };
    
    this.animateVehicle(oldCoords, newCoords);
  }

  nextSlide(): void {
    if (this.filteredMemories.length === 0) return;
    const oldCoords = { 
      lat: this.filteredMemories[this.activeIndex].latitude, 
      lng: this.filteredMemories[this.activeIndex].longitude 
    };
    this.activeIndex = this.activeIndex === this.filteredMemories.length - 1 ? 0 : this.activeIndex + 1;
    const newCoords = { 
      lat: this.filteredMemories[this.activeIndex].latitude, 
      lng: this.filteredMemories[this.activeIndex].longitude 
    };
    
    this.animateVehicle(oldCoords, newCoords);
  }

  togglePlay(): void {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      this.playbackInterval = setInterval(() => this.nextSlide(), 5000); 
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

    const orderIds = this.filteredMemories.map(m => m.id || m._id);
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
      .filter(m => m.latitude && m.longitude)
      .map(m => L.latLng(m.latitude, m.longitude));

    this.pathLine = L.polyline(latLngList, { 
      color: '#8b5cf6', 
      weight: 4, 
      dashArray: '8, 12' 
    }).addTo(this.map);
  }
}