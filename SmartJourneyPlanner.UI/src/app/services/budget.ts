import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BudgetService {
  // Check your Swagger port (usually 5125 or 7125)
  private apiUrl = 'http://localhost:5125/api/Budget';

  constructor(private http: HttpClient) { }

  // 1. Get Budget Data
  getBudget(tripId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${tripId}`);
  }

  // 2. Add a new Expense
  addExpense(tripId: string, expense: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/add-expense/${tripId}`, expense, { responseType: 'text' });
  }

  // 3. DELETE Expense
  deleteExpense(tripId: string, expenseName: string): Observable<any> {
    const safeName = encodeURIComponent(expenseName);
    return this.http.delete(`${this.apiUrl}/delete-expense/${tripId}/${safeName}`, { responseType: 'text' });
  }

  // ✅ 4. UPDATE Expense (New Feature!)
  updateExpense(tripId: string, oldName: string, updatedExpense: any): Observable<any> {
    const safeOldName = encodeURIComponent(oldName);
    return this.http.put(
      `${this.apiUrl}/update-expense/${tripId}/${safeOldName}`,
      updatedExpense,
      { responseType: 'text' }
    );
  }
}
