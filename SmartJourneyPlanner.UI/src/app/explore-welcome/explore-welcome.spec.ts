import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExploreWelcome } from './explore-welcome';

describe('ExploreWelcome', () => {
  let component: ExploreWelcome;
  let fixture: ComponentFixture<ExploreWelcome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExploreWelcome]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExploreWelcome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
