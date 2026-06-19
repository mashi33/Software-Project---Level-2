import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BudgetService {

  private apiUrl = `${environment.apiUrl}/Budget`;
  private http = inject(HttpClient);

  constructor() { }

  getBudget(tripId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/trip/${tripId}`);
  }

  addExpense(tripId: string, expense: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/add-expense/${tripId}`, expense);
  }

  deleteExpense(tripId: string, expenseId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete-expense/${tripId}/${expenseId}`);
  }

  updateExpense(tripId: string, expenseId: string, updatedExpense: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/update-expense/${tripId}/${expenseId}`, updatedExpense);
  }

  /**
   * Pulls direct items belonging to the active user profile 
   * straight out from the correct collection pipeline.
   */
  getUserTripsForDropdown(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user-trips`);
  }
}