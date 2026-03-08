import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleMap, GoogleMapsModule } from '@angular/google-maps';
import { RouteService } from '../services/route.service';
import { environment } from '../../environments/environment';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-route-optimization',
  standalone: true,
  imports: [CommonModule, FormsModule, GoogleMapsModule],
  templateUrl: './route-optimization.html',
  styleUrl: './route-optimization.css',
})
export class RouteOptimization implements OnInit, OnDestroy {
  @ViewChild(GoogleMap, { static: false }) map!: GoogleMap;

  start = ''; 
  end = '';
  startSuggestions: any[] = [];
  endSuggestions: any[] = [];
  results: any = null;
  currentPath: any[] = [];
  apiLoaded = false;
  
  showTraffic = false;

  center: google.maps.LatLngLiteral = { lat: 7.8731, lng: 80.7718 }; 
  zoom = 8;

  startCoords: google.maps.LatLngLiteral | null = null;
  endCoords: google.maps.LatLngLiteral | null = null;
  
  selectedRouteType: string = 'fastest';

  // Quota පාලනය සඳහා අලුතින් එක් කළ විචල්‍යයන්
  private searchSubject = new Subject<{ input: string, type: 'start' | 'end' }>();
  private searchSubscription?: Subscription;

  constructor(private routeService: RouteService) {
    // සෙවුම් වාර ගණන සීමා කිරීම (Debouncing logic)
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(500), 
      distinctUntilChanged((prev, curr) => prev.input === curr.input && prev.type === curr.type)
    ).subscribe(({ input, type }) => {
      this.performSearch(input, type);
    });
  }

  ngOnInit() { 
    this.loadGoogleApi(); 
  }

  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  loadGoogleApi() {
    if (!(window as any).google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places,geometry`;
      script.onload = () => { 
        this.apiLoaded = true; 
        this.routeService.refreshSessionToken(); 
      };
      document.head.appendChild(script);
    } else { 
      this.apiLoaded = true; 
    }
  }

  toggleTraffic() {
    this.showTraffic = !this.showTraffic;
  }

  search(type: 'start' | 'end') {
    const input = type === 'start' ? this.start : this.end;
    if (input && input.length > 2) { 
      this.searchSubject.next({ input, type });
    } else {
      if (type === 'start') this.startSuggestions = [];
      else this.endSuggestions = [];
    }
  }

  performSearch(input: string, type: 'start' | 'end') {
    this.routeService.getPredictions(input).then((res: any) => {
      if (type === 'start') {
        this.startSuggestions = res;
      } else {
        this.endSuggestions = res;
      }
    });
  }

  selectPlace(place: any, type: 'start' | 'end') {
    if (type === 'start') { 
      this.start = place.description; 
      this.startSuggestions = []; 
      this.getCoords(this.start, 'start');
    } else { 
      this.end = place.description; 
      this.endSuggestions = []; 
      this.getCoords(this.end, 'end');
    }
    this.routeService.refreshSessionToken();
  }

  getCoords(address: string, type: 'start' | 'end') {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: address }, (results, status) => {
      if (status === 'OK' && results![0]) {
        const loc = results![0].geometry.location.toJSON();
        if (type === 'start') {
          this.startCoords = loc;
        } else {
          this.endCoords = loc;
        }
        this.autoFitMap();
      }
    });
  }

  calculate() {
    this.routeService.getOptimizedRoutes(this.start, this.end).subscribe((res: any) => {
      this.results = res;
      this.selectedRouteType = 'fastest'; 
      
      if (res.fastest && res.fastest.polyline) {
        this.drawPath(res.fastest.polyline);
        this.autoFitMap();
      }
    });
  }

  drawPath(encodedPoly: string) {
    if (encodedPoly) {
      const decodedPath = google.maps.geometry.encoding.decodePath(encodedPoly);
      this.currentPath = decodedPath.map(pos => {
        return { lat: pos.lat(), lng: pos.lng() };
      });
    }
  }

  autoFitMap() {
    if (this.startCoords || this.endCoords) {
      const bounds = new google.maps.LatLngBounds();
      
      if (this.startCoords) bounds.extend(this.startCoords);
      if (this.endCoords) bounds.extend(this.endCoords);
      
      if (this.currentPath.length > 0) {
        this.currentPath.forEach(point => bounds.extend(point));
      }

      if (this.map && this.map.googleMap) {
        this.map.googleMap.fitBounds(bounds, {
          top: 50,
          bottom: 150,
          left: 50,
          right: 50
        });
      }
    }
  }

  onRouteSelect(routeType: string, polyline: string) {
    this.selectedRouteType = routeType;
    this.drawPath(polyline);
    this.autoFitMap();
  }

  formatDistance(meters: string): string {
    if (!meters) return '0 km';
    const m = parseFloat(meters.replace('m', ''));
    return (m / 1000).toFixed(1) + ' km';
  }

  formatDuration(duration: string): string {
    if (!duration) return 'N/A';
    const seconds = parseInt(duration.replace('s', ''));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} mins`;
  }

  getIconName(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('mountain') || n.includes('peak') || n.includes('rock')) return 'terrain';
    if (n.includes('forest') || n.includes('park') || n.includes('garden')) return 'park';
    if (n.includes('waterfall') || n.includes('lake') || n.includes('river') || n.includes('fall')) return 'waves';
    if (n.includes('temple') || n.includes('kovil') || n.includes('shrine') || n.includes('viharaya')) return 'account_balance';
    if (n.includes('museum') || n.includes('gallery')) return 'museum';
    if (n.includes('fort') || n.includes('castle') || n.includes('palace')) return 'castle';
    return 'explore';
  }

  calculateDistanceFromRoute(pointLat: number, pointLng: number): string {
    if (!this.currentPath || this.currentPath.length === 0 || !this.apiLoaded) return '';
    const viewpoint = new google.maps.LatLng(pointLat, pointLng);
    let minDistance = Infinity;
    this.currentPath.forEach(pathPoint => {
      const dist = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(pathPoint.lat, pathPoint.lng), 
        viewpoint
      );
      if (dist < minDistance) minDistance = dist;
    });
    return minDistance > 1000 
      ? (minDistance / 1000).toFixed(1) + ' km' 
      : Math.round(minDistance) + ' m';
  }

  /**
   * Scenic spot එකක් හෝ card එකක් ක්ලික් කළ විට සිතියම එම ස්ථානයට යොමු කිරීමට.
   * සිතියමේ center සහ zoom අගයන් යාවත්කාලීන කරයි.
   */
  focusOnSpot(spot: any) {
    if (this.map && this.map.googleMap && spot.lat && spot.lng) {
      // ස්ථානය වෙත සුමටව සිතියම රැගෙන යයි
      this.map.googleMap.panTo({ lat: spot.lat, lng: spot.lng });
      // පැහැදිලිව පෙනීම සඳහා Zoom මට්ටම වැඩි කරයි
      this.map.googleMap.setZoom(15);
      
      // Class properties ද යාවත්කාලීන කරයි (for consistency)
      this.center = { lat: spot.lat, lng: spot.lng };
      this.zoom = 15;
    }
  }
} 