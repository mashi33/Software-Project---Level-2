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

  isLoading = false;
  skeletonItems = Array(5);

  private placesSubscription: Subscription | undefined;
  private selectionSubscription: Subscription | undefined;
  private loadingSubscription: Subscription | undefined;

  constructor(
    private placesService: PlacesService,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.placesSubscription = this.placesService.currentPlaces.subscribe((result: PlacesResult | null) => {
      this.places = result ? result.places : null;
    });

    this.selectionSubscription = this.placesService.selectedPlaceId.subscribe(id => {
      this.selectedPlaceId = id;
      if (id) this.scrollToCard(id);
    });

    this.loadingSubscription = this.placesService.isLoading$.subscribe(loading => {
      this.isLoading = loading;
    });
  }

  scrollToCard(placeId: string) {
  setTimeout(() => {
    // NOTE: card id = "card-" + place.id (MongoDB _id)
    const element = document.getElementById('card-' + placeId);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
}

  // ✅ BUG 1 FIX — placeId + tripId combination check
  isAlreadyAddedToTrip(placeId: string, tripId: string): boolean {
    const stored = localStorage.getItem('tripPlaces');
    if (!stored) return false;
    const tripPlaces: any[] = JSON.parse(stored);
    return tripPlaces.some(p => p.placeId === placeId && p.tripId === tripId);
  }

  async addToTrip(place: any) {
    const token = this.authService.getToken();
    if (!token) {
      Swal.fire({
        icon: 'warning',
        title: 'Not logged in',
        text: 'Please log in to add places to a trip.',
      });
      return;
    }

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

          let selectedTripId: string | undefined;

          await Swal.fire({
            title: 'Select a Trip',
            html: `
              <div id="custom-trip-list" style="display:flex; flex-direction:column; gap:10px; max-height:360px; overflow-y:auto; padding:4px 2px;">
                ${trips.map(trip => {
                  const start = new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const end = new Date(trip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  return `
                    <label class="custom-trip-item" data-id="${trip.id}" style="
                      display:flex; align-items:center; gap:14px;
                      padding:14px 16px; border-radius:12px;
                      border:2px solid #eee; cursor:pointer;
                      background:#fff; transition:all 0.2s;
                      text-align:left;
                    ">
                      <div class="custom-radio" style="
                        width:20px; height:20px; border-radius:50%;
                        border:2px solid #ccc; flex-shrink:0;
                        display:flex; align-items:center; justify-content:center;
                        transition:all 0.2s;
                      "></div>
                      <div style="flex:1;">
                        <div style="font-size:15px; font-weight:700; color:#1a1a2e;">${trip.tripName}</div>
                        <div style="font-size:12px; color:#888; margin-top:3px;">
                          📍 ${trip.destination} &nbsp;|&nbsp; 🗓️ ${start} – ${end}
                        </div>
                      </div>
                    </label>
                  `;
                }).join('')}
              </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Add to Trip',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#4A90D9',
            width: 500,
            padding: '32px',
            didOpen: () => {
              // ✅ BUG 3 FIX — avoid duplicate style injection
              if (!document.getElementById('swal-trip-select-style')) {
                const style = document.createElement('style');
                style.id = 'swal-trip-select-style';
                style.textContent = `
                  .swal2-popup { border-radius: 20px !important; }
                  .swal2-title {
                    font-size: 20px !important;
                    font-weight: 700 !important;
                    color: #1a1a2e !important;
                    padding-bottom: 16px !important;
                    border-bottom: 1px solid #f0f0f0 !important;
                    margin-bottom: 4px !important;
                  }
                  #custom-trip-list::-webkit-scrollbar { width: 5px; }
                  #custom-trip-list::-webkit-scrollbar-track { background: #f5f5f5; border-radius:10px; }
                  #custom-trip-list::-webkit-scrollbar-thumb { background: #ddd; border-radius:10px; }
                  .custom-trip-item:hover {
                    border-color: #4A90D9 !important;
                    background: #f0f7ff !important;
                  }
                  .custom-trip-item.selected {
                    border-color: #4A90D9 !important;
                    background: #eef6ff !important;
                  }
                  .custom-trip-item.selected .custom-radio {
                    border-color: #4A90D9 !important;
                    background: #4A90D9 !important;
                  }
                  .custom-trip-item.selected .custom-radio::after {
                    content: '';
                    width: 8px; height: 8px;
                    border-radius: 50%;
                    background: white;
                    display: block;
                  }
                  .swal2-actions { gap: 12px !important; margin-top: 24px !important; }
                  .swal2-confirm {
                    border-radius: 10px !important;
                    padding: 12px 32px !important;
                    font-size: 15px !important;
                    font-weight: 600 !important;
                    box-shadow: 0 4px 12px rgba(74,144,217,0.3) !important;
                  }
                  .swal2-cancel {
                    border-radius: 10px !important;
                    padding: 12px 32px !important;
                    font-size: 15px !important;
                    font-weight: 600 !important;
                    background: #f0f0f0 !important;
                    color: #666 !important;
                  }
                  .swal2-cancel:hover { background: #e0e0e0 !important; }
                  .swal2-validation-message { border-radius: 8px !important; }
                `;
                document.head.appendChild(style);
              }

              document.querySelectorAll('.custom-trip-item').forEach(item => {
                item.addEventListener('click', () => {
                  document.querySelectorAll('.custom-trip-item').forEach(i => i.classList.remove('selected'));
                  item.classList.add('selected');
                  (document.querySelector('.swal2-popup') as any).__selectedTripId = (item as HTMLElement).dataset['id'];
                });
              });
            },
            preConfirm: () => {
              const id = (document.querySelector('.swal2-popup') as any).__selectedTripId;
              if (!id) {
                Swal.showValidationMessage('Please select a trip!');
                return false;
              }
              return id;
            }
          }).then(result => {
            selectedTripId = result.value;
          });

          if (selectedTripId) {
            // ✅ BUG 1 FIX — block duplicate addition to the same trip
            const alreadyAdded = this.isAlreadyAddedToTrip(place.placeId, selectedTripId);
            if (alreadyAdded) {
              Swal.fire({
                icon: 'info',
                title: 'Already Added!',
                html: `<p style="color:#555; font-size:15px; margin:0;">
                  <strong>${place.name}</strong> is already in this trip.
                </p>`,
                confirmButtonColor: '#4A90D9',
                position: 'center',
                width: 400,
                padding: '32px',
                showClass: { popup: 'swal2-show' },
                hideClass: { popup: 'swal2-hide' },
                customClass: { popup: 'info-popup' },
                didOpen: () => {
                  if (!document.getElementById('swal-info-style')) {
                    const style = document.createElement('style');
                    style.id = 'swal-info-style';
                    style.textContent = `.info-popup { border-radius: 16px !important; }`;
                    document.head.appendChild(style);
                  }
                }
              });
              return;
            }

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
          const stored = localStorage.getItem('tripPlaces');
          const tripPlaces: any[] = stored ? JSON.parse(stored) : [];

          // ✅ BUG 4 FIX — now save tripId with place to avoid duplicates across trips
          tripPlaces.push({ ...placeToSave, tripId: trip.id });
          localStorage.setItem('tripPlaces', JSON.stringify(tripPlaces));

          Swal.fire({
            icon: 'success',
            title: 'Place Added!',
            html: `<p style="color:#555; font-size:15px; margin:0;">
              <strong>${placeToSave.name}</strong> added to <strong>${trip.tripName}</strong>
            </p>`,
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true,
            position: 'center',
            showClass: { popup: 'swal2-show' },
            hideClass: { popup: 'swal2-hide' },
            width: 400,
            padding: '32px',
            customClass: { popup: 'success-popup' },
            didOpen: () => {
              // ✅ BUG 3 FIX
              if (!document.getElementById('swal-success-style')) {
                const style = document.createElement('style');
                style.id = 'swal-success-style';
                style.textContent = `
                  .success-popup { border-radius: 16px !important; }
                  .swal2-success-ring { border-color: #4A90D9 !important; }
                  .swal2-success-line-tip,
                  .swal2-success-line-long { background-color: #4A90D9 !important; }
                  .swal2-timer-progress-bar { background: #4A90D9 !important; }
                `;
                document.head.appendChild(style);
              }
            }
          });
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Failed to Add!',
            html: `<p style="color:#555; font-size:15px; margin:0;">
              Could not add <strong>${placeToSave.name}</strong> to the trip. Please try again.
            </p>`,
            showConfirmButton: true,
            confirmButtonText: 'OK',
            confirmButtonColor: '#4A90D9',
            position: 'center',
            showClass: { popup: 'swal2-show' },
            hideClass: { popup: 'swal2-hide' },
            width: 400,
            padding: '32px',
            customClass: { popup: 'error-popup' },
            didOpen: () => {
              // ✅ BUG 3 FIX
              if (!document.getElementById('swal-error-style')) {
                const style = document.createElement('style');
                style.id = 'swal-error-style';
                style.textContent = `.error-popup { border-radius: 16px !important; }`;
                document.head.appendChild(style);
              }
            }
          });
        }
      });
  }

  ngOnDestroy() {
    if (this.placesSubscription) this.placesSubscription.unsubscribe();
    if (this.selectionSubscription) this.selectionSubscription.unsubscribe();
    if (this.loadingSubscription) this.loadingSubscription.unsubscribe();
  }
}