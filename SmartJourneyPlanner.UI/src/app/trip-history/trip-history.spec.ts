import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TripHistory } from './trip-history';

describe('TripHistory', () => {
  let component: TripHistory;
  let fixture: ComponentFixture<TripHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripHistory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TripHistory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
