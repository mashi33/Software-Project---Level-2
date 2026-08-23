import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpenseForm } from './expense-form';
import { BudgetService } from '../services/budget';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

describe('ExpenseForm', () => {
  let component: ExpenseForm;
  let fixture: ComponentFixture<ExpenseForm>;

  const mockBudgetService = {
    addExpense: () => of({}),
    updateExpense: () => of({})
  };

  const mockActivatedRoute = {
    queryParams: of({ tripId: '12345' })
  };

  const mockRouter = {
    navigate: jasmine.createSpy('navigate')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseForm],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BudgetService, useValue: mockBudgetService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the expense form component', () => {
    expect(component).toBeTruthy();
  });

  it('should validate note/description properly', () => {
    expect(component.isNoteValid('Coffee 123')).toBeTruthy();
    expect(component.isNoteValid('12345')).toBeFalsy(); // Only numbers should be invalid
    expect(component.isNoteValid('')).toBeTruthy();     // Empty is handled by required check
  });

  it('should update category when selectCategory is called', () => {
    component.selectCategory('Transport');
    expect(component.expense.category).toEqual('Transport');
  });
});