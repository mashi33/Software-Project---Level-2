import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerifyEmailChangeComponent } from './verify-email-change';

describe('VerifyEmailChange', () => {
  let component: VerifyEmailChangeComponent;
  let fixture: ComponentFixture<VerifyEmailChangeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyEmailChangeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerifyEmailChangeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
