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

  // Modal සඳහා නව variables
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
    const stored = localStorage.getItem('tripPlaces');
    if (stored) {
      const tripPlaces: any[] = JSON.parse(stored);
      tripPlaces.forEach(p => this.addedPlaceIds.add(p.placeId));
    }

    this.placesSubscription = this.placesService.currentPlaces.subscribe((result: PlacesResult | null) => {
      this.places = result ? result.places : null;
    });

    this.selectionSubscription = this.placesService.selectedPlaceId.subscribe(id => {
      this.selectedPlaceId = id;
      if (id) this.scrollToCard(id);
    });
  }

  scrollToCard(placeId: string) {
    setTimeout(() => {
      const element = document.getElementById('card-' + placeId);
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  isAdded(placeId: string): boolean {
    return this.addedPlaceIds.has(placeId);
  }

  // "+ Add to Trip" button click කළ විට modal එක open කිරීම
  addToTrip(place: any) {
    if (this.isAdded(place.placeId)) return;

    this.selectedPlace = place;
    this.isLoadingTrips = true;
    this.showTripModal = true;

    // JWT token එකෙන් email ලබාගැනීම
    const token = this.authService.getToken();
    if (!token) {
      this.isLoadingTrips = false;
      return;
    }

    const decoded: any = jwtDecode(token);
    // නිවැරදි .NET claim name එක භාවිතා කිරීම
    const email = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
                  decoded['email'];

    console.log('[PlaceCard] Email from token:', email);

    // User ගේ email මගින් trips ලබාගැනීම
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

  // User trip එකක් select කළ විට place එක save කිරීම
  selectTrip(trip: any) {
    if (!this.selectedPlace) return;

    const placeToSave = {
      placeId:        this.selectedPlace.placeId ?? '',
      // FIX: name null විය හැකි නිසා fallback add කිරීම
      name:           this.selectedPlace.name ?? this.selectedPlace.Name ?? 'Unknown',
      address:        this.selectedPlace.address ?? this.selectedPlace.Address ?? '',
      rating:         this.selectedPlace.rating ?? 0,
      category:       this.selectedPlace.category ?? '',
      photoReference: this.selectedPlace.photoReference ?? null
    };

    this.http.post(`http://localhost:5233/api/trips/${trip.id}/add-place`, placeToSave)
      .subscribe({
        next: () => {
          // LocalStorage update කිරීම
          const stored = localStorage.getItem('tripPlaces');
          const tripPlaces: any[] = stored ? JSON.parse(stored) : [];
          tripPlaces.push(placeToSave);
          localStorage.setItem('tripPlaces', JSON.stringify(tripPlaces));
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
    // FIX: setTimeout — Angular flicker වළක්වා ගැනීමට
    setTimeout(() => {
      this.userTrips = [];
      this.selectedPlace = null;
    }, 200);
  }

  showToast(message: string) {
    this.toastMessage = message;
    this.toastVisible = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastVisible = false;
    }, 2500);
  }

  ngOnDestroy() {
    if (this.placesSubscription) this.placesSubscription.unsubscribe();
    if (this.selectionSubscription) this.selectionSubscription.unsubscribe();
    clearTimeout(this.toastTimer);
  }
}