import { Routes } from '@angular/router';
import { BudgetDashboard } from './budget-dashboard/budget-dashboard';
import { ExpenseForm } from './expense-form/expense-form';
import { TripTimelineComponent } from './trip-timeline/trip-timeline';

export const routes: Routes = [
  { path: '', component: BudgetDashboard },
  { path: 'add-expense', component: ExpenseForm },
  { path: 'dashboard', component: BudgetDashboard },
  // Use the name 'TripTimeline' here as well
  { path: 'timeline', component: TripTimelineComponent }
];