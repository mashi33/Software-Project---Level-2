import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TripTimelineComponent } from './trip-timeline';

describe('TripTimelineComponent', () => {
  let component: TripTimelineComponent;
  let fixture: ComponentFixture<TripTimelineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripTimelineComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TripTimelineComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
