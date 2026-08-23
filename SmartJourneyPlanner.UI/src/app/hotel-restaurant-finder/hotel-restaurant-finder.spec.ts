import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { HotelRestaurantFinder } from './hotel-restaurant-finder';
import { PlacesService } from '../services/places.service';

describe('HotelRestaurantFinder', () => {
  let component: HotelRestaurantFinder;
  let fixture: ComponentFixture<HotelRestaurantFinder>;
  let routerMock: jasmine.SpyObj<Router>;
  let placesServiceMock: jasmine.SpyObj<PlacesService>;

  beforeEach(async () => {
    routerMock = jasmine.createSpyObj('Router', ['navigate']);
    placesServiceMock = jasmine.createSpyObj(
      'PlacesService',
      ['clearPlaces'],
      {
        // PlaceCardListComponent (rendered inside this parent's template)
        // subscribes to these in its own ngOnInit, so the mock needs them too.
        currentPlaces: of(null),
        selectedPlaceId: of(null),
        isLoading$: of(false),
      }
    );

    await TestBed.configureTestingModule({
      imports: [HotelRestaurantFinder, HttpClientTestingModule],
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: PlacesService, useValue: placesServiceMock },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HotelRestaurantFinder);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should clear previous places on init', () => {
    expect(placesServiceMock.clearPlaces).toHaveBeenCalled();
  });

  it('should navigate to /explore when goBack is called', () => {
    component.goBack();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/explore']);
  });

  it('should navigate to /explore/route-optimization when viewRoute is called', () => {
    component.viewRoute();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/explore/route-optimization']);
  });

  // NOTE: quick-city chips are decorative only (not meant to trigger a
  // real search), so onQuickCitySearch intentionally stays a no-op/log.
  it('should currently just log the city for onQuickCitySearch (decorative only, not wired to search)', () => {
    const consoleSpy = spyOn(console, 'log');
    component.onQuickCitySearch('Colombo');
    expect(consoleSpy).toHaveBeenCalledWith('Quick search for city:', 'Colombo');
  });
});