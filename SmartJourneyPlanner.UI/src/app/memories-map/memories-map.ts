import { Component, OnInit, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import * as L from 'leaflet';

@Component({
  selector: 'app-memories-map',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './memories-map.html',
  styleUrls: ['./memories-map.css']
})
export class MemoriesMapComponent implements OnInit, AfterViewInit {
  private map!: L.Map;
  private markersLayer: L.LayerGroup = L.layerGroup();
  
  
  // Strict boundary for Sri Lanka
  private readonly sriLankaBounds = L.latLngBounds(
    L.latLng(5.9, 79.5), // South
    L.latLng(9.9, 82.0)  // North
  );

  private apiUrl = 'https://localhost:7001/api/memories'; 

  newMemory = { 
    title: '', 
    locationName: '', 
    imageUrl: '', 
    description: '', 
    startDate: '',
    endDate: '',
    latitude: 0, 
    longitude: 0 
  };
  
  searchQuery: string = '';
  allMemories: any[] = [];
  myRecentUploads: any[] = []; // This will display in your sidebar gallery
  selectedMemory: any | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fixLeafletIcons();
    this.loadAllMemories(); 
  }

  ngAfterViewInit(): void {
    this.initMap();
  }


  // Add this method inside your MemoriesMapComponent class
onFileSelected(event: any): void {
  const file: File = event.target.files[0];

  if (file) {
    // Check file size (optional: e.g., limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("File is too large! Please choose an image under 2MB.");
      return;
    }

    const reader = new FileReader();
    
    // This runs once the file is finished loading
    reader.onload = (e: any) => {
      // Store the base64 string in your imageUrl variable
      this.newMemory.imageUrl = e.target.result;
    };

    reader.readAsDataURL(file); // Starts the conversion process
  }
}


removeImage(fileInput: HTMLInputElement): void {
  // 1. Clear the image preview from the UI
  this.newMemory.imageUrl = '';

  // 2. Clear the actual file from the input element
  fileInput.value = '';
}

  // 1. DATA FORMATTING: Ensures consistent object keys regardless of Backend casing
  private formatData(m: any) {
    return {
      id: m.id || m._id || m.Id,
      title: m.title || m.Title || 'Untitled',
      imageUrl: m.imageUrl || m.ImageUrl || '',
      description: m.description || m.Description || '',
      latitude: Number(m.latitude || m.Latitude || 0),
      longitude: Number(m.longitude || m.Longitude || 0),
      locationName: m.locationName || m.LocationName || 'Unknown Location',
      startDate:  m.startDate, 
       endDate:  m.endDate
    };
  }

  // 2. INITIAL LOAD: Fetch data and populate both map and sidebar
  loadAllMemories() {
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.allMemories = data.map(m => this.formatData(m));
        // Fill sidebar with the 6 most recent memories
        this.myRecentUploads = [...this.allMemories].reverse();
        this.refreshMapMarkers();
      },
      error: (err) => console.error("Database connection error:", err)
    });
  }


  // NEWLY ADDED CODE PART START
showMax: number = 3;

toggleSeeMore() {
  this.showMax = (this.showMax === 3) ? this.myRecentUploads.length : 3;
}
// NEWLY ADDED CODE PART END


  // 3. SEARCH: Restricted specifically to Sri Lankan towns
  searchLocation() {
    if (!this.searchQuery) {
      alert("Please enter a city name (e.g., Kandy).");
      return;
    }

    const query = encodeURIComponent(this.searchQuery + ", Sri Lanka");
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}`;

    this.http.get<any[]>(url).subscribe({
      next: (res) => {
        if (res && res.length > 0) {
          const lat = parseFloat(res[0].lat);
          const lon = parseFloat(res[0].lon);

          if (this.sriLankaBounds.contains([lat, lon])) {
            this.newMemory.latitude = lat;
            this.newMemory.longitude = lon;
            this.newMemory.locationName = res[0].display_name;
            this.map.flyTo([lat, lon], 14);
          } else {
            alert("This location is outside of Sri Lanka.");
          }
        } else {
          alert("Location not found. Try another city.");
        }
      },
      error: () => alert("Search service is currently unavailable.")
    });
  }

  // 4. SAVE: Post to MongoDB and update UI without page refresh
  saveMemory() {
 const body = { ...this.newMemory };

 this.http.post(this.apiUrl, body).subscribe({
 next: (response: any) => {
 const savedData = this.formatData(response);
 
   // Update local arrays immediately
 this.allMemories.push(savedData);
 this.myRecentUploads.unshift(savedData);
 if(this.myRecentUploads.length > 6) this.myRecentUploads.pop(); // Keep sidebar clean
 
 this.refreshMapMarkers();

 // Reset Form
 this.newMemory = { title: '', locationName: '', imageUrl: '', description: '', startDate: '', endDate: '', latitude: 0, longitude: 0 };
 this.searchQuery = '';
 alert("Memory pinned successfully!");
 },
 error: (err) => alert("Could not save memory. Check your Backend server.")
 });
 }    

  // 5. MAP MARKERS: Redraws the icons on the map
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

  // 6. INITIALIZE: Set up Leaflet with restricted bounds
  private initMap(): void {
    this.map = L.map('map', {
      center: [7.8731, 80.7718],
      zoom: 8,
      minZoom: 8,                    // Prevents seeing other countries
      maxBounds: this.sriLankaBounds, // Panning limit
      maxBoundsViscosity: 1.0        // Elastic bounce at edges
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);

    this.markersLayer.addTo(this.map);
  }

  trackByFn(index: number, item: any) {
    return item.id || index;
  }

  private fixLeafletIcons() {
  const iconDefault = L.icon({
    // Use official Leaflet CDN links
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34], // Ensures popups open in the right spot
    shadowSize: [41, 41]
  });
  L.Marker.prototype.options.icon = iconDefault;
}


deleteMemory(id: string, event: Event) {
  // Prevent the gallery from opening the large view
  event.stopPropagation();

  if (confirm('Are you sure you want to delete this memory?')) {
    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => {
        // 1. Remove from allMemories (Map pins)
        this.allMemories = this.allMemories.filter(m => m.id !== id);
        
        // 2. Remove from myRecentUploads (Sidebar)
        this.myRecentUploads = this.myRecentUploads.filter(m => m.id !== id);
        
        // 3. Refresh the map markers
        this.refreshMapMarkers();
        
        console.log("Deleted successfully");
      },
      error: (err) => {
        console.error("Delete failed", err);
        alert("Could not delete. Check backend connection.");
      }
    });
  }
}

  @HostListener('window:viewBig', ['$event'])
  onViewBig(event: any) { 
    this.selectedMemory = event.detail; 
  }

  closeModal() {
    this.selectedMemory = null;
  }
}