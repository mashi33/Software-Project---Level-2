import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class WeatherService {
  
  private apiUrl = 'http://localhost:5233/api/weather/suggestions'; 

  constructor(private http: HttpClient) {}

  getSuggestions(temp: number, humidity: number, condition: string) {
    return this.http.get<any>(`${this.apiUrl}?temp=${temp}&humidity=${humidity}&condition=${condition}`);
  }
}