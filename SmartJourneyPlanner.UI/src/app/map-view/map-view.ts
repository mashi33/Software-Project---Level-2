import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { PlacesService, PlacesResult } from '../services/places.service';
import { environment } from '../../environments/environment';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

// Allows usage of the global 'google' object injected by the Maps script
declare var google: any;

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map-view.html',
  styleUrl: './map-view.css'
})
export class MapViewComponent implements OnInit, AfterViewInit, OnDestroy {
  // Google Maps API key loaded from environment config
  googleMapsApiKey: string = environment.googleMapsApiKey;

  // Reference to the Google Map instance
  map: any;

  // Keeps track of all markers currently on the map
  markers: any[] = [];

  // Holds the subscription to the places data stream
  private placesSubscription: Subscription | undefined;

  constructor(private placesService: PlacesService) {}

  ngOnInit() {
    // Listen for new places data and update the map whenever it changes
    this.placesSubscription = this.placesService.currentPlaces.subscribe((result: PlacesResult | null) => {
      if (!result) return;

      // Re-center and zoom the map to the new location if the map is ready
      if (this.map) {
        const center = { lat: result.centerLat, lng: result.centerLon };
        this.map.setCenter(center);
        this.map.setZoom(13);
      }

      // Place markers for all the returned locations
      this.renderMapMarkers(result.places);
    });
  }

  ngAfterViewInit() {
    // Load the Google Maps script first, then initialize the map
    this.loadGoogleMapsScript().then(() => {
      this.initMap();
    });
  }

  loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve) => {
      // If the Maps library is already loaded, resolve immediately
      if (typeof google !== 'undefined' && google.maps) {
        resolve();
        return;
      }

      // If the script tag already exists, just wait for it to finish loading
      if (document.getElementById('google-maps-script')) {
        (window as any)['onGoogleMapsReady'] = () => resolve();
        return;
      }

      // Create and inject the Google Maps script tag into the page
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      // 'libraries=places' is required for Autocomplete functionality
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.googleMapsApiKey}&libraries=places&callback=onGoogleMapsReady`;
      script.async = true;
      script.defer = true;

      // Resolve the promise once Google Maps signals it is ready
      (window as any)['onGoogleMapsReady'] = () => resolve();
      document.head.appendChild(script);
    });
  }

  initMap() {
    const mapElement = document.getElementById('hotelMap');

    // Only initialize the map once, using Sri Lanka's center as the default view
    if (mapElement && !this.map) {
      const mapOptions = {
        center: { lat: 7.8731, lng: 80.7718},
        zoom: 8,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        // Hide unnecessary controls for a cleaner UI
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      };
      this.map = new google.maps.Map(mapElement, mapOptions);
    }
  }

  renderMapMarkers(places: any[]) {
    // Do nothing if the map is not ready yet
    if (!this.map) return;

    // Remove all existing markers from the map before adding new ones
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];

    if (!places || places.length === 0) return;

    places.forEach(p => {
      // Only add a marker if the place has valid coordinates
      if (p.latitude && p.longitude) {
        const marker = new google.maps.Marker({
          position: { lat: p.latitude, lng: p.longitude },
          map: this.map,
          title: p.name,
          // Markers animate by dropping into place when first added
          animation: google.maps.Animation.DROP
        });

        // Build the popup content, including a photo if one is available
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

        const infoWindow = new google.maps.InfoWindow({
          content: content
        });

        // When a marker is clicked: open its info popup, select the place, and bounce the marker
        marker.addListener('click', () => {
          infoWindow.open(this.map, marker);
          
          // Notify the service that this place is now selected
          this.placesService.selectPlace(p.id);
          this.animateMarker(marker);
        });

        this.markers.push(marker);
      }
    });
  }

  animateMarker(marker: any) {
    // Briefly bounce the marker, then stop after 1.5 seconds
    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(() => marker.setAnimation(null), 1500);
  }

  ngOnDestroy() {
    // Clean up the subscription when the component is destroyed to avoid memory leaks
    if (this.placesSubscription) {
      this.placesSubscription.unsubscribe();
    }
  }
}