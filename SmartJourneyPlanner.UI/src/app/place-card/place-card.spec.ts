import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';

import { PlaceCardListComponent } from './place-card';
import { PlacesService, PlacesResult } from '../services/places.service';
import { AuthService } from '../services/auth.service';

describe('PlaceCardListComponent', () => {
  let component: PlaceCardListComponent;
  let fixture: ComponentFixture<PlaceCardListComponent>;

  // Mock subjects so we can push values into the component like the real service would
  let placesSubject: BehaviorSubject<PlacesResult | null>;
  let selectedPlaceSubject: BehaviorSubject<string | null>;
  let isLoadingSubject: BehaviorSubject<boolean>;

  let placesServiceMock: Partial<PlacesService>;
  let authServiceMock: Partial<AuthService>;

  beforeEach(async () => {
    placesSubject = new BehaviorSubject<PlacesResult | null>(null);
    selectedPlaceSubject = new BehaviorSubject<string | null>(null);
    isLoadingSubject = new BehaviorSubject<boolean>(false);

    placesServiceMock = {
      currentPlaces: placesSubject.asObservable(),
      selectedPlaceId: selectedPlaceSubject.asObservable(),
      isLoading$: isLoadingSubject.asObservable(),
    };

    authServiceMock = {
      getToken: () => null
    };

    await TestBed.configureTestingModule({
      imports: [PlaceCardListComponent, HttpClientTestingModule],
      providers: [
        { provide: PlacesService, useValue: placesServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PlaceCardListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    const httpMock = TestBed.inject(HttpTestingController);
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ---------- Initial / empty / loading states ----------

  it('should show the initial empty state when places is null and not loading', () => {
    placesSubject.next(null);
    isLoadingSubject.next(false);
    fixture.detectChanges();

    const initialState = fixture.nativeElement.querySelector('.initial-state');
    expect(initialState).toBeTruthy();
  });

  it('should show skeleton cards while loading', () => {
    isLoadingSubject.next(true);
    fixture.detectChanges();

    const skeletons = fixture.nativeElement.querySelectorAll('.skeleton-card');
    expect(skeletons.length).toBe(component.skeletonItems.length);
  });

  it('should show "no places found" empty state when places is an empty array', () => {
    isLoadingSubject.next(false);
    placesSubject.next({ places: [], centerLat: 0, centerLon: 0 });
    fixture.detectChanges();

    const emptyState = fixture.nativeElement.querySelector('.empty-state');
    expect(emptyState).toBeTruthy();
    expect(emptyState.textContent).toContain('No places found');
  });

  it('should render one card per place when places is populated', () => {
    const mockPlaces = [
      { id: '1', name: 'Hotel A', address: 'Colombo', rating: 4.5, priceLevel: 2 },
      { id: '2', name: 'Hotel B', address: 'Kandy', rating: 3.8, priceLevel: 1 },
    ];
    isLoadingSubject.next(false);
    placesSubject.next({ places: mockPlaces, centerLat: 0, centerLon: 0 });
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.place-card');
    expect(cards.length).toBe(2);
  });

  // ---------- Selection / scroll ----------

  it('should update selectedPlaceId when the service emits a new selection', () => {
    selectedPlaceSubject.next('abc123');
    fixture.detectChanges();

    expect(component.selectedPlaceId).toBe('abc123');
  });

  // ---------- quickSearch ----------

  it('should emit quickCitySelected with the chosen city when quickSearch is called', () => {
    const emitSpy = spyOn(component.quickCitySelected, 'emit');

    component.quickSearch('Colombo');

    expect(emitSpy).toHaveBeenCalledWith('Colombo');
  });

  // ---------- isAlreadyAddedToTrip ----------

  it('should return false from isAlreadyAddedToTrip when localStorage is empty', () => {
    localStorage.removeItem('tripPlaces');
    expect(component.isAlreadyAddedToTrip('place1', 'trip1')).toBeFalse();
  });

  it('should return true from isAlreadyAddedToTrip when the placeId+tripId pair already exists', () => {
    localStorage.setItem('tripPlaces', JSON.stringify([
      { placeId: 'place1', tripId: 'trip1' }
    ]));

    expect(component.isAlreadyAddedToTrip('place1', 'trip1')).toBeTrue();

    localStorage.removeItem('tripPlaces');
  });

  it('should return false from isAlreadyAddedToTrip when placeId matches but tripId differs', () => {
    localStorage.setItem('tripPlaces', JSON.stringify([
      { placeId: 'place1', tripId: 'trip1' }
    ]));

    expect(component.isAlreadyAddedToTrip('place1', 'trip2')).toBeFalse();

    localStorage.removeItem('tripPlaces');
  });

  // ---------- addToTrip: not logged in ----------

  it('should not call http.get when addToTrip is called without a token', async () => {
    authServiceMock.getToken = () => null;
    const httpMock = TestBed.inject(HttpTestingController);

    await component.addToTrip({ placeId: 'p1', name: 'Test Place' });

    httpMock.expectNone(() => true);
  });
});