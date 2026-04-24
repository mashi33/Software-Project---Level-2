import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TripSummary } from './trip-summary';

describe('TripSummary', () => {
  let component: TripSummary;
  let fixture: ComponentFixture<TripSummary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripSummary]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TripSummary);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
