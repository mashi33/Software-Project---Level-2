import { Component, OnInit, OnDestroy } from '@angular/core';
import { PlacesService, PlacesResult } from '../services/places.service';
import { environment } from '../../environments/environment';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-place-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './place-card.html',
  styleUrl: './place-card.css',
})
export class PlaceCardListComponent implements OnInit, OnDestroy {
  googleMapsApiKey: string = environment.googleMapsApiKey;
  places: any[] | null = null;

  // Highlights සඳහා දැනට තෝරාගෙන ඇති Place ID එක
  selectedPlaceId: string | null = null;

  // Tracks which placeIds are already added (for button state)
  addedPlaceIds: Set<string> = new Set();

  // Controls the success toast visibility
  toastVisible = false;
  private toastTimer: any;

  private placesSubscription: Subscription | undefined;
  private selectionSubscription: Subscription | undefined; // Selection එක subscribe කිරීමට

  constructor(private placesService: PlacesService) {}

  ngOnInit() {
    // Load already-added place IDs from localStorage on startup
    const stored = localStorage.getItem('tripPlaces');
    if (stored) {
      const tripPlaces: any[] = JSON.parse(stored);
      tripPlaces.forEach(p => this.addedPlaceIds.add(p.placeId));
    }

    this.placesSubscription = this.placesService.currentPlaces.subscribe((result: PlacesResult | null) => {
      this.places = result ? result.places : null;
    });

    // --- අලුත් කොටස: සිතියමෙන් එන Selection එකට ඇහුම්කන් දීම ---
    this.selectionSubscription = this.placesService.selectedPlaceId.subscribe(id => {
      this.selectedPlaceId = id;
      if (id) {
        this.scrollToCard(id);
      }
    });
  }

  // අදාළ Card එක පවතින තැනට ලැයිස්තුව Scroll කිරීමට
  scrollToCard(placeId: string) {
    setTimeout(() => {
      const element = document.getElementById('card-' + placeId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  // Check if a place is already in the trip
  isAdded(placeId: string): boolean {
    return this.addedPlaceIds.has(placeId);
  }

  addToTrip(place: any) {
    if (this.isAdded(place.placeId)) return;

    const stored = localStorage.getItem('tripPlaces');
    const tripPlaces: any[] = stored ? JSON.parse(stored) : [];

    const tripItem = {
      placeId:        place.placeId,
      name:           place.name,
      address:        place.address,
      rating:         place.rating,
      priceLevel:     place.priceLevel,
      photoReference: place.photoReference,
      latitude:       place.latitude,
      longitude:      place.longitude,
      category:       place.category,
      isOpenNow:      place.isOpenNow
    };

    tripPlaces.push(tripItem);
    localStorage.setItem('tripPlaces', JSON.stringify(tripPlaces));
    this.addedPlaceIds.add(place.placeId);
    this.showToast();
  }

  showToast() {
    this.toastVisible = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastVisible = false;
    }, 2500);
  }

  ngOnDestroy() {
    if (this.placesSubscription) {
      this.placesSubscription.unsubscribe();
    }
    if (this.selectionSubscription) {
      this.selectionSubscription.unsubscribe();
    }
    clearTimeout(this.toastTimer);
  }
}