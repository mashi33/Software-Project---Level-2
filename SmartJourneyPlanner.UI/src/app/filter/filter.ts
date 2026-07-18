import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { PlacesService } from '../services/places.service';
import { environment } from '../../environments/environment';
import { v4 as uuidv4 } from 'uuid';
import Swal from 'sweetalert2';

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


    // ✅ NEW — autocomplete flag
  private isValidSriLankaCity = false;
  // FIX: filter change debounce timer
  private filterDebounceTimer: any;

  constructor(private placesService: PlacesService, private route: ActivatedRoute) {}

  ngOnInit() {
    // ✅ NEW — if type manually for city, reset the autocomplete flag
    this.searchControl.valueChanges.subscribe(() => {
      this.isValidSriLankaCity = false;
    });

    // use only once query params
    this.route.queryParams.pipe(
      debounceTime(300)
    ).subscribe(params => {
      const cityFromUrl = params['city'];
      const categoryFromUrl = params['category'];

      if (categoryFromUrl) {
        this.activeCategory = categoryFromUrl;
      }

      if (cityFromUrl) {
        this.searchControl.setValue(cityFromUrl);
        // ✅ mark the city as valid since it came from the URL
        this.isValidSriLankaCity = true;
        setTimeout(() => {
          this.performSearch();
        }, 500);
      }
    });

    // add debouncing for filter controls - budget, rating, distance
    this.budgetControl.valueChanges.pipe(
      debounceTime(800),
      distinctUntilChanged()
    ).subscribe(() => {
      if (this.hasSearched) this.performSearch();
    });

    this.ratingControl.valueChanges.pipe(
      debounceTime(800),
      distinctUntilChanged()
    ).subscribe(() => {
      if (this.hasSearched) this.performSearch();
    });

    this.distanceControl.valueChanges.pipe(
      debounceTime(800),
      distinctUntilChanged()
    ).subscribe(() => {
      if (this.hasSearched) this.performSearch();
    });
  }

  ngAfterViewInit() {
    this.ensureGoogleMapsLoaded();
  }

  private ensureGoogleMapsLoaded() {
    if (typeof google !== 'undefined' && google.maps && google.maps.places) {
      this.initAutocomplete();
      return;
    }

    // check loading of scripts 
    if (document.getElementById('google-maps-filter-script')) {
      const interval = setInterval(() => {
        if (typeof google !== 'undefined' && google.maps?.places) {
          clearInterval(interval);
          this.initAutocomplete();
        }
      }, 300);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-filter-script';
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
      sessionToken: new google.maps.places.AutocompleteSessionToken()
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place && (place.name || place.formatted_address)) {
        this.searchControl.setValue(place.name || place.formatted_address);
        // ✅ NEW — when select in autocomplete — valid Sri Lanka city
        this.isValidSriLankaCity = true;
      }
    });
  }

  performSearch() {
    const cityName = this.searchControl.value?.trim();
    if (!cityName || cityName.length < 3) return;

    // ✅ NEW — autocomplete ලදී select නොකළොත් block
    if (!this.isValidSriLankaCity) {
    Swal.fire({

            icon: 'warning',
            title: 'Please Select from Suggestions!',
            html: `<p style="color:#555; font-size:15px; margin:0;">
              Please select a Sri Lankan city from the
              dropdown suggestions.
            </p>`,
            confirmButtonColor: '#4A90D9',
            width: 400,
            padding: '32px',
            showClass: { popup: 'swal2-show' },
            hideClass: { popup: 'swal2-hide' },
            customClass: { popup: 'srilanka-popup' },
            didOpen: () => {
              if (!document.getElementById('swal-srilanka-style')) {
                const style = document.createElement('style');
                style.id = 'swal-srilanka-style';
                style.textContent = `.srilanka-popup { border-radius: 16px !important; }`;
                document.head.appendChild(style);
              }
            }
          });
          return;
        }

    this.hasSearched = true;

    const filters = {
      category:    this.activeCategory,
      budget:      this.budgetControl.value ?? 2,
      rating:      this.ratingControl.value ?? 3.5,
      maxDistance: this.distanceControl.value || null
    };

    this.placesService.fetchPlacesByCity(cityName, filters, this.sessionToken);
  }

  changeCategory(cat: string) {
    this.activeCategory = cat;
    this.sessionToken = uuidv4();
    // add debouncing for categories
    if (this.hasSearched) {
      clearTimeout(this.filterDebounceTimer);
      this.filterDebounceTimer = setTimeout(() => {
        this.performSearch();
      }, 300);
    }
  }
}