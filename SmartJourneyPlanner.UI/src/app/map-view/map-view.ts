import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { PlacesService, PlacesResult } from '../services/places.service';
import { environment } from '../../environments/environment';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

// Tell TypeScript that the global `google` variable will be injected at runtime
declare var google: any;

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-view.html',
  styleUrl: './map-view.css'
})
export class MapViewComponent implements OnInit, AfterViewInit, OnDestroy {
  googleMapsApiKey: string = environment.googleMapsApiKey;

  map: any;           
  markers: any[] = []; 

  // Stored separately so we can clean it up in ngOnDestroy and avoid memory leaks
  private placesSubscription: Subscription | undefined;

  constructor(private placesService: PlacesService) {}

  ngOnInit() {
    // React to new place search results emitted by the service
    this.placesSubscription = this.placesService.currentPlaces.subscribe((result: PlacesResult | null) => {
      if (!result) return;

      // Re-center the map around the new search area only if the map is ready
      if (this.map) {
        const center = { lat: result.centerLat, lng: result.centerLon };
        this.map.setCenter(center);
        this.map.setZoom(13);
      }

      this.renderMapMarkers(result.places);
    });
  }

  ngAfterViewInit() {
    // Wait until the DOM is ready before loading Maps, so the map container element exists
    this.loadGoogleMapsScript().then(() => {
      this.initMap();
    });
  }

  loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve) => {

      // Google Maps is already loaded — nothing to do
      if (typeof google !== 'undefined' && google.maps) {
        resolve();
        return;
      }

      // Script tag exists but hasn't finished loading yet — wait for it instead of adding a duplicate
      const existingScript = document.getElementById('google-maps-script');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        return;
      }

      // First load — create the script tag and inject it into the page
      const script = document.createElement('script');
      script.id = 'google-maps-script';

      // The `callback` param tells Google Maps to call this function when it's ready
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.googleMapsApiKey}&libraries=places&callback=onGoogleMapsReady`;
      script.async = true;
      script.defer = true;

      // Expose the resolver as a global so Google Maps can trigger it via the callback URL param
      (window as any)['onGoogleMapsReady'] = () => resolve();
      document.head.appendChild(script);
    });
  }

  initMap() {
    const mapElement = document.getElementById('hotelMap');

    // Guard against re-initialization if the map was already created
    if (mapElement && !this.map) {
      const mapOptions = {
        center: { lat: 7.8731, lng: 80.7718 }, // Default center: Sri Lanka
        zoom: 8,
        mapTypeId: google.maps.MapTypeId.ROADMAP,

        // Hide controls we don't need to keep the UI clean
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      };
      this.map = new google.maps.Map(mapElement, mapOptions);
    }
  }

  renderMapMarkers(places: any[]) {
    if (!this.map) return;

    // Remove all existing markers before drawing a fresh set
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];

    if (!places || places.length === 0) return;

    places.forEach(p => {
      // Skip places with missing coordinates — they can't be plotted
      if (p.latitude && p.longitude) {
        const marker = new google.maps.Marker({
          position: { lat: p.latitude, lng: p.longitude },
          map: this.map,
          title: p.name,
          animation: google.maps.Animation.DROP // Animate markers in for visual feedback
        });

        // Build the popup HTML; skip the photo if no reference is available
        const content = `
          <div class="custom-popup" style="width:200px; font-family: sans-serif;">
            ${p.photoReference ?
              `<img src="https://maps.googleapis.com/maps/api/place/photo?maxwidth=200&photo_reference=${p.photoReference}&key=${this.googleMapsApiKey}"
                    style="width:100%; height:100px; object-fit:cover; border-radius:8px;" />` : ''
            }
            <div style="padding:10px 0 5px 0;">
              <h4 style="margin:0; font-size:14px;">${p.name}</h4>
              <p style="margin:5px 0; font-size:12px; color:#666;">${p.address}</p>
              <div style="color:#f39c12; font-weight:bold; font-size:13px;">⭐ ${p.rating}</div>
            </div>
          </div>
        `;

        const infoWindow = new google.maps.InfoWindow({ content });

        // On click: show the popup, notify the service which place is selected, and bounce the marker
        marker.addListener('click', () => {
          infoWindow.open(this.map, marker);
          this.placesService.selectPlace(p.id);
          this.animateMarker(marker);
        });

        this.markers.push(marker);
      }
    });
  }

  // Bounce the marker briefly to confirm the user's click visually
  animateMarker(marker: any) {
    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(() => marker.setAnimation(null), 1500); // Stop after 1.5s to avoid distraction
  }

  ngOnDestroy() {
    // Unsubscribe to prevent the observable from running after this component is gone
    if (this.placesSubscription) {
      this.placesSubscription.unsubscribe();
    }
  }
}