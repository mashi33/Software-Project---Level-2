import { Component, OnInit, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import * as leaflet from 'leaflet';

@Component({
    selector: 'app-memories-map',
    imports: [CommonModule, FormsModule,],
    templateUrl: './memories-map.html',
    styleUrls: ['./memories-map.css']
})
export class MemoriesMapComponent implements OnInit, AfterViewInit {
  private map!: leaflet.Map;
  private markersLayer: leaflet.LayerGroup = leaflet.layerGroup();
  
  
  private readonly sriLankaBounds = leaflet.latLngBounds(
    leaflet.latLng(5.9, 79.5), 
    leaflet.latLng(9.9, 82.0)  
  );

  private apiUrl = 'http://localhost:5233/api/memories'; 

  visibilityStatus: string = 'public'; 

  newMemory = { 
    title: '', 
    locationName: '', 
    imageUrl: '', 
    description: '', 
    startDate: '',
    endDate: '',
    latitude: 0, 
    longitude: 0,
    isPublic: true
  };
  
  searchQuery: string = '';
  allMemories: any[] = [];
  myRecentUploads: any[] = []; 
  selectedMemory: any | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fixLeafletIcons();
    this.loadAllMemories(); 
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

onFileSelected(event: any): void {
  const file: File = event.target.files[0];

  if (file) {
    if (file.size > 2 * 1024 * 1024) {
      alert("File is too large! Please choose an image under 2MB.");
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (event: any) => {
      this.newMemory.imageUrl = event.target.result;
    };

    reader.readAsDataURL(file); 
  }
}


removeImage(fileInput: HTMLInputElement): void {
  this.newMemory.imageUrl = '';

  fileInput.value = '';
}

  private formatData(memory: any) {
    return {
      id: memory.id || memory._id || memory.Id,
      title: memory.title || memory.Title || 'Untitled',
      imageUrl: memory.imageUrl || memory.ImageUrl || '',
      description: memory.description || memory.Description || '',
      latitude: Number(memory.latitude || memory.Latitude || 0),
      longitude: Number(memory.longitude || memory.Longitude || 0),
      locationName: memory.locationName || memory.LocationName || 'Unknown Location',
      startDate:  memory.startDate, 
       endDate:  memory.endDate,
       isPublic: memory.isPublic || memory.IsPublic || false
    };
  }

  loadAllMemories() {
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.allMemories = data.map(memory => this.formatData(memory));
        this.myRecentUploads = [...this.allMemories].reverse();
        this.refreshMapMarkers();
      },
      error: (err) => console.error("Database connection error:", err)
    });
  }

showMax: number = 3;

toggleSeeMore() {
  this.showMax = (this.showMax === 3) ? this.myRecentUploads.length : 3;
}

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
            // Smooth transition improves UX when focusing on selected location
            this.map.flyTo([lat, lon], 14);
          } else {
            alert("This location is outside of Sri Lanka.");
          }
        } else {
          alert("Location not found. Try another city.");
        }
      },
      error: () => alert("Searching for your location.")
    });
  }

  saveMemory() {
    this.newMemory.isPublic = (this.visibilityStatus === 'public');
 const body = { 
    ...this.newMemory, 
    isPublic: this.newMemory.isPublic 
  };
 this.http.post(this.apiUrl, body).subscribe({
 next: (response: any) => {
 const savedData = this.formatData(response);
 
 this.allMemories.push(savedData);
 this.myRecentUploads.unshift(savedData);
 if(this.myRecentUploads.length > 6) this.myRecentUploads.pop(); 

 if (savedData.isPublic) {
          console.log("This will be visible on the Community Map");
      }
 
 this.refreshMapMarkers();

 // Reset form state after successful save to prevent duplicate submissions
 this.newMemory = { title: '', locationName: '', imageUrl: '', description: '', startDate: '', endDate: '', latitude: 0, longitude: 0,isPublic: true };
 this.visibilityStatus = 'public';
 this.searchQuery = '';
 alert("Memory pinned successfully!");
 },
 error: (err) => alert("Could not save memory. Check your Backend server.")
 });
 }    

  private getPopupHtml(memory: any): string {
    return `
      <div class="popup-container">
        <h6 class="popup-title">${memory.title}</h6>

        <img src="${memory.imageUrl}" 
             class="popup-image view-big-image"
             data-img="${memory.imageUrl}" />

        <p class="popup-location">${memory.locationName}</p>
      </div>
    `;
  }

  refreshMapMarkers() {
    this.markersLayer.clearLayers();

    this.allMemories.forEach((memory) => {

      const marker = leaflet.marker([memory.latitude, memory.longitude]);

      const popupHtml = this.getPopupHtml(memory);

      marker
        .bindPopup(popupHtml)
        // Waits for the popup to load because the HTML doesn't exist until then.
        .on('popupopen', (e: any) => {
          const popupEl = e.popup.getElement();
          const img = popupEl.querySelector('.view-big-image');

          img?.addEventListener('click', () => {
            // Broadcasts an event to trigger image viewing without tying it to the map.
            window.dispatchEvent(
              new CustomEvent('viewBig', {
                detail: memory.imageUrl
              })
            );
          });
        })
        .addTo(this.markersLayer);
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
  }

  trackByFn(index: number, item: any) {
    return item.id || index;
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


deleteMemory(id: string, event: Event) {
  // Prevent the gallery from opening the large view
  event.stopPropagation();

  if (confirm('Are you sure you want to delete this memory?')) {
    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => {
        // 1. Remove from allMemories (Map pins)
        this.allMemories = this.allMemories.filter(memory => memory.id !== id);
        
        // 2. Remove from myRecentUploads (Sidebar)
        this.myRecentUploads = this.myRecentUploads.filter(memory => memory.id !== id);
        
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
    // Stores selected image for modal/lightbox display
    this.selectedMemory = event.detail; 
  }

  closeModal() {
    this.selectedMemory = null;
  }
}