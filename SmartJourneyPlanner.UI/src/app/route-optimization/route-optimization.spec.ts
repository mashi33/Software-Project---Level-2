import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RouteOptimization } from './route-optimization';

describe('RouteOptimization', () => {
  let component: RouteOptimization;
  let fixture: ComponentFixture<RouteOptimization>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouteOptimization]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RouteOptimization);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
