import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HotelRestaurantFinder } from './hotel-restaurant-finder';


describe('HotelRestaurantFinder', () => {
  let component: HotelRestaurantFinder;
  let fixture: ComponentFixture<HotelRestaurantFinder>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HotelRestaurantFinder]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HotelRestaurantFinder);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
