import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TripCreate } from './trip-create';

describe('TripCreate', () => {
  let component: TripCreate;
  let fixture: ComponentFixture<TripCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TripCreate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
