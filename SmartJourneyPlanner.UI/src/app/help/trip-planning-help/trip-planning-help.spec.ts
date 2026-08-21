import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TripPlanningHelp } from './trip-planning-help';

describe('TripPlanningHelp', () => {
  let component: TripPlanningHelp;
  let fixture: ComponentFixture<TripPlanningHelp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripPlanningHelp]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TripPlanningHelp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
