import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { of, throwError, Observable } from 'rxjs';

import { WeatherSuggestionComponent } from './weather';          // ← correct path (your file)
import { WeatherService } from '../services/weather.service';   // ← adjust if needed

// ---------- MOCK that returns the same shape as your MongoDB backend ----------
class MockWeatherService {
  // Geocoding (your backend proxies Nominatim / Open-Meteo)
  getCoordinates(city: string) {
    return of({
      results: [
        {
          name: 'Colombo',
          country: 'Sri Lanka',
          admin1: 'Western Province',
          latitude: 6.9271,
          longitude: 79.8612,
          country_code: 'lk',
          display_name: 'Colombo, Western Province, Sri Lanka'
        }
      ]
    });
  }

  getCurrentWeather(lat: string, lon: string) {
    return of({
      current: {
        temperature_2m: 28.5,
        relative_humidity_2m: 75,
        wind_speed_10m: 12.3,
        precipitation: 0.2
      }
    });
  }

  getForecastWeather(lat: string, lon: string, date: string) {
    return of({
      daily: {
        temperature_2m_max: [31],
        temperature_2m_min: [24],
        relative_humidity_2m_mean: [70],
        wind_speed_10m_max: [15],
        precipitation_sum: [1.5]
      }
    });
  }

  getHistoricalWeather(lat: string, lon: string, date: string) {
    return of({
      daily: {
        temperature_2m_max: [29],
        temperature_2m_min: [22],
        relative_humidity_2m_mean: [80],
        wind_speed_10m_max: [10],
        precipitation_sum: [5]
      }
    });
  }

  getHourlyWeather(lat: string, lon: string, date: string): Observable<any> {
    return of({
      hourly: {
        time: [
          '2026-08-24T09:00', '2026-08-24T11:00', '2026-08-24T13:00',
          '2026-08-24T15:00', '2026-08-24T17:00', '2026-08-24T19:00',
          '2026-08-24T21:00', '2026-08-24T23:00'
        ],
        temperature_2m: [27, 29, 31, 30, 28, 26, 25, 24],
        precipitation: [0, 0.1, 0, 0.5, 1.2, 0.3, 0, 0],
        precipitation_probability: [10, 20, 15, 40, 60, 30, 10, 5],
        weather_code: [0, 1, 2, 51, 61, 3, 0, 0]
      }
    });
  }

  // This is the method your component actually calls for the main card
  getProcessedWeather(lat: string, lon: string, date: string): Observable<any> {
    return of({
      avgTemp: '27.5',
      humidity: 72,
      windSpeed: '11.5',
      precipitation: '0.8',
      condition: 'Cloudy',
      emoji: '☁️'
    });
  }

  getWeatherRange(lat: string, lon: string, selectedDate: string): Observable<any[]> {
    return of([
      { date: '2026-08-21', avgTemp: '26.0', humidity: 70, condition: 'Cloudy', emoji: '☁️' },
      { date: '2026-08-22', avgTemp: '27.5', humidity: 68, condition: 'Sunny',  emoji: '☀️' },
      { date: '2026-08-23', avgTemp: '28.0', humidity: 75, condition: 'Rainy',  emoji: '🌧️' },
      { date: '2026-08-24', avgTemp: '27.5', humidity: 72, condition: 'Cloudy', emoji: '☁️' },
      { date: '2026-08-25', avgTemp: '29.0', humidity: 65, condition: 'Sunny',  emoji: '☀️' },
      { date: '2026-08-26', avgTemp: '28.5', humidity: 70, condition: 'Cloudy', emoji: '☁️' },
      { date: '2026-08-27', avgTemp: '27.0', humidity: 80, condition: 'Rainy',  emoji: '🌧️' }
    ]);
  }

  // This is the endpoint that reads suggestions from MongoDB
  getSuggestions(temp: number, condition: string, date: string) {
    return of({
      condition: condition,
      message: 'Mild cloudy day – light layers recommended.',
      packing: ['Light jacket', 'Umbrella', 'Water bottle'],
      outfit: ['T-shirt', 'Jeans', 'Sneakers'],
      activity: ['City walk', 'Café hopping', 'Museum visit']
    });
  }
}

// Prevent Leaflet / SweetAlert2 from breaking tests
const mockLeaflet = {
  map: jasmine.createSpy('map').and.returnValue({
    setView: jasmine.createSpy('setView'),
    removeLayer: jasmine.createSpy('removeLayer')
  }),
  tileLayer: jasmine.createSpy('tileLayer').and.returnValue({
    addTo: jasmine.createSpy('addTo')
  }),
  circleMarker: jasmine.createSpy('circleMarker').and.returnValue({
    addTo: jasmine.createSpy('addTo').and.returnValue({
      bindPopup: jasmine.createSpy('bindPopup').and.returnValue({
        openPopup: jasmine.createSpy('openPopup')
      })
    })
  })
};

const mockSwal = {
  fire: jasmine.createSpy('fire').and.returnValue(Promise.resolve({ isConfirmed: true }))
};

