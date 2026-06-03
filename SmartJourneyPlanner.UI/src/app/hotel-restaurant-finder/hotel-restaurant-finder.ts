import { Component } from '@angular/core';
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

export class HotelRestaurantFinder {
  constructor(private router: Router,private route: ActivatedRoute,private placesService: PlacesService) {}

 //Navigate to explore page
  goBack() {
    this.router.navigate(['/explore']); 
  }

  //Navigate to route-optimization page
  viewRoute() {
    this.router.navigate(['/explore/route-optimization']); 
  }
}