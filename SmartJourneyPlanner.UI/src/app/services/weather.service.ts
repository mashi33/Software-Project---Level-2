import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {

  private apiUrl =
    'http://localhost:5233/api/weather/suggestions';

  constructor(private http: HttpClient) {}

  // =========================
  // GET CITY COORDINATES
  // =========================
  getCoordinates(city: string) {

    const geoUrl =
      `https://nominatim.openstreetmap.org/search?q=${city}&format=json`;

    return this.http.get<any[]>(geoUrl);
  }

  // =========================
  // CURRENT WEATHER
  // =========================
  getCurrentWeather(
    lat: string,
    lon: string
  ) {

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m`;

    return this.http.get<any>(url);
  }

  // =========================
  // HISTORICAL WEATHER
  // =========================
  getHistoricalWeather(
    lat: string,
    lon: string,
    date: string
  ) {

    const url =
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${date}&end_date=${date}&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean`;

    return this.http.get<any>(url);
  }

  // =========================
  // FORECAST WEATHER
  // =========================
  getForecastWeather(
    lat: string,
    lon: string,
    date: string
  ) {

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean&start_date=${date}&end_date=${date}`;

    return this.http.get<any>(url);
  }

  // =========================
  // COMMON WEATHER PROCESSOR
  // NO DUPLICATION
  // =========================
  getProcessedWeather(
    lat: string,
    lon: string,
    date: string
  ): Observable<any> {

    return new Observable((observer: any) => {

      const today =
        new Date().toISOString().split('T')[0];

        const cleanDate = date.includes('T') ? date.split('T')[0] : date.trim();

      const request =
        cleanDate === today
          ? this.getCurrentWeather(lat, lon)
          : cleanDate < today
          ? this.getHistoricalWeather(lat, lon, cleanDate)
          : this.getForecastWeather(lat, lon, cleanDate);

      request.subscribe({

        next: (data: any) => {

          let avgTemp = 0;
          let humidity = 0;

          // CURRENT WEATHER
          if (cleanDate === today) {

            avgTemp =
              data.current.temperature_2m;

            humidity =
              data.current.relative_humidity_2m;
          }

          // FORECAST / HISTORY
          else {

            const tempMax =
              data.daily.temperature_2m_max[0];

            const tempMin =
              data.daily.temperature_2m_min[0];

            humidity =
              data.daily.relative_humidity_2m_mean[0];

            avgTemp =
              (tempMax + tempMin) / 2;
          }

          // WEATHER CONDITION
          let condition = 'Cloudy';
          let emoji = '☁️';

          if (humidity >= 80) {

            condition = 'Rainy';
            emoji = '🌧️';

          } else if (avgTemp >= 25) {

            condition = 'Sunny';
            emoji = '☀️';
          }

          observer.next({

            avgTemp: avgTemp.toFixed(1),

            humidity: humidity,

            condition: condition,

            emoji: emoji
          });

          observer.complete();
        },

        error: (err: any) => {
          observer.error(err);
        }
      });
    });
  }


  // =========================
// GET 3 DAYS BEFORE + AFTER
// =========================
getWeatherRange(lat: string, lon: string, selectedDate: string): Observable<any[]> {
    return new Observable((observer: any) => {
      const selected = new Date(selectedDate);
      const promises: any[] = [];

      const todayObj = new Date();
      const offset = todayObj.getTimezoneOffset();
      const localToday = new Date(todayObj.getTime() - (offset * 60 * 1000));
      const todayStr = localToday.toISOString().split('T')[0]

      for (let i = -3; i <= 3; i++) {
        const newDate = new Date(selected);
        newDate.setDate(selected.getDate() + i);
        const formatted = newDate.toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];

        // Fix: If it's today, we must fetch CURRENT weather parameters alongside daily data
        // to match your top panel metrics.
        let request = formatted === todayStr
          ? this.getCurrentWeather(lat, lon)
          : formatted < todayStr
          ? this.getHistoricalWeather(lat, lon, formatted)
          : this.getForecastWeather(lat, lon, formatted);

        promises.push({ date: formatted, request: request });
      }

      const results: any[] = [];
      let completed = 0;

      promises.forEach((item) => {
        item.request.subscribe({
          next: (data: any) => {
            let avgTemp = 0;
            let humidity = 0;

            // Fix: Fall back gracefully if the item date matches todayStr but data structure varies
            if (item.date === todayStr && data.current) {
              avgTemp = data.current.temperature_2m;
              humidity = data.current.relative_humidity_2m;
            } else if (data.daily) {
              const tempMax = data.daily.temperature_2m_max[0];
              const tempMin = data.daily.temperature_2m_min[0];
              humidity = data.daily.relative_humidity_2m_mean[0];
              avgTemp = (tempMax + tempMin) / 2;
            } else {
              // Fallback just in case an API edge-case occurs
              avgTemp = 25;
              humidity = 70;
            }

            let condition = 'Cloudy';
            let emoji = '☁️';

            if (humidity >= 80) {
              condition = 'Rainy';
              emoji = '🌧️';
            } else if (avgTemp >= 25) {
              condition = 'Sunny';
              emoji = '☀️';
            }

            results.push({
              date: item.date,
              avgTemp: avgTemp.toFixed(1),
              humidity: humidity,
              condition: condition,
              emoji: emoji
            });

            completed++;
            if (completed === promises.length) {
              results.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
              observer.next(results);
              observer.complete();
            }
          },
          error: (err: any) => {
            console.error('Range weather item failed for date: ' + item.date, err);
            completed++;
            if (completed === promises.length) {
              observer.next(results);
              observer.complete();
            }
          }
        });
      });
    });
  }
  // =========================
  // WEATHER SUGGESTIONS
  // =========================
  getSuggestions(
    temp: number,
    condition: string,
    date: string
  ) {

    const params = new HttpParams()
      .set('temp', temp.toString())
      .set('condition', condition)
      .set('date', date);

    return this.http.get<any>(
      this.apiUrl,
      { params }
    );
  }
}