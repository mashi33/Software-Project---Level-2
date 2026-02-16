import { Routes } from '@angular/router';
import { BudgetDashboard } from './budget-dashboard/budget-dashboard'; // check path
import { ExpenseForm } from './expense-form/expense-form'; // check path

export const routes: Routes = [
  // 1. The Default Home Route (Dashboard)
  { path: '', component: BudgetDashboard },

  // 2. The Add Expense Route
  { path: 'add-expense', component: ExpenseForm },

  // 3. (Optional) Explicit Dashboard Route
  // If you add this line, then navigate(['/dashboard']) WILL work.
  { path: 'dashboard', component: BudgetDashboard }
];
