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
  imports: [CommonModule, FormsModule],
  templateUrl: './weather.html',
  styleUrls: ['./weather.css']
})
export class WeatherSuggestionComponent {

  city: string = '';
  selectedDate: string = new Date().toISOString().split('T')[0];
  weatherData: any = null;
  weatherCategory: string = '';
  suggestionResult: WeatherRule | null = null;
  loading: boolean = false;

  constructor(private weatherService: WeatherService) {}

  searchWeather() {
    if (!this.city || !this.city.trim()) return;

     this.city = this.city.trim();

  
   if (!/^[a-zA-Z\s\-'.]+$/.test(this.city)) {
     alert("Enter a valid city name");
     return;
  }

    this.loading = true;
    this.suggestionResult = null;

    this.weatherService.getCoordinates(this.city).subscribe({
      next: (res) => {
        const place = res?.find((item: any) =>
      ['city', 'town', 'village'].includes(item.type)
    );

    if (place) {
      const lat = place.lat;
      const lon = place.lon;
      this.fetchWeather(lat, lon);
    } else {
      alert('Invalid city name.');
      this.loading = false;
        }
      },
      error: () => {
        alert('Geo API failed.');
        this.loading = false;
      }
    });
  }

  private fetchWeather(lat: string, lon: string) {

  const today = new Date().toISOString().split('T')[0];

  if (this.selectedDate === today) {

    this.weatherService.getCurrentWeather(lat, lon).subscribe({
      next: (data) => {
        const temp = data.current.temperature_2m;
        const humidity = data.current.relative_humidity_2m;

        this.processWeather(temp, humidity);
      },
      error: () => {
        alert('Current weather API failed.');
        this.loading = false;
      }
    });

  } else if (this.selectedDate < today) {

    this.weatherService.getHistoricalWeather(lat, lon, this.selectedDate).subscribe({
      next: (data) => {
        const tempMax = data.daily.temperature_2m_max[0];
        const tempMin = data.daily.temperature_2m_min[0];
        const humidity = data.daily.relative_humidity_2m_mean[0];

        const temp = (tempMax + tempMin) / 2;

        this.processWeather(temp, humidity);
      },
      error: () => {
        alert('Historical weather API failed.');
        this.loading = false;
      }
    });

  } else {

    this.weatherService.getForecastWeather(lat, lon, this.selectedDate).subscribe({
      next: (data) => {
        const tempMax = data.daily.temperature_2m_max[0];
        const tempMin = data.daily.temperature_2m_min[0];
        const humidity = data.daily.relative_humidity_2m_mean[0];

        const temp = (tempMax + tempMin) / 2;

        this.processWeather(temp, humidity);
      },
      error: () => {
        alert('Forecast weather API failed.');
        this.loading = false;
      }
    });
  }
}

      private processWeather(temp: number, humidity: number) {

      if (humidity >= 80) {
        this.weatherCategory = 'Rainy';
      } else if (temp >= 25) {
        this.weatherCategory = 'Sunny';
      } else {
        this.weatherCategory = 'Cloudy';
      }

      this.weatherData = { temp, humidity };

      this.getBackendSuggestion(temp, this.weatherCategory);
}

  private getBackendSuggestion(temp: number, condition: string) {
    this.weatherService
      .getSuggestions(temp, condition, this.selectedDate)
      .subscribe({
        next: (res) => {
          this.suggestionResult = res;
          this.loading = false;
        },
        error: () => {
          console.warn("No suggestions found for condition:", condition);
          this.suggestionResult = null;
          this.loading = false;
        }
      });
  }
}