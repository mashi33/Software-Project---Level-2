import { Routes } from '@angular/router';
import { BudgetDashboard } from './budget-dashboard/budget-dashboard'; 
import { ExpenseForm } from './expense-form/expense-form'; 
import { MemoriesMapComponent } from './memories-map/memories-map';
import { LoginComponent } from './login/login';
import { Signup } from './signup/signup'; 
import { RouteOptimization } from './route-optimization/route-optimization';
import { DiscussionComponent } from './Discussion/discussion'; 
import { TripTimelineComponent } from './trip-timeline/trip-timeline';
import { ProviderDashboardComponent } from './provider-dashboard/provider-dashboard'; 
import { TripCreateComponent } from './trip-create/trip-create';
import { HotelRestaurantFinder } from './hotel-restaurant-finder/hotel-restaurant-finder';
import { TripSummaryComponent } from './trip-summary/trip-summary';
import { ExploreWelcome } from './explore-welcome/explore-welcome';



import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard';
import { TransportProvider } from './transport-provider/transport-provider';
import { RegisterVehicleComponent } from './register-vehicle/register-vehicle';
import { MyBookings } from './transport-provider/my-bookings/my-bookings';


export const routes: Routes = [
  // 1. Default Route
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  
  // 2. Auth Routes
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: Signup },

  { path: 'createTrip', component: TripCreateComponent },
  { path: 'editTrip/:id', component: TripCreateComponent },
  { path: 'trip-summary/:id', component: TripSummaryComponent },
  { path: 'trip-summary', component: TripSummaryComponent },
  
  // 3. Budget & Expense Routes
  { path: 'budget', component: BudgetDashboard },
  { path: 'add-expense', component: ExpenseForm },

  // 4. Map & Transport Provider Routes
  { path: 'memories', component: MemoriesMapComponent },
  { path: 'provider-dashboard', component: ProviderDashboardComponent },
  { path: 'booking-details/:id', component: MyBookings },

  // 5. Team 43 Shared Modules
  { path: 'groupChat', component: DiscussionComponent },
   { 
    path: 'explore', 
    children: [

      { path: '', component: ExploreWelcome },
      { path: 'route-optimization', component: RouteOptimization },
 
      { path: 'hotel-restaurant-finder', component: HotelRestaurantFinder }
    ]
  },
  { path: 'timeline', component: TripTimelineComponent },

  // 6. Admin Control Center
  // ✅ canActivate removed so you can access it directly during testing
  { 
    path: 'admin', 
    component: AdminDashboardComponent 
  },

  { path: 'transport', component: TransportProvider },
  { 
    path: 'vehicle/:id', 
    loadComponent: () => import('./transport-provider/vehicle-detail/vehicle-detail')
      .then(m => m.VehicleDetailComponent) 
  },
  { path: 'register-vehicle', component: RegisterVehicleComponent }
];