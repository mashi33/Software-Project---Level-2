import { Component, OnInit, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import * as leaflet from 'leaflet';

@Component({
    selector: 'app-memories-map',
    standalone: true,
    imports: [CommonModule, HttpClientModule, FormsModule],
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
  allTrips: any[] = [];
selectedTrip: any = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fixLeafletIcons();
    this.loadMyMemories(); 
    this.loadAccessibleTrips();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  // Type checker helper function for HTML template validation
  isObject(val: any): boolean {
    return val !== null && typeof val === 'object';
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

// In your Angular service or component
loadAccessibleTrips() {
  const token = localStorage.getItem('token');
  const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

  // This one call gets both "Created by me" and "Member of"
  this.http.get<any[]>(`http://localhost:5233/api/trips/user-accessible`, { headers })
    .subscribe({
      next: (data) => {
        // 'data' now contains all trips the user is authorized to see
        this.allTrips = data; 
        console.log("Combined list of trips:", this.allTrips);
      },
      error: (err) => console.error("Error fetching trips:", err)
    });
}

// Handler for the select dropdown
onTripChange(event: any) {
    const tripId = event.target.value;
    // Find the trip based on the id
    this.selectedTrip = this.allTrips.find(t => t.id == tripId);
    
    // Debug to ensure selectedTrip is being set correctly
    console.log("Selected Trip Object:", this.selectedTrip);
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
       isPublic: memory.isPublic || memory.IsPublic || false,
       likeCount: memory.likeCount || 0
    };
  }
  


  loadMyMemories() {
    const userId = localStorage.getItem('userId');
    this.http.get<any[]>(`${this.apiUrl}/user/${userId}`).subscribe({
        next: (data) => {
            this.allMemories = data.map(m => this.formatData(m));
            this.myRecentUploads = [...this.allMemories].reverse();

            this.refreshMapMarkers();
        }
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

    const userId = localStorage.getItem('userId'); // Retrieve logged-in ID
    
    if (!userId) {
        alert("Please log in to save memories");
        return;
    }

    if (!this.newMemory.startDate || !this.newMemory.endDate) {
    alert("Please select both start and end dates");
    return;
  }

  const start = new Date(this.newMemory.startDate);
  const end = new Date(this.newMemory.endDate);

  if (end < start) {
    alert("End date cannot be before start date");
    return;
  }
  
    this.newMemory.isPublic = (this.visibilityStatus === 'public');
 const body = { 
    ...this.newMemory,
    userId: userId, 
    isPublic: this.newMemory.isPublic, 
    tripId: this.selectedTrip?.id || null,
        tripName: this.selectedTrip?.name || null
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
    if (!memory) return '<div class="popup-container">No data available</div>';
    // Public නම් විතරක් Like Count එක පෙන්වන කොටස සෑදීම
  const likeHtml = memory.isPublic 
    ? `<div style="margin-top: 8px; font-weight: bold; color: #145dbf;">
    <svg class="thumbs-up-icon" viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M23,10C23,8.89 22.11,8 21,8H14.68L15.64,3.43C15.66,3.33 15.67,3.22 15.67,3.11C15.67,2.7 15.5,2.32 15.23,2.05L14.17,1L7.59,7.58C7.22,7.95 7,8.45 7,9V19A2,2 0 0,0 9,21H18C18.83,21 19.54,20.5 19.84,19.78L22.86,12.73C22.95,12.5 23,12.26 23,12V10M1,9V21H5V9H1Z" />
            </svg> 
    ${memory.likeCount || 0}</div>` 
    : '';
    return `
      <div class="popup-container">
        <h6 class="popup-title">${memory.title || 'Untitled'}</h6>

        <img src="${memory.imageUrl}" 
             class="popup-image view-big-image"
             data-img="${memory.imageUrl}" />

        <p class="popup-location">
        <i class="bi bi-geo-alt-fill me-2 text-danger"></i>${memory.locationName || 'Unknown'}
      </p>
        ${likeHtml}
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
                detail: memory.id
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



  // ==========================================
  // HIGHLIGHTED CHANGE: Look up full object from URL
  // ==========================================
  @HostListener('window:viewBig', ['$event'])
  onViewBig(event: any) { 
    const memoryId = event.detail;
    
    // Attempt to locate the full descriptive object using the matching URL string
    const foundMemory = this.allMemories.find(m => m.id === memoryId);
    
    if (foundMemory) {
      // Open the modal with all information available
      this.selectedMemory = foundMemory; 
    } else {
      // Fallback if the collection doesn't contain the element
      console.error("Memory not found for ID:", memoryId);
    }
  }
  closeModal() {
    this.selectedMemory = null;
  }
}