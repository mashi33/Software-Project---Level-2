import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PlacesService } from '../services/places.service';
import { v4 as uuidv4 } from 'uuid';

@Component({
    selector: 'app-filter',
    imports: [ReactiveFormsModule],
    templateUrl: './filter.html',
    styleUrls: ['./filter.css']
})
export class FilterComponent implements OnInit {
  searchControl  = new FormControl('');
  budgetControl  = new FormControl(2);
  ratingControl  = new FormControl(3.5);
  distanceControl = new FormControl('');   // NEW: empty string = no distance limit

  sessionToken   = uuidv4();
  activeCategory = 'Hotel';
  hasSearched    = false;

  constructor(private placesService: PlacesService) {}

  ngOnInit() {
    this.searchControl.valueChanges.pipe(
      debounceTime(600),
      distinctUntilChanged()
    ).subscribe(value => {
      if (value && value.trim().length > 0) {
        this.loadData();
      }
    });

    this.budgetControl.valueChanges.subscribe(() => {
      if (this.hasSearched) this.loadData();
    });

    this.ratingControl.valueChanges.subscribe(() => {
      if (this.hasSearched) this.loadData();
    });

    // NEW: re-fetch when distance filter changes
    this.distanceControl.valueChanges.subscribe(() => {
      if (this.hasSearched) this.loadData();
    });
  }

  changeCategory(cat: string) {
    this.activeCategory = cat;
    this.sessionToken = uuidv4();
    if (this.hasSearched) this.loadData();
  }

  loadData() {
    const cityName = this.searchControl.value?.trim();
    if (!cityName) return;

    this.hasSearched = true;

    const filters = {
      category:    this.activeCategory,
      budget:      this.budgetControl.value ?? 2,
      rating:      this.ratingControl.value ?? 3.5,
      maxDistance: this.distanceControl.value || null  // null = no limit
    };

    this.placesService.fetchPlacesByCity(cityName, filters, this.sessionToken);
  }
}