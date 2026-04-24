import { Component, OnInit, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import * as L from 'leaflet';

@Component({
  selector: 'app-community-map',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './community-map.html',
  styleUrls: ['./community-map.css']
})
export class CommunityMapComponent implements OnInit, AfterViewInit {
  private map!: L.Map;
  private markersLayer: L.LayerGroup = L.layerGroup();
  
  private readonly sriLankaBounds = L.latLngBounds(
    L.latLng(5.9, 79.5), 
    L.latLng(9.9, 82.0)
  );

  private apiUrl = 'http://localhost:5233/api/memories'; 

  // Variable names must match your HTML exactly to fix TS2339 errors
  allMemories: any[] = [];
  myRecentUploads: any[] = []; 
  
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
  private formatData(m: any) {
    return {
      id: m.id || m._id || m.Id,
      title: m.title || m.Title || 'Untitled',
      imageUrl: m.imageUrl || m.ImageUrl || '',
      description: m.description || m.Description || '',
      latitude: Number(m.latitude || m.Latitude || 0),
      longitude: Number(m.longitude || m.Longitude || 0),
      locationName: m.locationName || m.LocationName || 'Unknown Location',
      startDate: m.startDate, 
      endDate: m.endDate,
      isPublic: m.isPublic || m.IsPublic || false
    };
  }

  loadCommunityMemories() {
  this.http.get<any[]>(this.apiUrl).subscribe({
    next: (data) => {
      console.log("RAW DATA FROM API:", data); // ADD THIS LINE

      const allFormatted = data.map(m => this.formatData(m));
      console.log("FORMATTED DATA:", allFormatted); // ADD THIS LINE
      
      this.allMemories = allFormatted.filter(m => m.isPublic === true);
      console.log("FILTERED DATA:", this.allMemories); // ADD THIS LINE
      
      this.myRecentUploads = [...this.allMemories].reverse();
      this.refreshMapMarkers();
    },
    error: (err) => console.error("Database connection error:", err)
  });
}

  toggleSeeMore() {
    this.showMax = (this.showMax === 3) ? this.myRecentUploads.length : 3;
  }

  // Required by your HTML: trackBy: trackByFn
  trackByFn(index: number, item: any) {
    return item.id || index;
  }

  refreshMapMarkers() {
    this.markersLayer.clearLayers();
    this.allMemories.forEach((m) => {
      const marker = L.marker([m.latitude, m.longitude]);
      
      const popupHtml = `
        <div style="width:160px; font-family: sans-serif;">
          <h6 style="margin:0 0 5px 0; color:#0D47A1;">${m.title}</h6>
          <img src="${m.imageUrl}" style="width:100%; border-radius:4px; cursor:pointer;" 
               onclick="window.dispatchEvent(new CustomEvent('viewBig', {detail: '${m.imageUrl}'}))">
          <p style="font-size:11px; margin:5px 0; color:#666;">${m.locationName}</p>
        </div>`;
      
      marker.bindPopup(popupHtml).addTo(this.markersLayer);
    });
  }

  private initMap(): void {
    this.map = L.map('map', {
      center: [7.8731, 80.7718],
      zoom: 8,
      minZoom: 8,
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

  @HostListener('window:viewBig', ['$event'])
  onViewBig(event: any) { 
    this.selectedMemory = event.detail; 
  }

  closeModal() {
    this.selectedMemory = null;
  }
}