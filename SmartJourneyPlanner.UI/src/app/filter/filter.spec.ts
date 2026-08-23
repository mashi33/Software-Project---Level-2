import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

import { FilterComponent } from './filter';
import { PlacesService } from '../services/places.service';

describe('FilterComponent', () => {
  let component: FilterComponent;
  let fixture: ComponentFixture<FilterComponent>;
  let placesServiceMock: jasmine.SpyObj<PlacesService>;

  beforeEach(async () => {
    placesServiceMock = jasmine.createSpyObj('PlacesService', ['fetchPlacesByCity']);

    await TestBed.configureTestingModule({
      imports: [FilterComponent],
      providers: [
        { provide: PlacesService, useValue: placesServiceMock },
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({}) } // no city/category in URL by default
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FilterComponent);
    component = fixture.componentInstance;

    // ngAfterViewInit tries to load the Google Maps script — cityInput
    // needs to exist for that not to throw, template already provides it.
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to Hotel category and budget/rating values', () => {
    expect(component.activeCategory).toBe('Hotel');
    expect(component.budgetControl.value).toBe(2);
    expect(component.ratingControl.value).toBe(3.5);
  });

  // ---------- performSearch guards ----------

  it('should not call fetchPlacesByCity when the search box is empty', () => {
    component.searchControl.setValue('');
    component.performSearch();

    expect(placesServiceMock.fetchPlacesByCity).not.toHaveBeenCalled();
  });

  it('should not call fetchPlacesByCity when the city name is under 3 characters', () => {
    component.searchControl.setValue('Ga');
    component.performSearch();

    expect(placesServiceMock.fetchPlacesByCity).not.toHaveBeenCalled();
  });

  it('should not call fetchPlacesByCity when the city was typed manually and not chosen from autocomplete suggestions', () => {
    // typing directly (not via the Google autocomplete listener) leaves
    // isValidSriLankaCity as false, which performSearch should block on
    component.searchControl.setValue('Galle');
    component.performSearch();

    expect(placesServiceMock.fetchPlacesByCity).not.toHaveBeenCalled();
  });

  it('should call fetchPlacesByCity with the current filters once a valid city is selected', () => {
    // simulate what initAutocomplete's place_changed listener does
    component.searchControl.setValue('Galle');
    (component as any).isValidSriLankaCity = true;

    component.budgetControl.setValue(3);
    component.ratingControl.setValue(4);
    component.distanceControl.setValue('5');

    component.performSearch();

    expect(placesServiceMock.fetchPlacesByCity).toHaveBeenCalledWith(
      'Galle',
      {
        category: 'Hotel',
        budget: 3,
        rating: 4,
        maxDistance: '5'
      },
      component.sessionToken
    );
  });

  it('should reset isValidSriLankaCity to false whenever the search box value changes', () => {
    component.searchControl.setValue('Galle');
    (component as any).isValidSriLankaCity = true;

    component.searchControl.setValue('Galle Fort'); // user keeps typing

    expect((component as any).isValidSriLankaCity).toBeFalse();
  });

  it('should mark hasSearched as true after a successful search', () => {
    component.searchControl.setValue('Kandy');
    (component as any).isValidSriLankaCity = true;

    expect(component.hasSearched).toBeFalse();
    component.performSearch();
    expect(component.hasSearched).toBeTrue();
  });

  // ---------- changeCategory ----------

  it('should update activeCategory when changeCategory is called', () => {
    component.changeCategory('Restaurant');
    expect(component.activeCategory).toBe('Restaurant');
  });

  it('should generate a new sessionToken when changing category', () => {
    const oldToken = component.sessionToken;
    component.changeCategory('Restaurant');
    expect(component.sessionToken).not.toBe(oldToken);
  });

  it('should not trigger a new search on changeCategory if no search has happened yet', fakeAsync(() => {
    component.changeCategory('Restaurant');
    tick(500);

    expect(placesServiceMock.fetchPlacesByCity).not.toHaveBeenCalled();
  }));

  it('should trigger a debounced re-search on changeCategory once a search has already happened', fakeAsync(() => {
    component.searchControl.setValue('Kandy');
    (component as any).isValidSriLankaCity = true;
    component.performSearch();
    placesServiceMock.fetchPlacesByCity.calls.reset();

    component.changeCategory('Restaurant');
    tick(300); // matches the 300ms debounce in changeCategory

    expect(placesServiceMock.fetchPlacesByCity).toHaveBeenCalled();
  }));

  // ---------- filter control debouncing ----------

  it('should not re-search when budget changes before a search has happened', fakeAsync(() => {
    component.budgetControl.setValue(4);
    tick(800);

    expect(placesServiceMock.fetchPlacesByCity).not.toHaveBeenCalled();
  }));

  it('should re-search when budget changes after a search has already happened', fakeAsync(() => {
    component.searchControl.setValue('Kandy');
    (component as any).isValidSriLankaCity = true;
    component.performSearch();
    placesServiceMock.fetchPlacesByCity.calls.reset();

    component.budgetControl.setValue(4);
    tick(800);

    expect(placesServiceMock.fetchPlacesByCity).toHaveBeenCalled();
  }));
});