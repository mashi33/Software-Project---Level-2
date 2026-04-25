import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
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

  constructor(private placesService: PlacesService) {}

  ngOnInit() {
    // Debouncing භාවිතා කර නගරයේ නම වෙනස් වීම නිරීක්ෂණය කිරීම
    this.searchControl.valueChanges.pipe(
      debounceTime(500), // තත්පර 0.5ක් පරිශීලකයා නතර වන තෙක් සිටී
      distinctUntilChanged()
    ).subscribe(value => {
      // මෙහිදී Suggestions පෙන්වීමට අවශ්‍ය නම් logic එකක් දැමිය හැක
      // නමුත් අප autocomplete සක්‍රිය කර ඇති නිසා Google විසින් එය ස්වයංක්‍රීයව කරයි
    });

    // Filters වෙනස් වූ විට සෙවීම (පළමු වරට සෙවීමෙන් පසු පමණක්)
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

  // Environment key එක භාවිතා කර script එක load කිරීම
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
      // Billing ඉතිරි කර ගැනීමට session token එක භාවිතා කිරීම
      sessionToken: new google.maps.places.AutocompleteSessionToken()
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place && (place.name || place.formatted_address)) {
        this.searchControl.setValue(place.name || place.formatted_address);
      }
    });
  }

  // සැබෑ ලෙසම සෙවීම ආරම්භ වන්නේ මෙහිදීය (Search Button Logic)
  performSearch() {
    const cityName = this.searchControl.value?.trim();
    if (!cityName || cityName.length < 3) return;

    this.hasSearched = true; // Button එක එබූ බව තහවුරු කරයි

    const filters = {
      category:    this.activeCategory,
      budget:      this.budgetControl.value ?? 2,
      rating:      this.ratingControl.value ?? 3.5,
      maxDistance: this.distanceControl.value || null
    };

    // Session token එක සමඟ දත්ත ලබා ගැනීම
    this.placesService.fetchPlacesByCity(cityName, filters, this.sessionToken);
  }

  changeCategory(cat: string) {
    this.activeCategory = cat;
    this.sessionToken = uuidv4(); // අලුත් සෙවුමකට අලුත් token එකක්
    if (this.hasSearched) this.performSearch();
  }
}