import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { PlacesService, PlacesResult } from '../services/places.service';
import { environment } from '../../environments/environment';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

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
  private placesSubscription: Subscription | undefined;

  constructor(private placesService: PlacesService) {}

  ngOnInit() {
    this.placesSubscription = this.placesService.currentPlaces.subscribe((result: PlacesResult | null) => {
      if (!result) return;

      if (this.map) {
        const center = { lat: result.centerLat, lng: result.centerLon };
        this.map.setCenter(center);
        this.map.setZoom(13);
      }

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

      // ✅ Fix 1: Already fully loaded - resolve වහාම
      if (typeof google !== 'undefined' && google.maps) {
        resolve();
        return;
      }

      // ✅ Fix 2: Script tag exist නමුත් තවම load වෙමින් පවතී
      // load event listen කරන්න, නැවත script add නොකරන්න
      const existingScript = document.getElementById('google-maps-script');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        return;
      }

      // ✅ Fix 3: Script නැත - නව script එකක් add කරන්න
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.googleMapsApiKey}&libraries=places&callback=onGoogleMapsReady`;
      script.async = true;
      script.defer = true;

      (window as any)['onGoogleMapsReady'] = () => resolve();
      document.head.appendChild(script);
    });
  }

  initMap() {
    const mapElement = document.getElementById('hotelMap');

    if (mapElement && !this.map) {
      const mapOptions = {
        center: { lat: 7.8731, lng: 80.7718 },
        zoom: 8,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      };
      this.map = new google.maps.Map(mapElement, mapOptions);
    }
  }

  renderMapMarkers(places: any[]) {
    if (!this.map) return;

    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];

    if (!places || places.length === 0) return;

    places.forEach(p => {
      if (p.latitude && p.longitude) {
        const marker = new google.maps.Marker({
          position: { lat: p.latitude, lng: p.longitude },
          map: this.map,
          title: p.name,
          animation: google.maps.Animation.DROP
        });

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

        marker.addListener('click', () => {
          infoWindow.open(this.map, marker);
          this.placesService.selectPlace(p.id);
          this.animateMarker(marker);
        });

        this.markers.push(marker);
      }
    });
  }

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