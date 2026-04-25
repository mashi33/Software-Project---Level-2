import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { PlacesService, PlacesResult } from '../services/places.service';
import { environment } from '../../environments/environment';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

declare var google: any;

@Component({
  selector: 'app-map-view',
  standalone: true, // standalone true බව තහවුරු කරගන්න
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
      // වැදගත්: libraries=places එකතු කළා (Autocomplete සඳහා අත්‍යවශ්‍යයි)
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
        // සිතියම වඩාත් පිරිසිදුව පෙනීමට UI settings කිහිපයක්
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
          animation: google.maps.Animation.DROP // වැටෙන ස්වභාවයක් ලබා දීමට
        });

        // අලංකාර Custom Popup Content එක මෙතැනට
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

        marker.addListener('click', () => {
          // කලින් විවෘත කර ඇති info windows වසා දැමීමට (විකල්ප)
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