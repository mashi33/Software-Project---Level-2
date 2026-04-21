import { Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { SignupComponent } from './signup/signup'; 
import { TripCreateComponent } from './trip-create/trip-create';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent }, // path to signup
  { path: 'create-trip', component: TripCreateComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' } // firsly show login
];