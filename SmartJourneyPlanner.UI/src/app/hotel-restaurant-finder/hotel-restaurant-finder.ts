import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FilterComponent } from '../filter/filter';
import { MapViewComponent } from '../map-view/map-view';
import { PlaceCardListComponent } from '../place-card/place-card';

@Component({
  selector: 'app-hotel-restaurant-finder',
  standalone: true,
  imports: [
    CommonModule,
    FilterComponent,
    MapViewComponent,
    PlaceCardListComponent
  ],
  templateUrl: './hotel-restaurant-finder.html',
  styleUrl: './hotel-restaurant-finder.css',
})
export class HotelRestaurantFinder {
  constructor(private router: Router) {}

 //Navigate to explore page
  goBack() {
    this.router.navigate(['/explore']); 
  }

  //Navigate to route-optimization page
  viewRoute() {
    this.router.navigate(['/explore/route-optimization']); 
  }
}