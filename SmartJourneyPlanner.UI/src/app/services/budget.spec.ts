import { TestBed } from '@angular/core/testing';
import { BudgetService } from './budget';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';

describe('BudgetService', () => {
  let service: BudgetService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/Budget`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BudgetService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(BudgetService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch budget by tripId via GET', () => {
    const dummyBudget = { tripId: '123', totalSpent: 500, expenses: [] };
    const tripId = '123';

    service.getBudget(tripId).subscribe(budget => {
      expect(budget).toEqual(dummyBudget);
    });

    const req = httpMock.expectOne(`${apiUrl}/trip/${tripId}`);
    expect(req.request.method).toBe('GET');
    req.flush(dummyBudget);
  });

  it('should add an expense via POST', () => {
    const dummyExpense = { description: 'Hotel', amount: 15000 };
    const tripId = '123';

    service.addExpense(tripId, dummyExpense).subscribe(response => {
      expect(response).toBeTruthy();
    });

    const req = httpMock.expectOne(`${apiUrl}/add-expense/${tripId}`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dummyExpense);
    req.flush({ message: 'Success' });
  });

  it('should delete an expense via DELETE', () => {
    const tripId = '123';
    const expenseId = 'exp1';

    service.deleteExpense(tripId, expenseId).subscribe(response => {
      expect(response).toBeTruthy();
    });

    const req = httpMock.expectOne(`${apiUrl}/delete-expense/${tripId}/${expenseId}`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Deleted' });
  });

  it('should update an expense via PUT', () => {
    const tripId = '123';
    const expenseId = 'exp1';
    const updatedExpense = { description: 'Car', amount: 20000 };

    service.updateExpense(tripId, expenseId, updatedExpense).subscribe(response => {
      expect(response).toBeTruthy();
    });

    const req = httpMock.expectOne(`${apiUrl}/update-expense/${tripId}/${expenseId}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updatedExpense);
    req.flush({ message: 'Updated' });
  });

  it('should fetch user trips for dropdown via GET', () => {
    const dummyTrips = [{ id: '1', tripName: 'Trip A' }];

    service.getUserTripsForDropdown().subscribe(trips => {
      expect(trips).toEqual(dummyTrips);
    });

    const req = httpMock.expectOne(`${apiUrl}/user-trips`);
    expect(req.request.method).toBe('GET');
    req.flush(dummyTrips);
  });
});