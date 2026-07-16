import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router,RouterLink,ActivatedRoute  } from '@angular/router';
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
    imports: [CommonModule, FormsModule, RouterLink, GoogleMapsModule, GenerationComponent],
    templateUrl: './route-optimization.html',
    styleUrl: './route-optimization.css'
})
export class RouteOptimization implements OnInit, OnDestroy {
  @ViewChild(GoogleMap, { static: false }) map!: GoogleMap;

  start = '';
  end = '';
  startSuggestions: any[] = [];
  endSuggestions: any[] = [];
  results: any = null;
  currentPath: any[] = [];
  isLoading = false;
  apiLoaded = false;

  showTraffic = false;

  center: google.maps.LatLngLiteral = { lat: 7.8731, lng: 80.7718 };
  zoom = 8;

  startCoords: google.maps.LatLngLiteral | null = null;
  endCoords: google.maps.LatLngLiteral | null = null;

  selectedRouteType: string = 'fastest';
  selectedRouteDetails: any = null;

    // ✅ Custom marker options — any type used to avoid deprecated MarkerOptions warning
  startMarkerOptions: any = {};
  endMarkerOptions: any = {};

  // ✅ Scenic pin — created ONCE in initMarkerOptions(), reused via [content]="scenicPinElement"
  scenicPinElement!: HTMLElement;

  // Pre-computed distance cache — avoids O(n) recalculation on every render cycle
  // Key: "lat_lng", Value: formatted distance string
  private distanceCache = new Map<string, string>();

  private searchSubject = new Subject<{ input: string, type: 'start' | 'end' }>();
  private searchSubscription?: Subscription;

