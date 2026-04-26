import { Component, OnInit, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import * as Leaflet from 'leaflet';

@Component({
  selector: 'app-community-map',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './community-map.html',
  styleUrls: ['./community-map.css']
})
export class CommunityMapComponent implements OnInit, AfterViewInit {
  private map!: L.Map;
  private markersLayer: L.LayerGroup = Leaflet.layerGroup();
  
  private readonly sriLankaBounds = Leaflet.latLngBounds(
    Leaflet.latLng(5.0, 78.0), 
    Leaflet.latLng(10.5, 83.5)
  );

   // Centralized endpoint so backend URL changes don't affect multiple places
  private apiUrl = 'http://localhost:5233/api/memories'; 

  searchQuery: string = '';
  allMemories: any[] = [];
  myRecentUploads: any[] = []; 
  filteredMemories: any[] = [];
  
  selectedMemory: any | null = null;
  showMax: number = 3;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fixLeafletIcons();
    this.loadCommunityMemories(); 
  }

  ngAfterViewInit(): void {
    this.initMap();
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
      isPublic: memory.isPublic || memory.IsPublic || false
    };
  }

  loadCommunityMemories() {
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (data) => {
        const allFormatted = data.map(memory => this.formatData(memory));
        this.allMemories = allFormatted.filter(memory => memory.isPublic === true);
        
        // Initialize filtered list with all memories
        this.filteredMemories = [...this.allMemories].reverse();
    
        this.refreshMapMarkers(this.filteredMemories); // Pass the list
      }
    });
  }

  toggleSeeMore() {
    this.showMax = (this.showMax === 3) ? this.filteredMemories.length : 3;
  }

  // Helps Angular reuse DOM elements efficiently instead of re-rendering entire lists
  trackByFn(index: number, item: any) {
    return item.id || index;
  }

  filterMemories() {
    if (!this.searchQuery || this.searchQuery.trim() === '') {
    this.filteredMemories = [...this.allMemories];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredMemories = this.allMemories.filter(memory => 
        memory.locationName.toLowerCase().includes(query)
      );
    }
    // Ensures map markers reflect filtered results instead of original dataset
    this.refreshMapMarkers(this.filteredMemories);
  }

  refreshMapMarkers(memories: any[]) {
    // Clearing prevents duplicate markers when filtering or reloading
    this.markersLayer.clearLayers();
    memories.forEach((memory) => {
      const marker = Leaflet.marker([memory.latitude, memory.longitude]);
      
      const popupHtml = `
        <div style="width:160px; font-family: sans-serif;">
          <h6 style="margin:0 0 5px 0; color:#0D47A1;">${memory.title}</h6>
          <img src="${memory.imageUrl}" style="width:100%; border-radius:4px; cursor:pointer;" 
               onclick="window.dispatchEvent(new CustomEvent('viewBig', {detail: '${memory.imageUrl}'}))">
          <p style="font-size:11px; margin:5px 0; color:#666;">${memory.locationName}</p>
        </div>`;
      
      marker.bindPopup(popupHtml).addTo(this.markersLayer);
    });
  }

    private initMap(): void {
      this.map = Leaflet.map('map', {
        center: [7.8731, 80.7718],
        zoom: 8,
        minZoom: 7,
        maxBounds: this.sriLankaBounds,
        maxBoundsViscosity: 1.0
    });

    Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);

    this.markersLayer.addTo(this.map);
  }

    private fixLeafletIcons() {
      const iconDefault = Leaflet.icon({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
      Leaflet.Marker.prototype.options.icon = iconDefault;
  }

  @HostListener('window:viewBig', ['$event'])
  onViewBig(event: any) { 
    this.selectedMemory = event.detail; 
  }

  closeModal() {
    this.selectedMemory = null;
  }
}