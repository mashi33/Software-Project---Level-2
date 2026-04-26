import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { WeatherService } from '../services/weather.service';

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
  suggestionResult: any = null; 
  loading: boolean = false;
  weatherCategory: string = '';

  constructor(
    private http: HttpClient, 
    private weatherService: WeatherService
  ) {}

  searchWeather() {
    if (!this.city) return alert("Please enter a city.");
    this.loading = true;

    const geoUrl = `https://nominatim.openstreetmap.org/search?q=${this.city}&format=json`;
this.http.get<any[]>(geoUrl, {
  headers: { 'User-Agent': 'SmartJourneyApp/1.0' } // Nominatim requires a user-agent
}).subscribe({
      next: (res) => {
        if (res && res.length > 0) {
          this.fetchWeather(res[0].lat, res[0].lon);
        } else {
          this.loading = false;
          alert('City not found.');
        }
      },
      error: (err) => {
        console.error("Geo API Error:", err);
        this.loading = false;
      }
    });
  }

  fetchWeather(lat: string, lon: string) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m&timezone=auto`;

    this.http.get<any>(url).subscribe({
      next: (data) => {
        const temp = data.current.temperature_2m;
        const humidity = data.current.relative_humidity_2m;
        
        this.weatherCategory = (humidity > 80) ? 'Rainy' : (temp >= 25 ? 'Sunny' : 'Cloudy');
        this.weatherData = { temp, humidity };
        
        // Now call your custom API via the service
        this.fetchSuggestions(temp, humidity, this.weatherCategory);
      },
      error: (err) => {
        console.error("Weather API Error:", err);
        this.loading = false;
      }
    });
  }

  fetchSuggestions(temp: number, humidity: number, condition: string) {
    this.weatherService.getSuggestions(temp, humidity, condition).subscribe({
      next: (res) => {
        console.log("Data Received from .NET:", res);
        this.suggestionResult = res;
        this.loading = false;
      },
      error: (err) => {
        console.error("Critical API Error (Backend is likely failing):", err);
        this.loading = false;
      }
    });
  }
}