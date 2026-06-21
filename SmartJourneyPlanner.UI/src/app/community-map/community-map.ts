import { Component, OnInit, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule,Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import * as L from 'leaflet';
import {MemoryService} from '../services/memory';
import { TripMemory } from '../models/memory.model';
import { AuthService } from '../services/auth.service';
import 'leaflet.markercluster';

@Component({
  selector: 'app-community-map',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './community-map.html',
  styleUrls: ['./community-map.css']
})
export class CommunityMapComponent implements OnInit, AfterViewInit {
  private map!: L.Map;
    private markersLayer = (L as any).markerClusterGroup({
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div class="custom-cluster-icon"><span>${count}</span></div>`,
          className: 'my-cluster-wrapper',
          iconSize: L.point(40, 40)
        });
      }
    });
  
  private readonly sriLankaBounds = L.latLngBounds(
    L.latLng(5.0, 78.0), 
    L.latLng(10.5, 83.5)
  );

  public searchQuery: string = '';
  public allMemories: TripMemory[] = [];
  public filteredMemories: TripMemory[] = [];
  public selectedMemory: TripMemory | null = null;
  public showMax: number = 3;

  constructor(private readonly memoryService: MemoryService, private readonly authService: AuthService,private readonly location: Location) {}

  ngOnInit(): void {
    this.fixLeafletIcons();
    this.loadCommunityMemories(); 
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  // ADD THIS EXACT METHOD INSIDE THE CLASS:
  public isObject(val: unknown): boolean {
    return val !== null && typeof val === 'object';
  }

  // Matches the naming used in your memories-map for consistency
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
      isPublic: memory.isPublic || memory.IsPublic || false,
      likeCount: memory.likeCount || memory.LikeCount || 0,
      likedByUsers: memory.likedByUsers || memory.LikedByUsers || []
    };
  }

  private sortMemoriesByLikesAndDate(memoriesArray: TripMemory[]): TripMemory[] {
    const now = new Date().getTime();

    return [...memoriesArray].sort((a, b) => {
      // 1. මතකයන් දෙක අප්ලෝඩ් කර ඇති පැය ගණන සෙවීම (Age in Hours)
      const dateA = a.startDate ? new Date(a.startDate).getTime() : now;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : now;
      
      const ageInHoursA = Math.max(0.1, (now - dateA) / (1000 * 60 * 60));
      const ageInHoursB = Math.max(0.1, (now - dateB) / (1000 * 60 * 60));

      // 2. ලයික් ප්‍රමාණය ලබා ගැනීම (ලයික් නැති ඒවට අවස්ථාවක් දීමට මූලිකව +1 කරයි)
      const scoreA = ((a.likeCount || 0) + 1) / (ageInHoursA + 2);
      const scoreB = ((b.likeCount || 0) + 1) / (ageInHoursB + 2);

      // වැඩිම ලකුණ ඇති මතකය මුලටම පැමිණේ (Descending Order)
      return scoreB - scoreA;
    });
  }

  goBack(): void {
  this.location.back();
}

  public loadCommunityMemories(): void {
    this.memoryService.getPublicMemories().subscribe({
      next: (data: TripMemory[]) => {
        this.allMemories = data.filter(m => m.isPublic);
        this.filteredMemories = this.sortMemoriesByLikesAndDate(this.allMemories);
        this.refreshMapMarkers(this.filteredMemories); 
      },
      error: (err: unknown) => console.error('Failed to load community memories:', err)
    });
  }

  public toggleSeeMore(): void {
    this.showMax = (this.showMax === 3) ? this.filteredMemories.length : 3;
  }

  public trackByFn(index: number, item: TripMemory): string | number {
    return item.id || index;
  }
  
  public filterMemories(): void {
    if (!this.searchQuery?.trim()) {
      this.filteredMemories = this.sortMemoriesByLikesAndDate(this.allMemories);
    } else {
      const query = this.searchQuery.toLowerCase().trim();
      const matched = this.allMemories.filter(m => m.locationName.toLowerCase().includes(query));
      this.filteredMemories = this.sortMemoriesByLikesAndDate(matched);
    }
    this.refreshMapMarkers(this.filteredMemories);
  }

  private refreshMapMarkers(memories: TripMemory[]): void {
    this.markersLayer.clearLayers();

    memories.forEach((memory) => {
      if (!memory.latitude || !memory.longitude) return;

      const iconConfig = this.getMarkerIconConfiguration(memory.likeCount);
      const customIcon = L.icon({
        iconUrl: iconConfig.url,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: iconConfig.size,
        iconAnchor: iconConfig.anchor,
        popupAnchor: [1, -34],
        shadowSize: iconConfig.size
      });

      const marker = L.marker([memory.latitude, memory.longitude], { icon: customIcon });
      const popupHtml = this.generatePopupHtml(memory);

      marker
        .bindPopup(popupHtml)
        .on('popupopen', (e: L.LeafletEvent) => {
          const popupEl = e.target.getPopup().getElement();
          
          popupEl?.querySelector('.view-big-image')?.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('viewBig', { detail: memory })); 
          });

          popupEl?.querySelector('.popup-like-btn')?.addEventListener('click', () => {
            if (memory.id) this.toggleLike(memory.id);
          });
        })
        this.markersLayer.addLayer(marker);
    });
  }

  private getMarkerIconConfiguration(likeCount: number): { url: string, size: [number, number], anchor: [number, number] } {
    if (likeCount > 20) {
      return {
        url: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
        size: [42, 62],
        anchor: [21, 62]
      };
    } else if (likeCount > 5) {
      return {
        url: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        size: [35, 52],
        anchor: [17, 52]
      };
    }
    return {
      url: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      size: [25, 41],
      anchor: [12, 41]
    };
  }

  private generatePopupHtml(memory: TripMemory): string {
    return `
      <div class="popup-container">
        <h6 class="popup-title">${memory.title}</h6>
        <img src="${memory.imageUrl}" class="popup-image view-big-image" style="cursor:pointer;" />
        <p class="popup-location"><i class="bi bi-geo-alt-fill me-2 text-danger"></i> ${memory.locationName}</p>
        <div class="popup-like-section">
          <button class="popup-like-btn">
          <svg class="thumbs-up-icon" viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M23,10C23,8.89 22.11,8 21,8H14.68L15.64,3.43C15.66,3.33 15.67,3.22 15.67,3.11C15.67,2.7 15.5,2.32 15.23,2.05L14.17,1L7.59,7.58C7.22,7.95 7,8.45 7,9V19A2,2 0 0,0 9,21H18C18.83,21 19.54,20.5 19.84,19.78L22.86,12.73C22.95,12.5 23,12.26 23,12V10M1,9V21H5V9H1Z" />
            </svg> 
          Like (<span class="like-num">${memory.likeCount}</span>)</button>
        </div>
      </div>
    `;
  }

    private initMap(): void {
      this.map = L.map('map', {
        center: [7.8731, 80.7718],
        zoom: 8,
        minZoom: 7,
        maxBounds: this.sriLankaBounds,
        maxBoundsViscosity: 1.0
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);

    this.markersLayer.addTo(this.map);
  }

    private fixLeafletIcons() {
      const iconDefault = L.icon({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
      L.Marker.prototype.options.icon = iconDefault;
  }

  // පැරාමීටර් එක Event ලෙස ගෙන ඇතුළතදී CustomEvent ලෙස පාවිච්චි කළා
  @HostListener('window:viewBig', ['$event'])
  public onViewBig(event: Event): void { 
    const customEvent = event as CustomEvent<TripMemory>;
    if (customEvent.detail) {
      this.selectedMemory = customEvent.detail; 
    }
  }

  closeModal() {
    this.selectedMemory = null;
  }

  /**
   * 🗺️ ලයික් බටන් එක ක්ලික් කළ විට ක්‍රියාත්මක වන සම්පූර්ණ මෙතඩ් එක
   */
  public toggleLike(memoryId: string | undefined, event?: Event): void {
    if (event) { 
      event.stopPropagation(); // Gallery Card එක ක්ලික් වීම වළක්වයි
    }
    
    // 🛡️ Safe Check: memoryId එකක් නැත්නම් මෙතනින්ම නවත්වනවා
    if (!memoryId) {
      console.warn('Cannot toggle like: Memory ID is undefined.');
      return;
    }

    // 🔐 1. AuthService එක හරහා සැබෑවටම ලොග් වී සිටින පරිශීලකයාගේ ID එක සජීවීව ලබා ගැනීම
    // 💡 සටහන: ඔයාගේ AuthService එකේ User ID එක ගන්න තියෙන මෙතඩ් එකේ නම (උදා: getUserId() හෝ userId) මෙතනට ආදේශ කරන්න.
    const currentUserId = this.authService.getUserId(); 

    // 🛡️ යූසර් කෙනෙක් ලොග් වෙලාම නැත්නම් ලයික් කරන්න ඉඩ නොදී Warn කිරීම
    if (!currentUserId) {
      console.warn('User must be logged in to like a memory.');
      // ඔයාට අවශ්‍ය නම් මෙතනදී Toast Message එකක් හෝ Login Page එකට Redirect කිරීමක් කළ හැක
      return;
    }

    // 2. 🌐 Backend API එක හරහා Database (MongoDB) එක Update කිරීමට සර්විස් එක කැඳවීම
    this.memoryService.toggleLike(memoryId, currentUserId).subscribe({
      next: (updatedMemory: TripMemory) => {
        // Angular UI එකේ තියෙන ලිස්ට් (Gallery/Sidebar) වල අගයන් Update කිරීම
        this.updateLocalMemoryState(memoryId, updatedMemory);
        
        // 📍 සිතියම මත දැනට ඇරලා තියෙන Leaflet Popup එකේ Like Count එක සජීවීව සකස් කිරීම
        const popupLikeNum = document.querySelector('.like-num');
        if (popupLikeNum) {
          popupLikeNum.textContent = updatedMemory.likeCount.toString();
        }
      },
      error: (err: unknown) => console.error('Failed to toggle like interaction:', err)
    });
  }

  /**
   * 🔄 Frontend එක ඇතුළේ ඇති දත්ත ලැයිස්තු (State) සජීවීව යාවත්කාලීන කරන පුද්ගලික මෙතඩ් එක
   */
  private updateLocalMemoryState(memoryId: string, updatedMemory: TripMemory): void {
    // Array එකක් ඇතුළේ අදාළ මතකය සොයා එය අලුත් දත්ත වලින් ප්‍රතිස්ථාපනය කරන ශ්‍රිතය
    const updateIndex = (list: TripMemory[]) => {
      const idx = list.findIndex(m => m.id === memoryId);
      if (idx !== -1) {
        list[idx] = updatedMemory;
      }
    };

    // ප්‍රධාන ලිස්ට් දෙකම Update කිරීම
    updateIndex(this.allMemories);
    updateIndex(this.filteredMemories);

    // 📊 අලුත් ලයික් අගය අනුව මුළු ලිස්ට් එකම අපේ Exponential Time-Decay ඇල්ගොරිතමයෙන් නැවත පෙළගැස්වීම
    this.filteredMemories = this.sortMemoriesByLikesAndDate(this.filteredMemories);
    
    // 📍 සිතියම මත ඇති මාකර්ස් (Markers) වල දත්ත අලුත් කිරීම
    this.refreshMapMarkers(this.filteredMemories);
    
    // 🔍 දැනට Lightbox Overlay එක විවෘතව ඇත්නම් එහි ඇති දත්තද යාවත්කාලීන කිරීම
    if (this.selectedMemory?.id === memoryId) {
      this.selectedMemory = updatedMemory;
    }
  }
  }
