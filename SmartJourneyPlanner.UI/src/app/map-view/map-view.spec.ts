import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { MapViewComponent } from './map-view';
import { PlacesService, PlacesResult } from '../services/places.service';

describe('MapViewComponent', () => {
  let component: MapViewComponent;
  let fixture: ComponentFixture<MapViewComponent>;
  let placesSubject: BehaviorSubject<PlacesResult | null>;
  let placesServiceMock: Partial<PlacesService>;

  let mockMapInstance: any;
  let mapCtorSpy: jasmine.Spy;
  let markerCtorSpy: any;
  let infoWindowCtorSpy: any;
  let createdMarkers: any[];

  beforeEach(async () => {
    placesSubject = new BehaviorSubject<PlacesResult | null>(null);
    placesServiceMock = {
      currentPlaces: placesSubject.asObservable(),
      selectPlace: jasmine.createSpy('selectPlace')
    };

    mockMapInstance = {
      setCenter: jasmine.createSpy('setCenter'),
      setZoom: jasmine.createSpy('setZoom')
    };

    createdMarkers = [];
    mapCtorSpy = jasmine.createSpy('Map').and.returnValue(mockMapInstance);

    class FakeMarker {
      setMap = jasmine.createSpy('setMap');
      setAnimation = jasmine.createSpy('setAnimation');
      _clickHandler: Function | undefined;
      constructor(opts: any) {
        Object.assign(this, opts);
        createdMarkers.push(this);
      }
      addListener(event: string, cb: Function) {
        this._clickHandler = cb;
      }
    }

    class FakeInfoWindow {
      open = jasmine.createSpy('open');
      constructor(_opts: any) {}
    }

    markerCtorSpy = FakeMarker as any;
    infoWindowCtorSpy = FakeInfoWindow as any;

    (window as any).google = {
      maps: {
        Map: mapCtorSpy,
        Marker: markerCtorSpy,
        InfoWindow: infoWindowCtorSpy,
        MapTypeId: { ROADMAP: 'roadmap' },
        Animation: { DROP: 'DROP', BOUNCE: 'BOUNCE' }
      }
    };

    await TestBed.configureTestingModule({
      imports: [MapViewComponent],
      providers: [
        { provide: PlacesService, useValue: placesServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MapViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    delete (window as any).google;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the #hotelMap container element', () => {
    const mapEl = fixture.nativeElement.querySelector('#hotelMap');
    expect(mapEl).toBeTruthy();
  });

  it('should initialize the Google Map once the script "loads" and the DOM is ready', fakeAsync(() => {
    tick();
    expect(mapCtorSpy).toHaveBeenCalled();
    expect(component.map).toBe(mockMapInstance);
  }));

  it('should not create a second map instance if initMap runs again', fakeAsync(() => {
    tick();
    mapCtorSpy.calls.reset();
    component.initMap();
    expect(mapCtorSpy).not.toHaveBeenCalled();
  }));

  it('should re-center the map when a new search result arrives and the map is ready', fakeAsync(() => {
    tick();
    placesSubject.next({ places: [], centerLat: 6.9271, centerLon: 79.8612 });
    expect(mockMapInstance.setCenter).toHaveBeenCalledWith({ lat: 6.9271, lng: 79.8612 });
    expect(mockMapInstance.setZoom).toHaveBeenCalledWith(13);
  }));

  it('should ignore a null result from currentPlaces', fakeAsync(() => {
    tick();
    mockMapInstance.setCenter.calls.reset();
    placesSubject.next(null);
    expect(mockMapInstance.setCenter).not.toHaveBeenCalled();
  }));

  it('should create a marker for each place that has valid coordinates', fakeAsync(() => {
    tick();
    const places = [
      { id: '1', name: 'Hotel A', address: 'Colombo', rating: 4.5, latitude: 6.93, longitude: 79.85 },
      { id: '2', name: 'No Coords Place', address: 'Kandy', rating: 4.0 },
    ];
    component.renderMapMarkers(places);
    expect(component.markers.length).toBe(1);
    expect(createdMarkers.length).toBe(1);
  }));

  it('should clear previous markers before rendering new ones', fakeAsync(() => {
    tick();
    component.renderMapMarkers([
      { id: '1', name: 'Hotel A', latitude: 6.93, longitude: 79.85 }
    ]);
    const firstMarker = component.markers[0];
    component.renderMapMarkers([
      { id: '2', name: 'Hotel B', latitude: 7.29, longitude: 80.63 }
    ]);
    expect(firstMarker.setMap).toHaveBeenCalledWith(null);
    expect(component.markers.length).toBe(1);
  }));

  it('should call placesService.selectPlace with the marker\'s place id when clicked', fakeAsync(() => {
    tick();
    component.renderMapMarkers([
      { id: 'place-1', name: 'Hotel A', latitude: 6.93, longitude: 79.85 }
    ]);
    const marker = createdMarkers[0];
    marker._clickHandler();
    expect(placesServiceMock.selectPlace).toHaveBeenCalledWith('place-1');
  }));

  it('should do nothing when renderMapMarkers is called before the map exists', () => {
    const freshFixture = TestBed.createComponent(MapViewComponent);
    const freshComponent = freshFixture.componentInstance;
    expect(() => freshComponent.renderMapMarkers([{ id: '1', latitude: 1, longitude: 1 }])).not.toThrow();
    expect(freshComponent.markers.length).toBe(0);
  });
});