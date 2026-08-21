import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BudgetHelp } from './budget-help';

describe('BudgetHelp', () => {
  let component: BudgetHelp;
  let fixture: ComponentFixture<BudgetHelp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BudgetHelp]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BudgetHelp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
