import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { PlacesService, PlacesResult } from '../services/places.service';
import { environment } from '../../environments/environment';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

declare var google: any;

@Component({
    selector: 'app-map-view',
    imports: [CommonModule],
    templateUrl: './map-view.html',
    styleUrl: './map-view.css'
})
export class MapViewComponent implements OnInit, AfterViewInit, OnDestroy {
  googleMapsApiKey: string = environment.googleMapsApiKey;
  map: any;
  markers: any[] = [];
  private placesSubscription: Subscription | undefined;

  constructor(private placesService: PlacesService) {}

  ngOnInit() {
    this.placesSubscription = this.placesService.currentPlaces.subscribe((result: PlacesResult | null) => {
      if (!result) return;

      // FIX: Pan the map to the geocoded city center
      if (this.map) {
        const center = { lat: result.centerLat, lng: result.centerLon };
        this.map.setCenter(center);
        this.map.setZoom(13);
      }

      // FIX: Render markers for the new results
      this.renderMapMarkers(result.places);
    });
  }

  ngAfterViewInit() {
    this.loadGoogleMapsScript().then(() => {
      this.initMap();
    });
  }

  loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof google !== 'undefined' && google.maps) {
        resolve();
        return;
      }

      if (document.getElementById('google-maps-script')) {
        (window as any)['onGoogleMapsReady'] = () => resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.googleMapsApiKey}&callback=onGoogleMapsReady`;
      script.async = true;
      script.defer = true;

      (window as any)['onGoogleMapsReady'] = () => resolve();
      document.head.appendChild(script);
    });
  }

  initMap() {
    const mapElement = document.getElementById('hotelMap');
    if (mapElement && !this.map) {
      // Start at a neutral Sri Lanka center — map will pan to the searched city automatically
      const mapOptions = {
        center: { lat: 7.8731, lng: 80.7718 }, // Sri Lanka center
        zoom: 8,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      };
      this.map = new google.maps.Map(mapElement, mapOptions);
    }
  }

  renderMapMarkers(places: any[]) {
    if (!this.map) return;

    // Clear existing markers first
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];

    if (!places || places.length === 0) return;

    places.forEach(p => {
      if (p.latitude && p.longitude) {
        const marker = new google.maps.Marker({
          position: { lat: p.latitude, lng: p.longitude },
          map: this.map,
          title: p.name
        });

        // Show place name popup on marker click
        const infoWindow = new google.maps.InfoWindow({
          content: `<div style="font-weight:600">${p.name}</div>
                    <div style="font-size:0.85rem;color:#666">${p.address}</div>
                    <div style="color:#f39c12">⭐ ${p.rating}</div>`
        });

        marker.addListener('click', () => {
          infoWindow.open(this.map, marker);
          
          // --- අලුත් කොටස: Marker එකක් ක්ලික් කළ විට Card එක Highlight කිරීමට ---
          this.placesService.selectPlace(p.id); 
          this.animateMarker(marker);
        });

        this.markers.push(marker);
      }
    });
  }

  // Marker එක Bounce කර පරිශීලකයාට පෙන්වීමට
  animateMarker(marker: any) {
    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(() => marker.setAnimation(null), 1500);
  }

  ngOnDestroy() {
    if (this.placesSubscription) {
      this.placesSubscription.unsubscribe();
    }
  }
}