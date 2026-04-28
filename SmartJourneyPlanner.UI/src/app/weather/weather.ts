import { Component } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

  constructor(private http: HttpClient, private weatherService: WeatherService) {}

  searchWeather() {
    if (!this.city) return;
    this.loading = true;
    this.suggestionResult = null;

    const geoUrl = `https://nominatim.openstreetmap.org/search?q=${this.city}&format=json`;
    this.http.get<any[]>(geoUrl).subscribe({
      next: (res) => {
        if (res?.length > 0) this.fetchWeather(res[0].lat, res[0].lon);
        else { alert('City not found.'); this.loading = false; }
      },
      error: () => { alert('Geo API failed.'); this.loading = false; }
    });
  }

  private fetchWeather(lat: string, lon: string) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m`;
    
    this.http.get<any>(url).subscribe({
      next: (data) => {
        const { temperature_2m: temp, relative_humidity_2m: humidity } = data.current;
        
        
        if (humidity >= 80) {
          this.weatherCategory = 'Rainy';
        } else if (temp >= 25) {
          this.weatherCategory = 'Sunny';
        } else {
          this.weatherCategory = 'Cloudy';
        }
        
        this.weatherData = { temp, humidity };
        this.getBackendSuggestion(temp, this.weatherCategory);
      },
      error: () => { alert('Weather API failed.'); this.loading = false; }
    });
  }

  private getBackendSuggestion(temp: number, condition: string) {
    // Prevents API request errors by ensuring parameters are URL-safe.
    const params = new HttpParams()
        .set('temp', temp.toString())
        .set('condition', condition);

    this.http.get<WeatherRule>('http://localhost:5233/api/weather/suggestions', { params }).subscribe({
      next: (res) => {
        this.suggestionResult = res;
        this.loading = false;
      },
      error: () => {
        console.warn("No suggestions found in database for condition:", condition);
        this.suggestionResult = null;
        this.loading = false;
      }
    });
  }
}