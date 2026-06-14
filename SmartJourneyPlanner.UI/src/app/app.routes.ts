import { Routes } from '@angular/router';
import { BudgetDashboard } from './budget-dashboard/budget-dashboard';
import { ExpenseForm } from './expense-form/expense-form';
import { MemoriesMapComponent } from './memories-map/memories-map';
import { CommunityMapComponent } from './community-map/community-map';
import { WeatherSuggestionComponent } from './weather/weather';
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
import { ProfileComponent } from './profile/profile';
import { MyBookings } from './transport-provider/my-bookings/my-bookings';
import { TravelerDashboardComponent } from './traveller-dashboard/traveller-dashboard';
import { VerifyEmailComponent } from './verify-email/verify-email';
import { authGuard } from './guards/auth-guard';
import { roleGuard } from './guards/role-guard';
import { ForgotPasswordComponent } from './forgot-password/forgot-password';
import { ResetPasswordComponent } from './reset-password/reset-password';

export const routes: Routes = [
  //  PUBLIC ROUTES 
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: Signup },
  { path: 'verify-email', component: VerifyEmailComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },

  //  PROTECTED ROUTES 
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'budget', component: BudgetDashboard, canActivate: [authGuard] },
  { path: 'add-expense', component: ExpenseForm, canActivate: [authGuard] },
  { path: 'memories', component: MemoriesMapComponent, canActivate: [authGuard] },
  { path: 'community', component: CommunityMapComponent, canActivate: [authGuard] },
  { path: 'weather', component: WeatherSuggestionComponent, canActivate: [authGuard] },
  { path: 'booking-details/:id', component: MyBookings, canActivate: [authGuard] },
  { path: 'groupChat', component: DiscussionComponent, canActivate: [authGuard] },
  { path: 'timeline', component: TripTimelineComponent, canActivate: [authGuard] },


  { path: 'createTrip', component: TripCreateComponent, canActivate: [authGuard] },
  { path: 'editTrip/:id', component: TripCreateComponent, canActivate: [authGuard] },
  { path: 'trip-summary/:id', component: TripSummaryComponent, canActivate: [authGuard] },
  { path: 'trip-summary', component: TripSummaryComponent, canActivate: [authGuard] },


  {
    path: 'explore',
    canActivate: [authGuard],
    children: [
      { path: '', component: ExploreWelcome },
      { path: 'route-optimization', component: RouteOptimization },
      { path: 'hotel-restaurant-finder', component: HotelRestaurantFinder }
    ]
  },

  { path: 'transport', component: TransportProvider, canActivate: [authGuard] },
  { path: 'register-vehicle', component: RegisterVehicleComponent, canActivate: [authGuard] },
  {
    path: 'vehicle/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./transport-provider/vehicle-detail/vehicle-detail')
      .then(m => m.VehicleDetailComponent)
  },

  // Admin Control Center
  { path: 'admin-dashboard', component: AdminDashboardComponent, canActivate: [authGuard] },

  // 🛡️ ROLE-BASED PROTECTED DASHBOARDS 
  {
    path: 'provider-dashboard',
    component: ProviderDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['Provider', 'TransportProvider'] }
  },
  {
    path: 'traveller-dashboard',
    component: TravelerDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['Traveller', 'Traveler'] }
  }
];