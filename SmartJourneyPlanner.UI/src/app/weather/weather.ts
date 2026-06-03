import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {ViewChild,ElementRef, OnInit} from '@angular/core';
import { WeatherService } from '../services/weather.service';

export interface WeatherRule {
  condition: string;
  message: string;
  packing: string[];
  outfit: string[];
  activity: string[];
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

export class WeatherSuggestionComponent implements OnInit{

  city: string = '';

  selectedDate: string =
    new Date().toISOString().split('T')[0];

  weatherData: any = null;
  weatherRange: any[] = [];

  weatherCategory: string = '';

  suggestionResult: WeatherRule | null = null;

  loading: boolean = false;

  // 1. Define a persistent storage key at the top of your class properties
private STORAGE_KEY = 'weather_search_history';
  recentSearches: string[] = [];

// Calendar generation states
currentMonthName: string = '';
monthDays: Array<{ dayNumber: number | null, emoji: string }> = [];

public calendarDays: number[] = [];
  public searchedDayNumber: number | null = null;

  @ViewChild('forecastSlider')
forecastSlider!: ElementRef;

  constructor(
    private weatherService: WeatherService
  ) {}

  // 2. Update ngOnInit to pull from localStorage instead of hardcoded strings
ngOnInit() {
  const savedHistory = localStorage.getItem(this.STORAGE_KEY);
  if (savedHistory) {
    // If history exists in the browser, parse and load it
    this.recentSearches = JSON.parse(savedHistory);
  } else {
    // Fallback default presets only if the user has never searched before
    this.recentSearches = ['London', 'Tokyo', 'New York'];
  }
  //Populates calendar layout arrays on fresh boot shell
  this.generateInlineCalendar();
}

  // =========================
  // SEARCH WEATHER
  // =========================
  searchWeather() {

    if (!this.city || !this.city.trim()) return;
  
  // 1. Lock in and format the searched city name immediately
  const cityToRecord = this.city.trim();

  if (!/^[a-zA-Z\s\-'.]+$/.test(cityToRecord)) {
    alert('Enter a valid city name');
    return;
  }

  // ↓↓↓ ADD THESE TWO LINES HERE TO SET HIGHLIGHT & UPDATE THE MONTH LOOKUP ↓↓↓
    const parsedDate = new Date(this.selectedDate);
    this.searchedDayNumber = parsedDate.getDate(); 
    this.generateInlineCalendar();
    // ↑↑↑ ================================================================= ↑↑↑

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

            // 3. Pass the clean, locked variable here to update the UI panel instantly
        this.addToRecentSearches(cityToRecord);

          } else {

            alert('City not found.');

            this.loading = false;
          }
        },

        error: () => {

          alert('Geo API failed.');

          this.loading = false;
        }
      });
  }

  // =========================
  // LOAD WEATHER
  // =========================
  loadWeather(
  lat: string,
  lon: string
) {

  // MAIN SELECTED DATE WEATHER
  this.weatherService
    .getProcessedWeather(
      lat,
      lon,
      this.selectedDate
    )
    .subscribe({

      next: (weather) => {

        this.weatherData = weather;

        this.weatherCategory =
          weather.condition;

        this.getBackendSuggestion(
          Number(weather.avgTemp),
          weather.condition
        );
      },

      error: () => {

        alert('Weather API failed.');

        this.loading = false;
      }
    });

  // =========================
  // LOAD 7 DAY RANGE
  // =========================

  this.weatherService.getWeatherRange(lat, lon, this.selectedDate).subscribe({
      next: (res) => {
        this.weatherRange = res;
      },
      error: () => {
        console.log('Range weather failed');
      }
    });
}

  // =========================
  // BACKEND SUGGESTIONS
  // =========================
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


  // Pure data filter ensuring stack unique entries up to max size threshold of 5 entries
  private addToRecentSearches(city: string) {
    const formattedCity = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
    this.recentSearches = this.recentSearches.filter(item => item !== formattedCity);
    this.recentSearches.unshift(formattedCity);
    
    if (this.recentSearches.length > 5) {
      this.recentSearches.pop();
    }
    // 4. Save the updated search history to localStorage
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.recentSearches));
  }

  // Interactive quick access trigger callback
  selectRecentSearch(city: string) {
    this.city = city;
    this.searchWeather();
  }
  // =========================
// SCROLL FORECAST
// =========================
scrollForecast(direction: 'left' | 'right') {
    if (!this.forecastSlider) return;
    
    const slider = this.forecastSlider.nativeElement;
    const cardWidth = 220; // Step size covering card footprint + gaps

    if (direction === 'left') {
      slider.scrollLeft -= cardWidth;
    } else {
      slider.scrollLeft += cardWidth;
    }
}

// Call this method inside your existing loadWeather() or searchWeather() success callback
generateInlineCalendar() {
  const activeDate = new Date(this.selectedDate);
  const year = activeDate.getFullYear();
  const month = activeDate.getMonth(); // 0-indexed
  
  // Set the header name (e.g., "June 2026")
  this.currentMonthName = activeDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const firstDayIndex = new Date(year, month, 1).getDay(); // Day of week index (0 = Sun)
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  
  const generatedDays = [];

  // 1. Fill leading blank spacing blocks for empty weekday offsets
  for (let i = 0; i < firstDayIndex; i++) {
    generatedDays.push({ dayNumber: null, emoji: '' });
  }

  // 2. Populate actual days of the month
  // Mock condition mapping strategy mimicking your core backend engine values
  const weatherMockPool = ['☀️', '☁️', '🌧️']; 
  for (let day = 1; day <= totalDaysInMonth; day++) {
    // Generates a stable pseudo-random icon map per day for display simulation
    const simulatedEmoji = weatherMockPool[(day + month) % weatherMockPool.length];
    
    generatedDays.push({
      dayNumber: day,
      emoji: simulatedEmoji
    });
  }

  this.monthDays = generatedDays;
}
}