describe('WeatherSuggestionComponent', () => {
  let component: WeatherSuggestionComponent;
  let fixture: ComponentFixture<WeatherSuggestionComponent>;
  let weatherService: WeatherService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [
        WeatherSuggestionComponent,   // standalone
        CommonModule,
        FormsModule,
        HttpClientTestingModule
      ],
      providers: [
        { provide: WeatherService, useClass: MockWeatherService }
      ]
    }).compileComponents();

    (window as any).L = mockLeaflet;
    (window as any).Swal = mockSwal;

    fixture = TestBed.createComponent(WeatherSuggestionComponent);
    component = fixture.componentInstance;
    weatherService = TestBed.inject(WeatherService);
    httpMock = TestBed.inject(HttpTestingController);

    // Avoid real map / IntersectionObserver side-effects
    spyOn(component as any, 'initMap').and.stub();
    spyOn(component as any, 'setupRevealObserver').and.stub();
    spyOn(component as any, 'observeReveals').and.stub();
    spyOn(component as any, 'scheduleReveal').and.stub();

    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  // ====================== BASIC ======================
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct default state', () => {
    expect(component.city).toBe('');
    expect(component.unit).toBe('C');
    expect(component.loading).toBeFalse();
    expect(component.showSearchHero).toBeTrue();
    expect(component.weatherData).toBeNull();
  });

  // ====================== LOCAL STORAGE ======================
  it('should load recent searches from localStorage', () => {
    localStorage.setItem('weather_search_history', JSON.stringify(['Kandy', 'Galle']));
    component.ngOnInit();
    expect(component.recentSearches).toEqual(['Kandy', 'Galle']);
  });

  it('should persist temperature unit', () => {
    component.setUnit('F');
    expect(component.unit).toBe('F');
    expect(localStorage.getItem('weather_unit_pref')).toBe('F');
  });

  // ====================== TEMPERATURE ======================
  it('should convert °C → °F correctly', () => {
    component.unit = 'F';
    expect(component.displayTemp(0)).toBe(32);
    expect(component.displayTemp(25)).toBe(77);
  });

  // ====================== VALIDATION ======================
  it('should reject empty / too short / invalid city names', () => {
    ['', '  ', 'ab', 'Colombo123', 'aaa'].forEach(bad => {
      component.city = bad;
      component.searchWeather();
      expect(component.loading).toBeFalse();
    });
    expect(mockSwal.fire).toHaveBeenCalled();
  });

  // ====================== SEARCH + MONGO-BACKED SUGGESTIONS ======================
it('should load weather and MongoDB suggestions for a valid city', fakeAsync(() => {
  spyOn(weatherService, 'getCoordinates').and.returnValue(
    of({
      results: [{
        name: 'Colombo',
        country: 'Sri Lanka',
        latitude: 6.9271,
        longitude: 79.8612,
        country_code: 'lk',
        display_name: 'Colombo, Western Province, Sri Lanka'
      }]
    })
  );

  component.city = 'Colombo';
  component.selectedDate = '2026-08-24';
  component.searchWeather();
  tick();

  // private fields → cast to any
  expect((component as any).lastLat).toBe('6.9271');
  expect((component as any).lastLon).toBe('79.8612');
  expect(component.weatherData).toBeTruthy();
  expect(component.suggestionResult).toBeTruthy();
  expect(component.suggestionResult!.packing.length).toBeGreaterThan(0);
  expect(component.loading).toBeFalse();
}));

it('should handle backend / MongoDB error gracefully', fakeAsync(() => {
  spyOn(weatherService, 'getProcessedWeather').and.returnValue(
    throwError(() => new Error('MongoDB connection failed'))
  );

  // private fields → cast to any
  (component as any).lastLat = '6.9271';
  (component as any).lastLon = '79.8612';
  (component as any).searchId = 1;

  component.loadWeather('6.9271', '79.8612');
  tick();

  expect(component.weatherData).toBeNull();
  expect(component.loading).toBeFalse();
  expect(mockSwal.fire).toHaveBeenCalled();
}));

// ====================== CALENDAR ======================
it('should generate calendar and select a day', fakeAsync(() => {
  component.calendarViewDate = new Date(2026, 7, 1); // August 2026
  component.generateInlineCalendar();
  expect(component.currentMonthName).toContain('August');

  // private fields → cast to any
  (component as any).lastLat = '6.9271';
  (component as any).lastLon = '79.8612';
  spyOn(component, 'loadWeather');

  component.selectDay(15);
  tick();

  expect(component.selectedDate).toBe('2026-08-15');
  expect(component.loadWeather).toHaveBeenCalled();
}));

  // ====================== HOURLY + RANGE ======================
  it('should build hourly forecast from API response', () => {
    const mock = {
      hourly: {
        time: ['2026-08-24T09:00','2026-08-24T11:00','2026-08-24T13:00',
               '2026-08-24T15:00','2026-08-24T17:00','2026-08-24T19:00',
               '2026-08-24T21:00','2026-08-24T23:00'],
        temperature_2m: [27,29,31,30,28,26,25,24],
        precipitation: [0,0.1,0,0.5,1.2,0.3,0,0],
        precipitation_probability: [10,20,15,40,60,30,10,5],
        weather_code: [0,1,2,51,61,3,0,0]
      }
    };

    (component as any).buildHourlyFromApi(mock, '2026-08-24');
    expect(component.hourlyForecast.length).toBe(8);
    expect(component.tempTrendPoints).toBeTruthy();
  });

  // ====================== RECENT SEARCHES ======================
  it('should keep only 5 unique recent searches', () => {
    component.recentSearches = ['London','Tokyo','New York','Paris','Sydney'];
    (component as any).addToRecentSearches('colombo');
    expect(component.recentSearches[0]).toBe('Colombo');
    expect(component.recentSearches.length).toBe(5);
  });
});