import { Routes } from '@angular/router';
import { BudgetDashboard } from './budget-dashboard/budget-dashboard'; 
import { ExpenseForm } from './expense-form/expense-form'; 
import { MemoriesMapComponent } from './memories-map/memories-map';
import { LoginComponent } from './login/login';
import { SignupComponent } from './signup/signup'; 

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },

  // Your Budget Routes
  { path: 'budget', component: BudgetDashboard },
  { path: 'add-expense', component: ExpenseForm },

  // Team Member 01 - Map Routes
  { path: 'memories', component: MemoriesMapComponent }

  // ⚠️ I HAVE COMMENTED OUT THE SECURITY GUARD FOR NOW ⚠️
  // Now, clicking 'explore' or 'timeline' will just do nothing instead of kicking you to login.
  // { path: '**', redirectTo: '/login' } 
];
