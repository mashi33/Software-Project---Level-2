import { Component, OnInit, OnDestroy } from '@angular/core';
import { PlacesService, PlacesResult } from '../services/places.service';
import { AuthService } from '../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

@Component({
    selector: 'app-place-card',
    imports: [CommonModule],
    templateUrl: './place-card.html',
    styleUrl: './place-card.css'
})
export class PlaceCardListComponent implements OnInit, OnDestroy {

  googleMapsApiKey: string = environment.googleMapsApiKey;

  places: any[] | null = null;

  selectedPlaceId: string | null = null;

  addedPlaceIds: Set<string> = new Set();

  toastVisible = false;

  private toastTimer: any;
  private placesSubscription: Subscription | undefined;
  private selectionSubscription: Subscription | undefined;

  showTripModal = false;
  userTrips: any[] = [];
  selectedPlace: any = null;
  isLoadingTrips = false;
  toastMessage = '';

  constructor(
    private placesService: PlacesService,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Restore previously added place IDs from local storage on startup
    const stored = localStorage.getItem('tripPlaces');
    if (stored) {
      const tripPlaces: any[] = JSON.parse(stored);
      tripPlaces.forEach(p => this.addedPlaceIds.add(p.placeId));
    }

    // Update the place card list whenever the places service emits new results
    this.placesSubscription = this.placesService.currentPlaces.subscribe((result: PlacesResult | null) => {
      this.places = result ? result.places : null;
    });

    // Highlight the selected card and scroll it into view when a place is selected
    this.selectionSubscription = this.placesService.selectedPlaceId.subscribe(id => {
      this.selectedPlaceId = id;
      if (id) this.scrollToCard(id);
    });
  }

  // Smoothly scrolls the matching place card into the center of the viewport
  scrollToCard(placeId: string) {
    setTimeout(() => {
      const element = document.getElementById('card-' + placeId);
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  // Returns true if the given place has already been added to a trip
  isAdded(placeId: string): boolean {
    return this.addedPlaceIds.has(placeId);
  }

  // Opens the trip selection modal and loads the user's trips from the API
  addToTrip(place: any) {
    // Do nothing if this place has already been added
    if (this.isAdded(place.placeId)) return;

    this.selectedPlace = place;
    this.isLoadingTrips = true;
    this.showTripModal = true;

    // Get the auth token to extract the user's email
    const token = this.authService.getToken();
    if (!token) {
      this.isLoadingTrips = false;
      return;
    }

    const decoded: any = jwtDecode(token);

    // Extract email from the .NET-style claim name, with a fallback to the standard 'email' field
    const email = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
                  decoded['email'];

    console.log('[PlaceCard] Email from token:', email);

    // Fetch all trips belonging to this user
    this.http.get<any[]>(`http://localhost:5233/api/trips/by-email/${email}`)
      .subscribe({
        next: (trips) => {
          this.userTrips = trips;
          this.isLoadingTrips = false;
          console.log('[PlaceCard] Trips loaded:', trips);
        },
        error: (err) => {
          console.error('[PlaceCard] Failed to load trips:', err);
          this.userTrips = [];
          this.isLoadingTrips = false;
        }
      });
  }

  // Saves the selected place to the chosen trip via the API
  selectTrip(trip: any) {
    if (!this.selectedPlace) return;

    // Build the place payload, with fallbacks for fields that may be null or differently cased
    const placeToSave = {
      placeId:        this.selectedPlace.placeId ?? '',
      name:           this.selectedPlace.name ?? this.selectedPlace.Name ?? 'Unknown',
      address:        this.selectedPlace.address ?? this.selectedPlace.Address ?? '',
      rating:         this.selectedPlace.rating ?? 0,
      category:       this.selectedPlace.category ?? '',
      photoReference: this.selectedPlace.photoReference ?? null
    };

    this.http.post(`http://localhost:5233/api/trips/${trip.id}/add-place`, placeToSave)
      .subscribe({
        next: () => {
          // Persist the newly added place in local storage so it survives page refreshes
          const stored = localStorage.getItem('tripPlaces');
          const tripPlaces: any[] = stored ? JSON.parse(stored) : [];
          tripPlaces.push(placeToSave);
          localStorage.setItem('tripPlaces', JSON.stringify(tripPlaces));

          // Mark this place as added so the button updates immediately
          this.addedPlaceIds.add(this.selectedPlace.placeId);

          this.closeModal();
          this.showToast(`✅ "${placeToSave.name}" added to "${trip.tripName}"!`);
        },
        error: () => {
          this.showToast('❌ Failed to add place. Try again.');
        }
      });
  }

  closeModal() {
    this.showTripModal = false;

    // Delay clearing modal data slightly to avoid a visual flicker during the close animation
    setTimeout(() => {
      this.userTrips = [];
      this.selectedPlace = null;
    }, 200);
  }

  // Displays a toast message and automatically hides it after 2.5 seconds
  showToast(message: string) {
    this.toastMessage = message;
    this.toastVisible = true;

    // Clear any existing timer before starting a new one
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastVisible = false;
    }, 2500);
  }

  ngOnDestroy() {
    // Unsubscribe from all active subscriptions and clear the toast timer to avoid memory leaks
    if (this.placesSubscription) this.placesSubscription.unsubscribe();
    if (this.selectionSubscription) this.selectionSubscription.unsubscribe();
    clearTimeout(this.toastTimer);
  }
}