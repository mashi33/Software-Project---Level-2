import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerifyEmailChange } from './verify-email-change';

describe('VerifyEmailChange', () => {
  let component: VerifyEmailChange;
  let fixture: ComponentFixture<VerifyEmailChange>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyEmailChange]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerifyEmailChange);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
