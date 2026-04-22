import { Routes } from '@angular/router';
import { BudgetDashboard } from './budget-dashboard/budget-dashboard'; 
import { ExpenseForm } from './expense-form/expense-form'; 
import { MemoriesMapComponent } from './memories-map/memories-map';
import { LoginComponent } from './login/login';
import { SignupComponent } from './signup/signup'; 
import { RouteOptimization } from './route-optimization/route-optimization';
import { DiscussionComponent } from './Discussion/discussion'; 
import { TripTimelineComponent } from './trip-timeline/trip-timeline';
import { ProviderDashboardComponent } from './provider-dashboard/provider-dashboard'; 
import { HotelRestaurantFinder } from './hotel-restaurant-finder/hotel-restaurant-finder';

// --- Admin Imports ---
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard';
import { adminGuard } from './guards/admin-guard';
import { TransportProvider } from './transport-provider/transport-provider';
import { RegisterVehicleComponent } from './register-vehicle/register-vehicle';

export const routes: Routes = [
  // 1. Default Route
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  
  // 2. Auth Routes
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  
  // 3. Your Budget & Expense Routes
  { path: 'budget', component: BudgetDashboard },
  { path: 'add-expense', component: ExpenseForm },

  // 4. Map & Transport Provider Routes
  { path: 'memories', component: MemoriesMapComponent },
  { path: 'provider-dashboard', component: ProviderDashboardComponent },

  // 5. Other Team 43 Modules
  { path: 'groupChat', component: DiscussionComponent },
   { 
    path: 'explore', 
    children: [
      { path: '', component: RouteOptimization }, 
      { path: 'hotel-restaurant-finder', component: HotelRestaurantFinder }
    ]
  }, 
  { path: 'timeline', component: TripTimelineComponent },

  // 6. Admin Control Center (The VIP Room)
  { 
    path: 'admin', 
    component: AdminDashboardComponent,
    canActivate: [adminGuard] 
  },

  { path: 'transport', component: TransportProvider },
  { path: 'vehicle/:id', loadComponent: () => import('./transport-provider/vehicle-detail/vehicle-detail').then(m => m.VehicleDetailComponent) },
  { path: 'register-vehicle', component: RegisterVehicleComponent }
];
