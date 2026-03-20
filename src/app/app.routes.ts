import { Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { SignupComponent } from './signup/signup'; 

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent }, // path to signup
  { path: '', redirectTo: '/login', pathMatch: 'full' } // firsly show login
];