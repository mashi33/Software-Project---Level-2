import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {
  ViewChild,
  ElementRef,
  OnInit,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { WeatherService } from '../services/weather.service';
import * as L from 'leaflet';

export interface WeatherRule {
  condition: string;
  message: string;
  packing: string[];
  outfit: string[];
  activity: string[];
}

export interface HourSlot {
  time: string;
  emoji: string;
  temp: number;
  rain: number;
  mm: number;
  height: number;
}

@Component({
  selector: 'app-weather-suggestion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './weather.html',
  styleUrls: ['./weather.css']
})

export class WeatherSuggestionComponent
  implements OnInit, AfterViewInit, OnDestroy {
  private map!: L.Map;
  private marker!: L.Layer;
  city: string = '';

  selectedDate: string =
    new Date().toISOString().split('T')[0];

  weatherData: any = null;
  weatherRange: any[] = [];

  weatherCategory: string = '';

  suggestionResult: WeatherRule | null = null;

  loading: boolean = false;

  showSearchHero: boolean = true;
  private LAST_CITY_KEY = 'weather_last_searched_city';
  private searchId = 0;

  // Temperature unit toggle (°C / °F)
  unit: 'C' | 'F' = 'C';

  // INSIGHT DATA (hourly forecast, precipitation, details)
  hourlyForecast: HourSlot[] = [];
  tempTrendPoints: string = '';
  maxMm: number = 0;
  totalMm: number = 0;

  advisoryIcon: string = '';
  advisoryTitle: string = '';
  advisoryMsg: string = '';

  // Persistent storage keys
  private STORAGE_KEY = 'weather_search_history';
  private UNIT_KEY = 'weather_unit_pref';
  recentSearches: string[] = [];

  // Calendar generation states
  currentMonthName: string = '';
  monthDays: Array<{ dayNumber: number | null }> = [];

  public calendarDays: number[] = [];
  public searchedDayNumber: number | null = null;

  calendarViewDate: Date = new Date();

  // Scroll-reveal observer for smooth box appearance on scroll
  private revealObserver?: IntersectionObserver;

   // Location dropdown (Sri Lanka results)
  locationOptions: Array<{
    name: string;
    country: string;
    admin1?: string;
    latitude: number;
    longitude: number;
    country_code?: string;
    displayName: string;
  }> = [];

  showLocationDropdown: boolean = false;
  private lastLat: string | null = null;
  private lastLon: string | null = null;
  private lastSearchedCity: string | null = null;

  private clearWeatherData() {
  this.weatherData = null;
  this.weatherRange = [];
  this.weatherCategory = '';
  this.suggestionResult = null;
  this.hourlyForecast = [];
  this.tempTrendPoints = '';
  this.maxMm = 0;
  this.totalMm = 0;
  this.advisoryIcon = '';
  this.advisoryTitle = '';
  this.advisoryMsg = '';
  this.searchedDayNumber = null;

  // Dropdown clear
  this.locationOptions = [];
  this.showLocationDropdown = false;

  // Clear coordinates to prevent showing old data for new searches
  this.lastLat = null;
  this.lastLon = null;
  this.lastSearchedCity = null;

  if (this.map && this.marker) {
    this.map.removeLayer(this.marker);
    this.marker = null as any;
  }
}

  @ViewChild('forecastSlider')
  forecastSlider!: ElementRef;

  constructor(
    private weatherService: WeatherService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const savedHistory = localStorage.getItem(this.STORAGE_KEY);
    if (savedHistory) {
      this.recentSearches = JSON.parse(savedHistory);
    } else {
      this.recentSearches = ['London', 'Tokyo', 'New York'];
    }

    const savedUnit = localStorage.getItem(this.UNIT_KEY);
    if (savedUnit === 'C' || savedUnit === 'F') {
      this.unit = savedUnit;
    }

    this.calendarViewDate = new Date(this.selectedDate);
    this.generateInlineCalendar();

    const lastCity = localStorage.getItem(this.LAST_CITY_KEY);
    if (lastCity) {
      this.city = lastCity;
      this.showSearchHero = false; 
      this.searchWeather();       
    } else {
      this.showSearchHero = true;  
    }
  }

  ngAfterViewInit() {
    this.setupRevealObserver();
    this.observeReveals();
    
    if (document.getElementById('map')) {
      this.initMap();
    }
  }

  private initMap(): void {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    this.map = L.map('map').setView([7.8731, 80.7718], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
  }

  ngOnDestroy() {
    this.revealObserver?.disconnect();
  }

    // TEMPERATURE UNIT
  setUnit(unit: 'C' | 'F') {
    this.unit = unit;
    localStorage.setItem(this.UNIT_KEY, unit);
  }

  // Converts a Celsius value into the active unit and returns a rounded number
  displayTemp(celsius: number | string): number {
    const c = Number(celsius);
    if (isNaN(c)) return 0;
    return this.unit === 'F'
      ? Math.round((c * 9) / 5 + 32)
      : Math.round(c);
  }

// SEARCH WEATHER
searchWeather() {

  if (!this.city || !this.city.trim()) return;

  const cityToRecord = this.city.trim();

  if (!/^[a-zA-Z\s\-'.]+$/.test(cityToRecord)) {
    alert('Enter a valid city name');
    return;
  }

  if (cityToRecord.length < 3) {
    alert('Please enter at least 3 characters');
    return;
  }

  // Reject pure garbage (ddd, aaa, xxx ...)
  const cleaned = cityToRecord.replace(/[\s\-'.]/g, '').toLowerCase();
  if (cleaned.length < 3 || /^(.)\1+$/.test(cleaned)) {
    alert('Enter a valid city name');
    return;
  }

  // Same city → reload weather only (compare with last successfully searched city)
  const sameCity =
    this.lastLat &&
    this.lastLon &&
    this.lastSearchedCity &&
    this.lastSearchedCity.toLowerCase() === cityToRecord.toLowerCase();

  if (sameCity) {
    this.showSearchHero = false;
    this.showLocationDropdown = false;
    localStorage.setItem(this.LAST_CITY_KEY, cityToRecord);

    const parts = this.selectedDate.split('-').map(Number);
    const parsedDate = new Date(parts[0], parts[1] - 1, parts[2]);
    this.searchedDayNumber = parsedDate.getDate();
    this.calendarViewDate = new Date(parts[0], parts[1] - 1, 1);
    this.generateInlineCalendar();

    this.loading = true;
    this.searchId++;
    this.loadWeather(this.lastLat!, this.lastLon!);
    return;
  }

  // New city - clear all previous data first
  this.lastLat = null;
  this.lastLon = null;
  this.clearWeatherData();
  this.showSearchHero = false;

  const parts = this.selectedDate.split('-').map(Number);
  const parsedDate = new Date(parts[0], parts[1] - 1, parts[2]);
  this.searchedDayNumber = parsedDate.getDate();
  this.calendarViewDate = new Date(parts[0], parts[1] - 1, 1);
  this.generateInlineCalendar();

  this.loading = true;
  this.suggestionResult = null;

  this.weatherService.getCoordinates(cityToRecord).subscribe({
  next: (res) => {
    const query = cityToRecord.toLowerCase().trim();

    // Filter results for Sri Lanka only and those that START with the typed letters
    const results = (res?.results || []).filter((r: any) => {
      const name = (r.name || '').toLowerCase();
      const country = (r.country || '').toLowerCase();
      const countryCode = (r.country_code || '').toLowerCase();
      // Must be in Sri Lanka and start with query
      return (country === 'sri lanka' || countryCode === 'lk') && name.startsWith(query);
    });

    if (results.length === 0) {
      this.clearWeatherData();
      alert('City not found in Sri Lanka. Please enter a valid Sri Lankan city name.');
      this.loading = false;
      this.showSearchHero = true;
      return;
    }

    this.locationOptions = results.map((r: any) => ({
      name: r.name,
      country: r.country || 'Sri Lanka',
      admin1: r.admin1 || '',
      latitude: r.latitude,
      longitude: r.longitude,
      country_code: r.country_code,
      displayName: this.buildDisplayName(r)
    }));

    // Exact match only → auto-select
    const exactMatch = this.locationOptions.find(
      (loc) => loc.name.toLowerCase() === query
    );

    if (exactMatch) {
      this.selectLocation(exactMatch);
    } else {
      // incomplete / invalid → NO data
      this.clearWeatherData();
      this.showLocationDropdown = true;
      this.loading = false;
    }
  },

  error: () => {
    this.clearWeatherData();
    alert('Geo API failed.');
    this.loading = false;
    this.showSearchHero = true;
  }
});
}

private inputTimer: any;

onCityInput() {
  clearTimeout(this.inputTimer);

  const q = (this.city || '').trim();
  if (q.length < 3) {
    this.locationOptions = [];
    this.showLocationDropdown = false;
    return;
  }

  // debounce 400ms
  this.inputTimer = setTimeout(() => {
    if (!/^[a-zA-Z\s\-'.]+$/.test(q) || /^(.)\1+$/.test(q.replace(/[\s\-'.]/g, '').toLowerCase())) {
      this.locationOptions = [];
      this.showLocationDropdown = false;
      return;
    }

    this.weatherService.getCoordinates(q).subscribe({
      next: (res) => {
        const query = q.toLowerCase();
        // Filter for Sri Lanka cities only
        const results = (res?.results || []).filter((r: any) => {
          const name = (r.name || '').toLowerCase();
          const country = (r.country || '').toLowerCase();
          const countryCode = (r.country_code || '').toLowerCase();
          return (country === 'sri lanka' || countryCode === 'lk') && name.startsWith(query);
        });

        this.locationOptions = results.map((r: any) => ({
          name: r.name,
          country: r.country || 'Sri Lanka',
          admin1: r.admin1 || '',
          latitude: r.latitude,
          longitude: r.longitude,
          country_code: r.country_code,
          displayName: this.buildDisplayName(r)
        }));

        this.showLocationDropdown = this.locationOptions.length > 0;
      },
      error: () => {
        this.locationOptions = [];
        this.showLocationDropdown = false;
      }
    });
  }, 400);
}

private buildDisplayName(r: any): string {
  const parts = [r.name];
  if (r.admin1) parts.push(r.admin1);
  if (r.country) parts.push(r.country); // ["Matara", "Southern Province", "Sri Lanka"]
  return parts.join(', ');
}

selectLocation(loc: {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  displayName: string;
}) {
  this.showLocationDropdown = false;
  this.city = loc.name;
  this.loading = true;

  // clear previous location data
  this.weatherData = null;
  this.weatherRange = [];
  this.hourlyForecast = [];
  this.suggestionResult = null;
  this.weatherCategory = '';
  this.advisoryIcon = '';
  this.advisoryTitle = '';
  this.advisoryMsg = '';
  this.tempTrendPoints = '';
  this.maxMm = 0;
  this.totalMm = 0;

  localStorage.setItem(this.LAST_CITY_KEY, loc.name);
  this.lastLat = String(loc.latitude);
  this.lastLon = String(loc.longitude);
  this.lastSearchedCity = loc.name; // Track the last successfully searched city

  this.searchId++;
  this.loadWeather(this.lastLat, this.lastLon);
  this.addToRecentSearches(loc.name);
}

  // LOAD WEATHER
  loadWeather(lat: string, lon: string) {
    const currentSearchId = this.searchId;

  // clear immediately so old data never stays
  this.weatherData = null;
  this.weatherRange = [];
  this.hourlyForecast = [];
  this.suggestionResult = null;
  this.weatherCategory = '';
  this.advisoryIcon = '';
  this.advisoryTitle = '';
  this.advisoryMsg = '';
  this.tempTrendPoints = '';
  this.maxMm = 0;
  this.totalMm = 0;

    const latN = parseFloat(lat);
    const lonN = parseFloat(lon);

    const dateError = this.validateWeatherDate(this.selectedDate);
    if (dateError) {
      this.clearWeatherData();
      this.loading = false;
      this.showSearchHero = false;
      alert(dateError);
      return;
    }

    console.log('Loading weather for:', latN, lonN);

    this.http
      .get(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation`
      )
      .subscribe((data: any) => {
        console.log('Open-Meteo Data:', data);
        const temp = data.current.temperature_2m;
        const precip = data.current.precipitation;
        const color = temp > 30 ? 'red' : 'blue';

        if (this.map) {
          if (this.marker) this.map.removeLayer(this.marker);

          this.marker = L.circleMarker([parseFloat(lat), parseFloat(lon)], {
            color: color,
            radius: 15,
            fillOpacity: 0.7
          })
            .addTo(this.map)
            .bindPopup(`Temperature: ${temp}°C<br>Precipitation: ${precip}mm`)
            .openPopup();
        }
      });

    // MAIN SELECTED DATE WEATHER
this.weatherService
  .getProcessedWeather(lat, lon, this.selectedDate)
  .subscribe({
    next: (weather) => {
      if (currentSearchId !== this.searchId) return;   // ← stale ignore

      this.weatherData = weather;
      this.weatherCategory = weather.condition;

      this.setAdvisory(weather);

      this.getBackendSuggestion(
        Number(weather.avgTemp),
        weather.condition
      );

      this.scheduleReveal();
    },
    error: () => {
      if (currentSearchId !== this.searchId) return;   

      this.clearWeatherData();
      this.loading = false;
      this.showSearchHero = false;
      alert(
        'Weather data is not available for this date. Please try another date.'
      );
    }
  });

// REAL HOURLY (selected date)
this.weatherService.getHourlyWeather(lat, lon, this.selectedDate).subscribe({
  next: (hourlyData) => {
    if (currentSearchId !== this.searchId) return;   

    this.buildHourlyFromApi(hourlyData, this.selectedDate);
    this.scheduleReveal();
  },
  error: () => {
    if (currentSearchId !== this.searchId) return;   

    this.hourlyForecast = [];
    console.warn('Hourly data not available for this date');
  }
});

// LOAD 7 DAY RANGE
this.weatherService.getWeatherRange(lat, lon, this.selectedDate).subscribe({
  next: (res) => {
    if (currentSearchId !== this.searchId) return;   

    this.weatherRange = res;
    this.scheduleReveal();
  },
  error: () => {
    if (currentSearchId !== this.searchId) return;   
    console.log('Range weather failed');
  }
});
}

  // BACKEND SUGGESTIONS
  private getBackendSuggestion(
    temp: number,
    condition: string
  ) {

    this.weatherService
      .getSuggestions(
        temp,
        condition,
        this.selectedDate
      )
      .subscribe({

        next: (res) => {

          this.suggestionResult = res;

          this.loading = false;

          this.scheduleReveal();
        },

        error: () => {

          console.warn(
            'No suggestions found'
          );

          this.suggestionResult = null;

          this.loading = false;
        }
      });
  }

  /* Advisory only – hourly is now real from API */
private setAdvisory(weather: any) {
  const cond = (weather.condition || '').toLowerCase();
  const precipitation = Number(weather.precipitation) || 0;
  const isRain = cond.includes('rain') || cond.includes('storm') || cond.includes('thunder') || precipitation > 0;
  const isCloud = cond.includes('cloud');

  if (isRain) {
    this.advisoryIcon = '☔';
    this.advisoryTitle = 'Grab an Umbrella!';
    this.advisoryMsg = 'Thunderstorms possible later today — carry rain protection.';
  } else if (isCloud) {
    this.advisoryIcon = '⛅';
    this.advisoryTitle = 'Cloudy Skies Ahead';
    this.advisoryMsg = 'Mostly overcast with a low chance of rain. Light layers recommended.';
  } else {
    this.advisoryIcon = '😎';
    this.advisoryTitle = 'Clear & Bright';
    this.advisoryMsg = 'A great day to be outdoors — remember sunscreen and stay hydrated.';
  }
}

/* Build real hourly slots from Open-Meteo hourly response */
private buildHourlyFromApi(data: any, selectedDate: string) {
  const times: string[] = data?.hourly?.time || [];
  const temps: number[] = data?.hourly?.temperature_2m || [];
  const precips: number[] = data?.hourly?.precipitation || [];
  const probs: number[] = data?.hourly?.precipitation_probability || [];
  const codes: number[] = data?.hourly?.weather_code || [];

  if (!times.length || !temps.length) {
    this.hourlyForecast = [];
    this.tempTrendPoints = '';
    this.maxMm = 0;
    this.totalMm = 0;
    return;
  }

  const slots: HourSlot[] = [];
  let total = 0;
  let maxMm = 0;

  const emojiFromCode = (code: number, rainProb: number) => {
    if (code >= 95 || rainProb >= 70) return '⛈️';
    if (code >= 51 || rainProb >= 40) return '🌧️';
    if (code >= 1 && code <= 3) return '⛅';
    return '☀️';
  };

  // 8 slots across the day
  for (const h of [9, 11, 13, 15, 17, 19, 21, 23]) {
    let bestIdx = -1;
    let bestDiff = 999;

    times.forEach((t, i) => {
      const hour = parseInt(t.split('T')[1]?.substring(0, 2) || '0', 10);
      const diff = Math.abs(hour - h);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    });

    if (bestIdx < 0) continue;

    const temp = Math.round(temps[bestIdx] ?? 0);
    const mm = Number((precips[bestIdx] ?? 0).toFixed(2));
    const rain = Math.round(probs[bestIdx] ?? (mm > 0 ? 60 : 10));
    const code = codes[bestIdx] ?? 0;
    const timeStr = `${h.toString().padStart(2, '0')}:00`;

    total += mm;
    if (mm > maxMm) maxMm = mm;

    slots.push({
      time: timeStr,
      emoji: emojiFromCode(code, rain),
      temp,
      rain,
      mm,
      height: 0
    });
  }

  const safeMax = maxMm || 1;
  slots.forEach(s => {
    s.height = Math.max(6, Math.round((s.mm / safeMax) * 100));
  });

  this.hourlyForecast = slots;
  this.maxMm = maxMm;
  this.totalMm = Math.round(total * 100) / 100;

  // SVG temp trend
  if (slots.length) {
    const tvals = slots.map(s => s.temp);
    const min = Math.min(...tvals);
    const max = Math.max(...tvals);
    const range = max - min || 1;
    this.tempTrendPoints = slots
      .map((s, i) => {
        const x = ((i + 0.5) / slots.length) * 100;
        const y = 32 - ((s.temp - min) / range) * 24;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  } else {
    this.tempTrendPoints = '';
  }
}

  // Pure data filter ensuring unique entries up to max size of 5
  private addToRecentSearches(city: string) {
    const formattedCity = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
    this.recentSearches = this.recentSearches.filter(item => item !== formattedCity);
    this.recentSearches.unshift(formattedCity);

    if (this.recentSearches.length > 5) {
      this.recentSearches.pop();
    }
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.recentSearches));
  }

  // Interactive quick access trigger callback
  selectRecentSearch(city: string) {
    this.city = city;
    this.searchWeather();
  }

  // SCROLL FORECAST
  scrollForecast(direction: 'left' | 'right') {
    if (!this.forecastSlider) return;

    const slider = this.forecastSlider.nativeElement;
    const cardWidth = 180;

    if (direction === 'left') {
      slider.scrollLeft -= cardWidth;
    } else {
      slider.scrollLeft += cardWidth;
    }
  }

  // SCROLL REVEAL ANIMATION
  private setupRevealObserver() {
    if (typeof IntersectionObserver === 'undefined') return;

    this.revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible');
            this.revealObserver?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
  }

  private observeReveals() {
    if (!this.revealObserver) return;

    const nodes = document.querySelectorAll('.reveal:not(.reveal-bound)');
    nodes.forEach((node) => {
      node.classList.add('reveal-bound');
      this.revealObserver?.observe(node);
    });
  }

  private scheduleReveal() {
    setTimeout(() => this.observeReveals(), 60);
  }

  // CALENDAR
  // Navigate the inline calendar by month (prev/next arrows)
  changeMonth(offset: number) {
    this.calendarViewDate = new Date(
      this.calendarViewDate.getFullYear(),
      this.calendarViewDate.getMonth() + offset,
      1
    );
    this.generateInlineCalendar();
  }

  /* Local YYYY-MM-DD (timezone-safe – no toISOString) */
private formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* Returns error message if date is out of supported range, else null */
private validateWeatherDate(dateStr: string): string | null {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return 'Invalid date.';
  }

  const selected = new Date(parts[0], parts[1] - 1, parts[2]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  selected.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (selected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Open-Meteo forecast roughly up to 16 days ahead
  if (diffDays > 16) {
    return 'Forecast is only available up to 16 days ahead. Please choose an earlier date.';
  }

  // Optional: block very old dates (archive usually OK; adjust if you want)
  // if (diffDays < -3650) {
  //   return 'Historical data is not available for this date.';
  // }

  return null;
}
  // Pick a day from the inline calendar
  selectDay(dayNumber: number | null) {
  if (!dayNumber) return;

  const picked = new Date(
    this.calendarViewDate.getFullYear(),
    this.calendarViewDate.getMonth(),
    dayNumber
  );

  this.selectedDate = this.formatLocalDate(picked);
  this.searchedDayNumber = dayNumber;

  //  Already have location → weather only (no dropdown)
  if (this.lastLat && this.lastLon) {
    this.loading = true;
    this.searchId++;
    this.loadWeather(this.lastLat, this.lastLon);
    return;
  }

  // No saved location → full search
  if (this.city && this.city.trim()) {
    this.searchWeather();
  }
}

  // Generates the inline mini-calendar layout
  generateInlineCalendar() {
    const activeDate = new Date(this.calendarViewDate);
    const year = activeDate.getFullYear();
    const month = activeDate.getMonth();

    this.currentMonthName = activeDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const generatedDays: Array<{ dayNumber: number | null }> = [];

    for (let i = 0; i < firstDayIndex; i++) {
      generatedDays.push({ dayNumber: null });
    }

    for (let day = 1; day <= totalDaysInMonth; day++) {
      generatedDays.push({
        dayNumber: day
      });
    }

    this.monthDays = generatedDays;
  }
}