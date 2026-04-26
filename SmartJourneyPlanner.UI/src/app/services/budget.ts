import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BudgetService {
  // ✅ Points to your running .NET server
  private apiUrl = 'http://localhost:5233/api/Budget';

  constructor(private http: HttpClient) { }

  /**
   * GET: Fetches budget data for a specific trip.
   * Our updated backend now automatically creates a budget if it's missing.
   */
  getBudget(tripId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/trip/${tripId}`);
  }

  /**
   * POST: Adds a new expense to a trip's budget container.
   */
  addExpense(tripId: string, expense: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/add-expense/${tripId}`, expense);
  }

  /**
   * DELETE: Removes an expense by its unique ID.
   */
  deleteExpense(tripId: string, expenseId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete-expense/${tripId}/${expenseId}`);
  }

  /**
   * PUT: Updates an existing expense using its unique ID.
   */
  updateExpense(tripId: string, expenseId: string, updatedExpense: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/update-expense/${tripId}/${expenseId}`, updatedExpense);
  }
}