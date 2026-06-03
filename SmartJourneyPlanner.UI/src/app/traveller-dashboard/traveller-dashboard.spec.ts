import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TravellerDashboard } from './traveller-dashboard';

describe('TravellerDashboard', () => {
  let component: TravellerDashboard;
  let fixture: ComponentFixture<TravellerDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TravellerDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TravellerDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
