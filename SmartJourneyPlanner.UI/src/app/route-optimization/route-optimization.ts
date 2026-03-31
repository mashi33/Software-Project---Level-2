import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleMap, GoogleMapsModule } from '@angular/google-maps';
import { RouteService } from '../services/route.service';
import { environment } from '../../environments/environment';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { GenerationComponent } from '../generation/generation';

@Component({
  selector: 'app-route-optimization',
  standalone: true,
  imports: [CommonModule, FormsModule, GoogleMapsModule, GenerationComponent],
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
  selectedRouteDetails: any = null;

  private searchSubject = new Subject<{ input: string, type: 'start' | 'end' }>();
  private searchSubscription?: Subscription;

  constructor(private routeService: RouteService) {
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
      if (type === 'start') this.startSuggestions = res;
      else this.endSuggestions = res;
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
        if (type === 'start') this.startCoords = loc;
        else this.endCoords = loc;
        this.autoFitMap();
      }
    });
  }

  calculate() {
    this.routeService.getOptimizedRoutes(this.start, this.end).subscribe({
      next: (res: any) => {
        this.results = res; // ✅ Full response — fastest, scenic, cheapest all stored

        this.selectedRouteType = 'fastest';

        if (res.fastest && res.fastest.polyline) {
          this.drawPath(res.fastest.polyline);
          this.autoFitMap();
          this.updateRouteDetails('fastest', res.fastest);
        }
      },
      error: (err) => {
        if (err.status === 404) {
          Swal.fire({
            icon: 'info',
            title: 'Route not found',
            text: 'An unexpected error occurred while calculating the route. Please try again.',
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'Close'
          });
        } else {
          console.error("Error fetching routes", err);
        }
      }
    });
  }

  drawPath(encodedPoly: string) {
    if (encodedPoly) {
      const decodedPath = google.maps.geometry.encoding.decodePath(encodedPoly);
      this.currentPath = decodedPath.map(pos => ({
        lat: pos.lat(),
        lng: pos.lng()
      }));
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
          top: 50, bottom: 150, left: 50, right: 50
        });
      }
    }
  }

  onRouteSelect(routeType: string, route: any) {
    this.selectedRouteType = routeType;
    this.drawPath(route.polyline);
    this.autoFitMap();
    this.updateRouteDetails(routeType, route);
  }

  // ✅ Passes allRoutes + selectedType to PDF component
  updateRouteDetails(type: string, route: any) {
    this.selectedRouteDetails = {
      startLocation: this.start,
      endLocation:   this.end,
      selectedType:  type.toUpperCase(),

      // Selected route data — for map image
      distance: this.formatDistance(route.distance),
      duration: this.formatDuration(route.duration),
      polyline: route.polyline,
      markerString: `color:green|label:S|${this.startCoords?.lat},${this.startCoords?.lng}&markers=color:red|label:E|${this.endCoords?.lat},${this.endCoords?.lng}`,

      // Scenic viewpoints — only scenic route has these
      stops: this.results?.scenicViewpoints || [],

      // ✅ All 3 routes for comparison table
      allRoutes: {
        fastest: this.results?.fastest ? {
          distance: this.formatDistance(this.results.fastest.distance),
          duration: this.formatDuration(this.results.fastest.duration)
        } : null,
        scenic: this.results?.scenic ? {
          distance: this.formatDistance(this.results.scenic.distance),
          duration: this.formatDuration(this.results.scenic.duration)
        } : null,
        cheapest: this.results?.cheapest ? {
          distance: this.formatDistance(this.results.cheapest.distance),
          duration: this.formatDuration(this.results.cheapest.duration)
        } : null
      }
    };
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

  focusOnSpot(spot: any) {
    if (this.map && this.map.googleMap && spot.lat && spot.lng) {
      this.map.googleMap.panTo({ lat: spot.lat, lng: spot.lng });
      this.map.googleMap.setZoom(15);
      this.center = { lat: spot.lat, lng: spot.lng };
      this.zoom = 15;
    }
  }
}