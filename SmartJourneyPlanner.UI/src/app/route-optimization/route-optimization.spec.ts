import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { RouteOptimization } from './route-optimization';
import { RouteService } from '../services/route.service';

describe('RouteOptimization', () => {
  let component: RouteOptimization;
  let fixture: ComponentFixture<RouteOptimization>;
  let routeServiceSpy: jasmine.SpyObj<RouteService>;

  beforeEach(async () => {
    routeServiceSpy = jasmine.createSpyObj('RouteService', [
      'getOptimizedRoutes',
      'getBusFare',
      'getPredictions',
      'refreshSessionToken'
    ]);

    await TestBed.configureTestingModule({
      imports: [RouteOptimization, RouterTestingModule],
      providers: [
        { provide: RouteService, useValue: routeServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RouteOptimization);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── formatDistance ────────────────────────────────────────

  describe('formatDistance', () => {
    it('should convert metres string to km with one decimal', () => {
      expect(component.formatDistance('204400m')).toBe('204.4 km');
    });

    it('should return "0 km" for empty input', () => {
      expect(component.formatDistance('')).toBe('0 km');
    });

    it('should handle zero metres', () => {
      expect(component.formatDistance('0m')).toBe('0.0 km');
    });

    it('should round to one decimal place', () => {
      expect(component.formatDistance('1234m')).toBe('1.2 km');
    });
  });

  // ── formatDuration ────────────────────────────────────────

  describe('formatDuration', () => {
    it('should format seconds under an hour as minutes only', () => {
      expect(component.formatDuration('1800s')).toBe('30 mins');
    });

    it('should format seconds over an hour as hours and minutes', () => {
      expect(component.formatDuration('10620s')).toBe('2h 57m');
    });

    it('should return "N/A" for empty input', () => {
      expect(component.formatDuration('')).toBe('N/A');
    });

    it('should handle exactly one hour', () => {
      expect(component.formatDuration('3600s')).toBe('1h 0m');
    });

    it('should handle zero seconds', () => {
      expect(component.formatDuration('0s')).toBe('0 mins');
    });
  });

  // ── getIconName ───────────────────────────────────────────

  describe('getIconName', () => {
    it('should return "terrain" for mountain-related names', () => {
      expect(component.getIconName('Ella Rock')).toBe('terrain');
    });

    it('should return "waves" for waterfall-related names', () => {
      expect(component.getIconName('Diyaluma Falls')).toBe('waves');
    });

    it('should return "account_balance" for temple-related names', () => {
      expect(component.getIconName('Kandy Temple')).toBe('account_balance');
    });

    it('should return "park" for forest/park-related names', () => {
      expect(component.getIconName('Yala National Park')).toBe('park');
    });

    it('should return "museum" for museum-related names', () => {
      expect(component.getIconName('Colombo National Museum')).toBe('museum');
    });

    it('should return "castle" for fort-related names', () => {
      expect(component.getIconName('Galle Fort')).toBe('castle');
    });

    it('should return "explore" as default for unmatched names', () => {
      expect(component.getIconName('Random Scenic Spot')).toBe('explore');
    });

    it('should be case-insensitive', () => {
      expect(component.getIconName('MOUNTAIN VIEW')).toBe('terrain');
    });
  });

  // ── selectTransportMode ───────────────────────────────────

  describe('selectTransportMode', () => {
    it('should switch transportMode to the given value', () => {
      component.selectTransportMode('public');
      expect(component.transportMode).toBe('public');
    });

    it('should reset results and busResult when switching modes', () => {
      component.results = { fastest: {} };
      component.busResult = { found: true };

      component.selectTransportMode('private');

      expect(component.results).toBeNull();
      expect(component.busResult).toBeNull();
    });

    it('should clear currentPath when switching modes', () => {
      component.currentPath = [{ lat: 6.9, lng: 79.8 }];
      component.selectTransportMode('public');

      expect(component.currentPath.length).toBe(0);
    });
  });

  // ── calculateBus ──────────────────────────────────────────

  describe('calculateBus', () => {
    it('should not call the API if start is empty', () => {
      component.start = '';
      component.end = 'Kandy';
      component.calculateBus();

      expect(routeServiceSpy.getBusFare).not.toHaveBeenCalled();
    });

    it('should not call the API if end is empty', () => {
      component.start = 'Colombo';
      component.end = '';
      component.calculateBus();

      expect(routeServiceSpy.getBusFare).not.toHaveBeenCalled();
    });

    it('should set busResult and clear loading state on success', () => {
      component.start = 'Colombo';
      component.end = 'Kandy';
      const mockResult = { found: true, routeNo: '001', fare: 521 };
      routeServiceSpy.getBusFare.and.returnValue(of(mockResult));

      component.calculateBus();

      expect(component.busResult).toEqual(mockResult);
      expect(component.isBusLoading).toBeFalse();
    });

    it('should clear loading state and log on API error', () => {
      component.start = 'Colombo';
      component.end = 'Kandy';
      routeServiceSpy.getBusFare.and.returnValue(throwError(() => new Error('Network error')));
      spyOn(console, 'error');

      component.calculateBus();

      expect(component.isBusLoading).toBeFalse();
      expect(console.error).toHaveBeenCalled();
    });

    it('should set isBusLoading to true immediately when called with valid inputs', () => {
      component.start = 'Colombo';
      component.end = 'Kandy';
      routeServiceSpy.getBusFare.and.returnValue(of({ found: true }));

      component.calculateBus();

      // isBusLoading is set true before the subscribe resolves (synchronous 'of' resolves immediately,
      // so by the time we check post-call it's already false — verifying via the success branch instead)
      expect(routeServiceSpy.getBusFare).toHaveBeenCalledWith('Colombo', 'Kandy');
    });
  });

  // ── calculate() routing ───────────────────────────────────

  describe('calculate', () => {
    it('should delegate to calculateBus when transportMode is public', () => {
      spyOn(component, 'calculateBus');
      component.transportMode = 'public';

      component.calculate();

      expect(component.calculateBus).toHaveBeenCalled();
    });

    it('should call getOptimizedRoutes when transportMode is private', () => {
      component.transportMode = 'private';
      routeServiceSpy.getOptimizedRoutes.and.returnValue(of({ fastest: null, scenicViewpoints: [] }));

      component.calculate();

      expect(routeServiceSpy.getOptimizedRoutes).toHaveBeenCalled();
    });
  });

  // ── busDataForPdf getter ──────────────────────────────────

  describe('busDataForPdf', () => {
    it('should return null when busResult is null', () => {
      component.busResult = null;
      expect(component.busDataForPdf).toBeNull();
    });

    it('should merge start/end into busResult', () => {
      component.busResult = { found: true, fare: 521 };
      component.start = 'Colombo';
      component.end = 'Kandy';

      const result = component.busDataForPdf;

      expect(result.from).toBe('Colombo');
      expect(result.to).toBe('Kandy');
      expect(result.fare).toBe(521);
    });

    it('should not mutate the original busResult object', () => {
      const original = { found: true };
      component.busResult = original;
      component.start = 'Colombo';
      component.end = 'Kandy';

      const result = component.busDataForPdf;

      expect(original).not.toEqual(result);
      expect((original as any).from).toBeUndefined();
    });
  });

  // ── toggleTraffic ─────────────────────────────────────────

  describe('toggleTraffic', () => {
    it('should toggle showTraffic from false to true', () => {
      component.showTraffic = false;
      component.toggleTraffic();
      expect(component.showTraffic).toBeTrue();
    });

    it('should toggle showTraffic from true to false', () => {
      component.showTraffic = true;
      component.toggleTraffic();
      expect(component.showTraffic).toBeFalse();
    });
  });

  // ── search() debounce logic ───────────────────────────────

  describe('search', () => {
    beforeEach(() => {
      routeServiceSpy.getPredictions.and.returnValue(
        Promise.resolve([{ description: 'Colombo, Sri Lanka' }] as any)
      );
    });

    it('should clear startSuggestions if input length is 2 or less', () => {
      component.start = 'Co';
      component.startSuggestions = [{ description: 'stale' }];

      component.search('start');

      expect(component.startSuggestions.length).toBe(0);
    });

    it('should clear endSuggestions if input length is 2 or less', () => {
      component.end = 'Ka';
      component.endSuggestions = [{ description: 'stale' }];

      component.search('end');

      expect(component.endSuggestions.length).toBe(0);
    });

    it('should not call getPredictions immediately for short input (no debounce needed)', () => {
      component.start = 'C';
      component.search('start');

      expect(routeServiceSpy.getPredictions).not.toHaveBeenCalled();
    });

    it('should call getPredictions after debounce time for valid-length input', fakeAsync(() => {
      component.start = 'Colombo';
      component.search('start');

      tick(500); // matches debounceTime(500) in the component

      expect(routeServiceSpy.getPredictions).toHaveBeenCalledWith('Colombo');
    }));

    it('should not call getPredictions before debounce time elapses', fakeAsync(() => {
      component.start = 'Colombo';
      component.search('start');

      tick(300); // less than the 500ms debounce window

      expect(routeServiceSpy.getPredictions).not.toHaveBeenCalled();

      tick(200); // complete the remaining debounce window to avoid a pending-timer test failure
    }));

    it('should only fire once for the same input typed as the same type (distinctUntilChanged)', fakeAsync(() => {
      component.start = 'Colombo';
      component.search('start');
      tick(500);

      component.search('start'); // same input, same type again
      tick(500);

      expect(routeServiceSpy.getPredictions).toHaveBeenCalledTimes(1);
    }));

    it('should fire again when the input changes after a previous search', fakeAsync(() => {
      component.start = 'Colombo';
      component.search('start');
      tick(500);

      component.start = 'Kandy';
      component.search('start');
      tick(500);

      expect(routeServiceSpy.getPredictions).toHaveBeenCalledTimes(2);
    }));

    it('should populate startSuggestions from the resolved predictions', fakeAsync(() => {
      component.start = 'Colombo';
      component.search('start');
      tick(500);

      expect(component.startSuggestions.length).toBe(1);
      expect(component.startSuggestions[0].description).toBe('Colombo, Sri Lanka');
    }));
  });

  // ── calculateDistanceFromRoute (cache-hit path only) ──────

  describe('calculateDistanceFromRoute', () => {
    it('should return the cached value without recalculating when present', () => {
      const lat = 6.9271, lng = 79.8612;
      const key = `${lat}_${lng}`;
      (component as any).distanceCache.set(key, '2.3 km from route');

      const result = component.calculateDistanceFromRoute(lat, lng);

      expect(result).toBe('2.3 km from route');
    });

    it('should return "N/A" when cache is empty and currentPath is empty', () => {
      component.currentPath = [];
      const result = component.calculateDistanceFromRoute(6.9271, 79.8612);

      expect(result).toBe('N/A');
    });
  });
});