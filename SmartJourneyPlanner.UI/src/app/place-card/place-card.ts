import { Component, OnInit, OnDestroy } from '@angular/core';
import { PlacesService, PlacesResult } from '../services/places.service';
import { AuthService } from '../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import Swal from 'sweetalert2';

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
  addedPlaceIds: Set<string> = new Set(); // Tracks already-added places to prevent duplicates

  private placesSubscription: Subscription | undefined;
  private selectionSubscription: Subscription | undefined;

  constructor(
    private placesService: PlacesService,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Restore previously added places from storage so the UI reflects the correct state on reload
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

  // Small delay gives the DOM time to render the card before scrolling to it
  scrollToCard(placeId: string) {
    setTimeout(() => {
      const element = document.getElementById('card-' + placeId);
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  isAdded(placeId: string): boolean {
    return this.addedPlaceIds.has(placeId);
  }

  async addToTrip(place: any) {
    if (this.isAdded(place.placeId)) return;

    const token = this.authService.getToken();
    if (!token) {
      Swal.fire({
        icon: 'warning',
        title: 'Not logged in',
        text: 'Please log in to add places to a trip.',
      });
      return;
    }

    // Extract email from JWT — the claim key varies by identity provider
    const decoded: any = jwtDecode(token);
    const email = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
                  decoded['email'];

    Swal.fire({
      title: 'Loading your trips...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    this.http.get<any[]>(`http://localhost:5233/api/trips/by-email/${email}`)
      .subscribe({
        next: async (trips) => {

          if (trips.length === 0) {
            Swal.fire({
              icon: 'info',
              title: 'No Trips Found',
              text: 'Please create a trip first!',
            });
            return;
          }

          // Format each trip as a readable label for the radio selection dialog
          const tripOptions: Record<string, string> = {};
          trips.forEach(trip => {
            const start = new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const end = new Date(trip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            tripOptions[trip.id] = `${trip.tripName} — 📍${trip.destination} | 🗓️ ${start} – ${end}`;
          });

          // Inject custom styles at runtime because SweetAlert2 radio buttons can't be styled via CSS alone
          const { value: selectedTripId } = await Swal.fire({
            title: 'Select a Trip',
            input: 'radio',
            inputOptions: tripOptions,
            inputValidator: (value) => {
              if (!value) return 'Please select a trip!';
              return null;
            },
            showCancelButton: true,
            confirmButtonText: 'Add to Trip',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#4A90D9',
            customClass: {
              input: 'swal-trip-radio-group'
            },
            didOpen: () => {
              const style = document.createElement('style');
              style.textContent = `
                .swal-trip-radio-group {
                  display: flex !important;
                  flex-direction: column !important;
                  gap: 10px !important;
                  text-align: left !important;
                  width: 100% !important;
                }
                .swal2-radio {
                  display: flex !important;
                  flex-direction: column !important;
                  gap: 10px !important;
                  width: 100% !important;
                }
                .swal2-radio label {
                  display: flex !important;
                  align-items: flex-start !important;
                  gap: 10px !important;
                  padding: 10px 14px !important;
                  border: 1px solid #e0e0e0 !important;
                  border-radius: 8px !important;
                  cursor: pointer !important;
                  font-size: 14px !important;
                  transition: background 0.2s !important;
                }
                .swal2-radio label:hover {
                  background: #f0f7ff !important;
                  border-color: #4A90D9 !important;
                }
                .swal2-radio input[type="radio"]:checked + span {
                  font-weight: 600 !important;
                  color: #4A90D9 !important;
                }
              `;
              document.head.appendChild(style);
            }
          });

          if (selectedTripId) {
            const selectedTrip = trips.find(t => t.id == selectedTripId);
            this.selectTrip(place, selectedTrip);
          }
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load trips. Try again.',
          });
        }
      });
  }

  selectTrip(place: any, trip: any) {
    // Normalize field names since the API response casing can be inconsistent
    const placeToSave = {
      placeId:        place.placeId ?? '',
      name:           place.name ?? place.Name ?? 'Unknown',
      address:        place.address ?? place.Address ?? '',
      rating:         place.rating ?? 0,
      category:       place.category ?? '',
      photoReference: place.photoReference ?? null
    };

    this.http.post(`http://localhost:5233/api/trips/${trip.id}/add-place`, placeToSave)
      .subscribe({
        next: () => {
          // Keep localStorage in sync so the added state persists across page reloads
          const stored = localStorage.getItem('tripPlaces');
          const tripPlaces: any[] = stored ? JSON.parse(stored) : [];
          tripPlaces.push(placeToSave);
          localStorage.setItem('tripPlaces', JSON.stringify(tripPlaces));

          this.addedPlaceIds.add(place.placeId);

          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `"${placeToSave.name}" added to "${trip.tripName}"!`,
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true,
          });
        },
        error: () => {
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: 'Failed to add place. Try again.',
            showConfirmButton: false,
            timer: 2500,
          });
        }
      });
  }

  ngOnDestroy() {
    if (this.placesSubscription) this.placesSubscription.unsubscribe();
    if (this.selectionSubscription) this.selectionSubscription.unsubscribe();
  }
}