import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { PlacesService } from '../services/places.service';
import { environment } from '../../environments/environment'; // environment file එකෙන් key එක ගනී
import { v4 as uuidv4 } from 'uuid';

declare var google: any;

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './filter.html',
  styleUrls: ['./filter.css']
})
export class FilterComponent implements OnInit, AfterViewInit {
  @ViewChild('cityInput') cityInput!: ElementRef;

  searchControl   = new FormControl('');
  budgetControl   = new FormControl(2);
  ratingControl   = new FormControl(3.5);
  distanceControl = new FormControl('');

  sessionToken   = uuidv4();
  activeCategory = 'Hotel';
  hasSearched    = false;

  constructor(private placesService: PlacesService, private route: ActivatedRoute) {}

  ngOnInit() {
    //check url for city query param and perform search if present. 
    this.route.queryParams.subscribe(params => {
      const cityFromUrl = params['city']; 
      
      if (cityFromUrl) {
        this.searchControl.setValue(cityFromUrl);
        setTimeout(() => {
          this.performSearch(); 
        }, 1200); 
      }
    });

    // Debouncing and distinctUntilChanged for search input to reduce API calls and improve performance
    this.searchControl.valueChanges.pipe(
      debounceTime(500), 
      distinctUntilChanged()
    ).subscribe(value => {
      
    });

    // Three filter controls (budget, rating, distance) 

    this.budgetControl.valueChanges.subscribe(() => {
      if (this.hasSearched) this.performSearch();
    });

    this.ratingControl.valueChanges.subscribe(() => {
      if (this.hasSearched) this.performSearch();
    });

    this.distanceControl.valueChanges.subscribe(() => {
      if (this.hasSearched) this.performSearch();
    });
  }

  ngAfterViewInit() {
    this.ensureGoogleMapsLoaded();
  }

  // load script using environment variable and initialize autocomplete after script is loaded
  private ensureGoogleMapsLoaded() {
    if (typeof google !== 'undefined' && google.maps && google.maps.places) {
      this.initAutocomplete();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => this.initAutocomplete();
    document.head.appendChild(script);
  }

  initAutocomplete() {
    const autocomplete = new google.maps.places.Autocomplete(this.cityInput.nativeElement, {
      types: ['(cities)'],
      componentRestrictions: { country: 'lk' },
      // session tokens are used to group related autocomplete requests for billing purposes and to improve the quality of results
      sessionToken: new google.maps.places.AutocompleteSessionToken()
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place && (place.name || place.formatted_address)) {
        this.searchControl.setValue(place.name || place.formatted_address);
      }
    });
  }

  // invoke search function invoke
  performSearch() {
    const cityName = this.searchControl.value?.trim();
    if (!cityName || cityName.length < 3) return;

    this.hasSearched = true; 

    const filters = {
      category:    this.activeCategory,
      budget:      this.budgetControl.value ?? 2,
      rating:      this.ratingControl.value ?? 3.5,
      maxDistance: this.distanceControl.value || null
    };

    // fetch places with filters and session token for better results
    this.placesService.fetchPlacesByCity(cityName, filters, this.sessionToken);
  }

  changeCategory(cat: string) {
    this.activeCategory = cat;
    this.sessionToken = uuidv4(); //new session token for new category to improve results
    if (this.hasSearched) this.performSearch();
  }
}