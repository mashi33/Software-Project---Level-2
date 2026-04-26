import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BudgetService {

  private apiUrl = 'http://localhost:5233/api/Budget';

  constructor(private http: HttpClient) { }

  /*This is the first thing called when the Budget Dashboard loads. 
   I'm passing the tripId in the URL path so the backend can immediately 
   identify which trip's money we are managing.*/
  getBudget(tripId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/trip/${tripId}`);
  }

  // Using a POST request here because we are creating a new "sub-document"
  addExpense(tripId: string, expense: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/add-expense/${tripId}`, expense);
  }

  deleteExpense(tripId: string, expenseId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete-expense/${tripId}/${expenseId}`);
  }

  //PUT: Updates an existing expense using its unique ID
  updateExpense(tripId: string, expenseId: string, updatedExpense: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/update-expense/${tripId}/${expenseId}`, updatedExpense);
  }
}