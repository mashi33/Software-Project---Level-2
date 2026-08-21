import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PlacesService } from '../services/places.service';
import { FilterComponent } from '../filter/filter';
import { MapViewComponent } from '../map-view/map-view';
import { PlaceCardListComponent } from '../place-card/place-card';

@Component({
  selector: 'app-hotel-restaurant-finder',
  imports: [
    CommonModule,
    FilterComponent,
    MapViewComponent,
    PlaceCardListComponent
  ],
  templateUrl: './hotel-restaurant-finder.html',
  styleUrl: './hotel-restaurant-finder.css'
})
export class HotelRestaurantFinder implements OnInit {

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private placesService: PlacesService
  ) {}

  // ✅ NEW — when arrive the page previous data cleared
  ngOnInit() {
    this.placesService.clearPlaces();
  }

  onQuickCitySearch(city: string) {
  // TODO: wire this to match performSearch() in filter.component.ts
  console.log('Quick search for city:', city);
}

  goBack() {
    this.router.navigate(['/explore']);
  }

  viewRoute() {
    this.router.navigate(['/explore/route-optimization']);
  }
}