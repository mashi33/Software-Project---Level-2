import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  // Backend base URL 
  private backendUrl = 'http://localhost:5233/api/weather';

  constructor(private http: HttpClient) {}

  // GEOCODING (Backend Proxy)
  getCoordinates(city: string) {
    const params = new HttpParams().set('city', city);
    return this.http.get<any>(`${this.backendUrl}/geocode`, { params });
  }

  //  CURRENT WEATHER 
  getCurrentWeather(lat: string, lon: string) {
    const params = new HttpParams()
      .set('latitude', lat)
      .set('longitude', lon);
    return this.http.get<any>(`${this.backendUrl}/forecast`, { params });
  }

  // FORECAST 
  getForecastWeather(lat: string, lon: string, date: string) {
    const params = new HttpParams()
      .set('latitude', lat)
      .set('longitude', lon)
      .set('start_date', date)
      .set('end_date', date);
    return this.http.get<any>(`${this.backendUrl}/forecast`, { params });
  }

  // HISTORICAL 
  getHistoricalWeather(lat: string, lon: string, date: string) {
    const params = new HttpParams()
      .set('latitude', lat)
      .set('longitude', lon)
      .set('start_date', date)
      .set('end_date', date);
    return this.http.get<any>(`${this.backendUrl}/archive`, { params });
  }

  //  HOURLY (real Open-Meteo) 
getHourlyWeather(lat: string, lon: string, date: string): Observable<any> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cleanDate = date.includes('T') ? date.split('T')[0] : date.trim();

  const selected = new Date(cleanDate);
  selected.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (selected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Too far ahead → do not call (prevents 400)
  if (diffDays > 16) {
    return new Observable((obs) => {
      obs.error(new Error('Date too far for hourly forecast'));
    });
  }

  const params = new HttpParams()
    .set('latitude', lat)
    .set('longitude', lon)
    .set('start_date', cleanDate)
    .set('end_date', cleanDate)
    .set('hourly', 'true');

  if (cleanDate < this.formatDate(today)) {
    return this.http.get<any>(`${this.backendUrl}/archive`, { params });
  }
  return this.http.get<any>(`${this.backendUrl}/forecast`, { params });
}

// small helper (add if not already present)
private formatDate(d: Date): string {
  return (
    `${d.getFullYear()}-` +
    `${String(d.getMonth() + 1).padStart(2, '0')}-` +
    `${String(d.getDate()).padStart(2, '0')}`
  );
}

  //  PROCESSED WEATHER 
  getProcessedWeather(lat: string, lon: string, date: string): Observable<any> {
  return new Observable((observer: any) => {
    const today = new Date().toISOString().split('T')[0];
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
        let windSpeed = 0;
        let precipitation = 0;

        if (cleanDate === today && data?.current) {
          avgTemp = data.current.temperature_2m ?? 0;
          humidity = data.current.relative_humidity_2m ?? 0;
          windSpeed = data.current.wind_speed_10m ?? 0;
          precipitation = data.current.precipitation ?? 0;
        } else if (data?.daily) {
          const tempMax = data.daily.temperature_2m_max?.[0];
          const tempMin = data.daily.temperature_2m_min?.[0];
          humidity = data.daily.relative_humidity_2m_mean?.[0] ?? 0;
          windSpeed = data.daily.wind_speed_10m_max?.[0] ?? 0;
          precipitation = data.daily.precipitation_sum?.[0] ?? 0;

          // Edge-date protection: empty arrays → don't force 0°C
          if (tempMax == null || tempMin == null || isNaN(tempMax) || isNaN(tempMin)) {
            observer.error(new Error('No daily data for this date'));
            return;
          }
          avgTemp = (tempMax + tempMin) / 2;
        } else {
          observer.error(new Error('No weather data available'));
          return;
        }

        let condition = 'Cloudy';
        let emoji = '☁️';
        if (humidity >= 80 || precipitation > 0) {
          condition = 'Rainy';
          emoji = '🌧️';
        } else if (avgTemp >= 25) {
          condition = 'Sunny';
          emoji = '☀️';
        }

        observer.next({
          avgTemp: Number(avgTemp).toFixed(1),
          humidity: humidity,
          windSpeed: Number(windSpeed).toFixed(1),
          precipitation: Number(precipitation).toFixed(1),
          condition: condition,
          emoji: emoji
        });
        observer.complete();
      },
      error: (err: any) => observer.error(err)
    });
  });
}

  // 7-DAY RANGE (selected date ± 3 days) – safe dates only 
