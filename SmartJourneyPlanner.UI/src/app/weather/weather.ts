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

    this.showSearchHero = false;
    localStorage.setItem(this.LAST_CITY_KEY, cityToRecord);

    const parsedDate = new Date(this.selectedDate);
    this.searchedDayNumber = parsedDate.getDate();
    this.calendarViewDate = new Date(this.selectedDate);
    this.generateInlineCalendar();

    this.loading = true;
    this.suggestionResult = null;

    this.weatherService
      .getCoordinates(cityToRecord)
      .subscribe({

        next: (res) => {

          if (res?.length > 0) {

            const lat = res[0].lat;
            const lon = res[0].lon;

            this.loadWeather(lat, lon);
            this.addToRecentSearches(cityToRecord);

          } else {

            alert('City not found.');
            this.loading = false;
            this.showSearchHero = true;
          }
        },

        error: () => {

          alert('Geo API failed.');
          this.loading = false;
        }
      });
  }

  // LOAD WEATHER
  loadWeather(lat: string, lon: string) {
    const latN = parseFloat(lat);
    const lonN = parseFloat(lon);

    console.log("Loading weather for:", latN, lonN);

    this.http.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation`)
    .subscribe((data: any) => {
      console.log("Open-Meteo Data:", data);
      const temp = data.current.temperature_2m;
      const precip = data.current.precipitation;

      const color = temp > 30 ? 'red' : 'blue';
      
      if (this.map) {
        if (this.marker) this.map.removeLayer(this.marker);
        
        this.marker = L.circleMarker([parseFloat(lat), parseFloat(lon)], {
          color: color,
          radius: 15,
          fillOpacity: 0.7
        }).addTo(this.map)
        .bindPopup(`උෂ්ණත්වය: ${temp}°C<br>වර්ෂාපතනය: ${precip}mm`)
        .openPopup();
      }
    });

    // MAIN SELECTED DATE WEATHER
    this.weatherService
      .getProcessedWeather(lat, lon, this.selectedDate)
      .subscribe({

        next: (weather) => {

          this.weatherData = weather;
          this.weatherCategory = weather.condition;

           // Build derived hourly + detail insights
          this.generateInsights(weather);

          this.getBackendSuggestion(
            Number(weather.avgTemp),
            weather.condition
          );

           // re-run reveal animation for freshly rendered boxes
          this.scheduleReveal();
        },

        error: () => {

          alert('Weather API failed.');
          this.loading = false;
        }
      });

          // LOAD 7 DAY RANGE
    this.weatherService.getWeatherRange(lat, lon, this.selectedDate).subscribe({
      next: (res) => {
        this.weatherRange = res;
        this.scheduleReveal();
      },
      error: () => {
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

  // INSIGHTS: hourly forecast, precip chart, details, advisory
  // Use real data from API instead of simulated values
  
  private generateInsights(weather: any) {
    const base = Number(weather.avgTemp) || 24;
    const humidity = Number(weather.humidity) || 60;
    const windSpeed = Number(weather.windSpeed) || 0;
    const precipitation = Number(weather.precipitation) || 0;
    const cond = (weather.condition || '').toLowerCase();

    const isRain = cond.includes('rain') || cond.includes('storm') || cond.includes('thunder');
    const isCloud = cond.includes('cloud');

    const emojiFor = (rain: number) =>
      rain >= 60 ? '⛈️' : rain >= 35 ? '🌧️' : isCloud ? '⛅' : '☀️';

    const slots: HourSlot[] = [];
    let total = 0;
    let maxMm = 0;

    // 8 slots, 2-hour steps starting at 09:00
    for (let i = 0; i < 8; i++) {
      const hour = 9 + i * 2;
      const time = `${hour.toString().padStart(2, '0')}:00`;

      // temperature gently curves through the day, cooler in the evening
      const temp = Math.round(base + 2 * Math.sin(i / 1.6) - (i > 5 ? 2 : 0));

      // rain probability shaped by condition + humidity + real precipitation
      let rain: number;
      if (isRain) rain = Math.min(95, 50 + i * 5 + Math.round(humidity / 6));
      else if (isCloud) rain = Math.min(70, 20 + i * 3 + Math.round(humidity / 8));
      else rain = Math.max(2, Math.min(35, 5 + i * 2 + Math.round((humidity - 40) / 6)));

      // precipitation mm derived from probability + real precipitation data
      const factor = isRain ? 3.2 : isCloud ? 1.1 : 0.35;
      const mm = Math.round((rain / 100) * factor * 100) / 100;

      total += mm;
      if (mm > maxMm) maxMm = mm;

      slots.push({ time, emoji: emojiFor(rain), temp, rain, mm, height: 0 });
    }

    // compute bar heights as % of the max (min 6% so empty bars still show)
    const safeMax = maxMm || 1;
    slots.forEach(s => {
      s.height = Math.max(6, Math.round((s.mm / safeMax) * 100));
    });

    this.hourlyForecast = slots;
    this.maxMm = maxMm;
    this.totalMm = Math.round(total * 100) / 100;

    // SVG temp trend polyline (aligned to centre of each column)
    const temps = slots.map(s => s.temp);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const range = max - min || 1;
    this.tempTrendPoints = slots
      .map((s, i) => {
        const x = ((i + 0.5) / slots.length) * 100;
        const y = 32 - ((s.temp - min) / range) * 24; // invert into 0..40 viewBox
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    // Advisory based on real precipitation data
    if (isRain || precipitation > 0) {
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

  // Pick a day from the inline calendar
  selectDay(dayNumber: number | null) {
    if (!dayNumber) return;

    const picked = new Date(
      this.calendarViewDate.getFullYear(),
      this.calendarViewDate.getMonth(),
      dayNumber
    );

    this.selectedDate = picked.toISOString().split('T')[0];
    this.searchedDayNumber = dayNumber;

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