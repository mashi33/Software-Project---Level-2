import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

export class WeatherSuggestionComponent {

  city: string = '';

  selectedDate: string =
    new Date().toISOString().split('T')[0];

  weatherData: any = null;

  weatherCategory: string = '';

  suggestionResult: WeatherRule | null = null;

  loading: boolean = false;

  constructor(
    private weatherService: WeatherService
  ) {}

  // =========================
  // SEARCH WEATHER
  // =========================
  searchWeather() {

    if (!this.city || !this.city.trim()) {
      return;
    }

    this.city = this.city.trim();

    if (!/^[a-zA-Z\s\-'.]+$/.test(this.city)) {

      alert('Enter a valid city name');

      return;
    }

    this.loading = true;

    this.suggestionResult = null;

    this.weatherService
      .getCoordinates(this.city)
      .subscribe({

        next: (res) => {

          if (res?.length > 0) {

            const lat = res[0].lat;
            const lon = res[0].lon;

            this.loadWeather(lat, lon);

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
}