  /**
   * Sets up a debounced search stream to avoid firing API calls on every keystroke.
   */
  constructor(private routeService: RouteService, private router: Router, private route: ActivatedRoute) {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(
        (prev, curr) => prev.input === curr.input && prev.type === curr.type)
    ).subscribe(({ input, type }) => {
      this.performSearch(input, type);
    });
  }

   /**
   * Loads the Google Maps API and auto-fills start/end from query params if present.
   */
    ngOnInit() {
      this.loadGoogleApi();

      this.route.queryParams.subscribe(params => {
        const startParam = params['start'];
        const endParam   = params['end'];

        if (startParam) this.start = startParam;
        if (endParam)   this.end   = endParam;

        if (startParam && endParam) {
          this.waitForGoogleThenCalculate();
        }
      });
    }

    private waitForGoogleThenCalculate(): void {
      if ((window as any).google) {
        this.getCoords(this.start, 'start');
        this.getCoords(this.end, 'end');
        setTimeout(() => this.calculate(), 1000);
      } else {
        setTimeout(() => this.waitForGoogleThenCalculate(), 300);
      }
    }

    

  /** Cleans up the search subscription when the component is destroyed. */
  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }
  /** Navigates to the explore page. */
   goToExplore() {
    this.router.navigate(['/explore']);
  }

  /**
   * Dynamically injects the Google Maps script if it hasn't been loaded yet.
   * Includes the Places and Geometry libraries needed for autocomplete and distance calculations.
   */
  loadGoogleApi() {
    if (!(window as any).google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places,geometry`;
      script.onload = () => {
        this.apiLoaded = true;
        this.routeService.refreshSessionToken();
        this.initMarkerOptions();
      };
      document.head.appendChild(script);
    } else {
      this.apiLoaded = true;
      this.initMarkerOptions();
    }
  }
   /**
   * ✅ Initializes custom colored map markers for start and end points.
   * Called only after Google Maps API is fully loaded.
   * Uses google.maps.SymbolPath.CIRCLE to avoid deprecated Marker warning.
   */
  private initMarkerOptions(): void {
    // Start pin — App blue (#1a56db) with white 'A' label
    this.startMarkerOptions = {
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#1a56db',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 10
      },
      label: {
        text: 'S',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '13px'
      }
    };

    // End pin — Red (#ef4444) with white 'B' label
    this.endMarkerOptions = {
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#ef4444',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 10
      },
      label: {
        text: 'E',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '13px'
      }
    };
    const pin = document.createElement('div');
    pin.style.cssText = `
      width: 14px;
      height: 14px;
      background-color: #f59e0b;
      border: 2px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      cursor: pointer;
  `;
  this.scenicPinElement = pin;
    
  }

  

  toggleTraffic() {
    this.showTraffic = !this.showTraffic;
  }

   /**
   * Pushes the user's input into the debounced search stream.
   * Clears suggestions if input is too short.
   */
  search(type: 'start' | 'end') {
    const input = type === 'start' ? this.start : this.end;
    if (input && input.length > 2) {
      this.searchSubject.next({ input, type });
    } else {
      if (type === 'start') this.startSuggestions = [];
      else this.endSuggestions = [];
    }
  }

  /** Fetches place predictions from Google and updates the suggestion list. */
  performSearch(input: string, type: 'start' | 'end') {
    this.routeService.getPredictions(input).then((res: any) => {
      if (type === 'start') this.startSuggestions = res;
      else this.endSuggestions = res;
    });
  }

  /**
   * Fills the input field with the selected place, clears suggestions,
   * fetches its coordinates, and refreshes the session token.
   */
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

  /** Geocodes a plain address string into lat/lng coordinates and updates the map bounds. */
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

  /**
   * Calls the backend to fetch optimized routes, draws the fastest route by default,
   * and pre-computes viewpoint distances once both the path and viewpoints are ready.
   */
  calculate() {
    this.isLoading = true;
    this.routeService.getOptimizedRoutes(this.start, this.end).subscribe({
      next: (res: any) => {
        this.results = res;
        this.selectedRouteType = 'fastest';

        if (res.fastest && res.fastest.polyline) {
          this.drawPath(res.fastest.polyline);
          this.autoFitMap();
          this.updateRouteDetails('fastest', res.fastest);
          this.isLoading = false;
        }

        // FIX 6: Pre-compute distances after BOTH path and viewpoints are loaded
        // drawPath() alone may pre-compute before results arrive on first load
        // This guarantees viewpoints exist when pre-computation runs
        if (res.scenicViewpoints?.length > 0
          && this.currentPath.length > 0
          && this.apiLoaded) {
          this.preComputeDistances(res.scenicViewpoints);
        }
      },
      error: (err) => {
        this.isLoading = false;
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

  /**
   * Decodes an encoded polyline string into lat/lng points and updates the current path.
   * Also triggers distance pre-computation for scenic viewpoints if already available.
   */
  drawPath(encodedPoly: string) {
    if (encodedPoly && window['google'] && google.maps.geometry) {
      const decodedPath = google.maps.geometry.encoding.decodePath(encodedPoly);
      this.currentPath = decodedPath.map(pos => ({
        lat: pos.lat(),
        lng: pos.lng()
      }));

      // Clear stale distances from previous route
      this.distanceCache.clear();

      // Pre-compute distances if viewpoints already loaded
      // (handles route switching after initial load)
      if (this.results?.scenicViewpoints?.length > 0 && this.apiLoaded) {
        this.preComputeDistances(this.results.scenicViewpoints);
      }
    } else {
      console.warn("Google Maps Geometry library not loaded yet.");
    }
  }

  // Pre-compute all POI distances once — results cached in distanceCache map
  // Called from both calculate() and drawPath() to cover all timing scenarios
  private preComputeDistances(viewpoints: any[]): void {
    if (!this.apiLoaded || !(window as any).google) return;

    viewpoints.forEach(spot => {
      const key = `${spot.lat}_${spot.lng}`;
      if (!this.distanceCache.has(key)) {
        this.distanceCache.set(key, this.computeDistance(spot.lat, spot.lng));
      }
    });
  }

  // Core distance compute — called once per POI, result cached
  private computeDistance(pointLat: number, pointLng: number): string {
    if (!this.currentPath || this.currentPath.length === 0) return 'N/A';
    if (!this.apiLoaded || !(window as any).google) return 'N/A';

    try {
      const viewpoint = new google.maps.LatLng(pointLat, pointLng);
      let minDistance = Infinity;

      // Find the closest point on the route to this viewpoint
      this.currentPath.forEach(pathPoint => {
        const dist = google.maps.geometry.spherical.computeDistanceBetween(
          new google.maps.LatLng(pathPoint.lat, pathPoint.lng),
          viewpoint
        );
        if (dist < minDistance) minDistance = dist;
      });

      // Guard against Infinity — currentPath had no valid points
      if (!isFinite(minDistance)) return 'N/A';

      return minDistance > 1000
        ? (minDistance / 1000).toFixed(1) + ' km from route'
        : Math.round(minDistance) + ' m from route';
    } catch {
      return 'N/A';
    }
  }

  // Template calls this — returns cached value instantly (no recalculation per render)
  calculateDistanceFromRoute(pointLat: number, pointLng: number): string {
    const key = `${pointLat}_${pointLng}`;

    // Return cached value if available — O(1) lookup
    if (this.distanceCache.has(key)) {
      return this.distanceCache.get(key)!;
    }

    // Compute and cache on demand — fallback for late-loaded spots
    if (this.currentPath.length > 0 && this.apiLoaded) {
      const result = this.computeDistance(pointLat, pointLng);
      this.distanceCache.set(key, result);
      return result;
    }

    return 'N/A';
  }

   /** Adjusts the map viewport to fit the start point, end point, and full route path. */
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

   /** Redraws the map path and updates route details when the user switches route types. */
  onRouteSelect(routeType: string, route: any) {
    this.selectedRouteType = routeType;
    this.drawPath(route.polyline);
    this.autoFitMap();
    this.updateRouteDetails(routeType, route);
  }

  
  /**
   * Builds the selectedRouteDetails object passed to the PDF generation component.
   * Includes the selected route, all three route options for comparison, and viewpoint distances.
   */
  updateRouteDetails(type: string, route: any) {
    this.selectedRouteDetails = {
      startLocation: this.start,
      endLocation:   this.end,
      selectedType:  type.toUpperCase(),

      distance: this.formatDistance(route.distance),
      duration: this.formatDuration(route.duration),
      polyline: route.polyline,
      markerString: `color:green|label:S|${this.startCoords?.lat},` +
                    `${this.startCoords?.lng}&markers=color:red|label:E|` +
                    `${this.endCoords?.lat},${this.endCoords?.lng}`,

      // ✅ Calculate real distance from route for each spot
    stops: (this.results?.scenicViewpoints || []).map((spot: any) => ({
      ...spot,
      distanceFromRoute: this.calculateDistanceFromRoute(spot.lat, spot.lng)
    })),
    
      // ✅ All 3 routes for comparison table
      allRoutes: {
        fastest: this.results?.fastest ? {
          distance: this.formatDistance(this.results.fastest.distance),
          duration: this.formatDuration(this.results.fastest.duration),
          petrolCost: this.results.fastest.estimatedPetrolCost ?? null, // ✅
          dieselCost: this.results.fastest.estimatedDieselCost ?? null  // ✅
        } : null,
        scenic: this.results?.scenic ? {
          distance: this.formatDistance(this.results.scenic.distance),
          duration: this.formatDuration(this.results.scenic.duration),
          petrolCost: this.results.scenic.estimatedPetrolCost ?? null,  // ✅
          dieselCost: this.results.scenic.estimatedDieselCost ?? null   // ✅
        } : null,
        cheapest: this.results?.cheapest ? {
          distance: this.formatDistance(this.results.cheapest.distance),
          duration: this.formatDuration(this.results.cheapest.duration),
          petrolCost: this.results.cheapest.estimatedPetrolCost ?? null, // ✅
          dieselCost: this.results.cheapest.estimatedDieselCost ?? null  // ✅
        } : null
      }
    };
  }

  /** Converts a distance string in metres to a readable km string. */
  formatDistance(meters: string): string {
    if (!meters) return '0 km';
    const m = parseFloat(meters.replace('m', ''));
    return (m / 1000).toFixed(1) + ' km';
  }

  /** Converts a duration string in seconds to a readable hours and minutes format. */
  formatDuration(duration: string): string {
    if (!duration) return 'N/A';
    const seconds = parseInt(duration.replace('s', ''));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} mins`;
  }

  /** Returns a Material icon name based on keywords found in the viewpoint's name. */
  getIconName(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('mountain') || n.includes('peak') || n.includes('rock')) return 'terrain';
    if (n.includes('forest') || n.includes('park') || n.includes('garden')) return 'park';
    if (n.includes('waterfall') || n.includes('lake') || n.includes('river')
      || n.includes('fall')) return 'waves';
    if (n.includes('temple') || n.includes('kovil') || n.includes('shrine')
      || n.includes('viharaya')) return 'account_balance';
    if (n.includes('museum') || n.includes('gallery')) return 'museum';
    if (n.includes('fort') || n.includes('castle') || n.includes('palace')) return 'castle';
    return 'explore';
  }

  /** Pans the map to a scenic viewpoint and zooms in for a closer look. */
  focusOnSpot(spot: any) {
    if (this.map && this.map.googleMap && spot.lat && spot.lng) {
      this.map.googleMap.panTo({ lat: spot.lat, lng: spot.lng });
      this.map.googleMap.setZoom(15);
      this.center = { lat: spot.lat, lng: spot.lng };
      this.zoom = 15;
    }
  }
}