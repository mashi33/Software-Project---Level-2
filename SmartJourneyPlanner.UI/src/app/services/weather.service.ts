import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class WeatherService {

  private apiUrl = 'http://localhost:5233/api/weather/suggestions';

  constructor(private http: HttpClient) {}

  getCoordinates(city: string) {
    const geoUrl = `https://nominatim.openstreetmap.org/search?q=${city}&format=json`;
    return this.http.get<any[]>(geoUrl);
  }

  getCurrentWeather(lat: string, lon: string) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m`;
  return this.http.get<any>(url);
  }

  getHistoricalWeather(lat: string, lon: string, date: string) {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${date}&end_date=${date}&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean`;
  return this.http.get<any>(url);
  }

  getForecastWeather(lat: string, lon: string, date: string) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean&start_date=${date}&end_date=${date}`;
  return this.http.get<any>(url);
  }

  getSuggestions(temp: number, condition: string, date: string) {
    const params = new HttpParams()
      .set('temp', temp.toString())
      .set('condition', condition)
      .set('date', date)

    return this.http.get<any>(this.apiUrl, { params });
  }
}