getWeatherRange(lat: string, lon: string, selectedDate: string): Observable<any[]> {
  return new Observable((observer: any) => {
    const selected = new Date(selectedDate);
    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);

    const todayStr =
      `${todayObj.getFullYear()}-` +
      `${String(todayObj.getMonth() + 1).padStart(2, '0')}-` +
      `${String(todayObj.getDate()).padStart(2, '0')}`;

    const promises: { date: string; request: Observable<any> }[] = [];

    for (let i = -3; i <= 3; i++) {
      const newDate = new Date(selected);
      newDate.setDate(selected.getDate() + i);
      newDate.setHours(0, 0, 0, 0);

      const y = newDate.getFullYear();
      const m = String(newDate.getMonth() + 1).padStart(2, '0');
      const d = String(newDate.getDate()).padStart(2, '0');
      const formatted = `${y}-${m}-${d}`;

      // Skip dates more than 16 days ahead (Open-Meteo forecast limit → 400)
      const diffDays = Math.round(
        (newDate.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays > 16) {
        continue; // do not call API for this day
      }

      const request =
        formatted === todayStr
          ? this.getCurrentWeather(lat, lon)
          : formatted < todayStr
          ? this.getHistoricalWeather(lat, lon, formatted)
          : this.getForecastWeather(lat, lon, formatted);

      promises.push({ date: formatted, request });
    }

    if (promises.length === 0) {
      observer.next([]);
      observer.complete();
      return;
    }

    const results: any[] = [];
    let completed = 0;

    promises.forEach((item) => {
      item.request.subscribe({
        next: (data: any) => {
          let avgTemp = 0;
          let humidity = 0;
          let precipitation = 0;
          let valid = true;

          if (item.date === todayStr && data?.current) {
            avgTemp = data.current.temperature_2m ?? 0;
            humidity = data.current.relative_humidity_2m ?? 0;
            precipitation = data.current.precipitation ?? 0;
          } else if (data?.daily) {
            const tempMax = data.daily.temperature_2m_max?.[0];
            const tempMin = data.daily.temperature_2m_min?.[0];
            humidity = data.daily.relative_humidity_2m_mean?.[0] ?? 0;
            precipitation = data.daily.precipitation_sum?.[0] ?? 0;

            if (tempMax == null || tempMin == null || isNaN(tempMax) || isNaN(tempMin)) {
              valid = false;
            } else {
              avgTemp = (tempMax + tempMin) / 2;
            }
          } else {
            valid = false;
          }

          if (valid) {
            let condition = 'Cloudy';
            let emoji = '☁️';
            if (humidity >= 80 || precipitation > 0) {
              condition = 'Rainy';
              emoji = '🌧️';
            } else if (avgTemp >= 25) {
              condition = 'Sunny';
              emoji = '☀️';
            }

            results.push({
              date: item.date,
              avgTemp: Number(avgTemp).toFixed(1),
              humidity,
              condition,
              emoji
            });
          }

          completed++;
          if (completed === promises.length) {
            results.sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            observer.next(results);
            observer.complete();
          }
        },
        error: () => {
          // 400 or any error → just skip this day, do not break the whole range
          completed++;
          if (completed === promises.length) {
            results.sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            observer.next(results);
            observer.complete();
          }
        }
      });
    });
  });
}

  // SUGGESTIONS 
  getSuggestions(temp: number, condition: string, date: string) {
    const params = new HttpParams()
      .set('temp', temp.toString())
      .set('condition', condition)
      .set('date', date);
    return this.http.get<any>(`${this.backendUrl}/suggestions`, { params });
  }
}