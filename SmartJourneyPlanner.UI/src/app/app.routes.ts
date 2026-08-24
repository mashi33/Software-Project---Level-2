import { Routes } from '@angular/router';
import { BudgetDashboard } from './budget-dashboard/budget-dashboard';
import { ExpenseForm } from './expense-form/expense-form';
import { MemoriesWelcomeComponent } from './memory-welcome/welcome';
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
import { SettingsComponent } from './settings/settings';
import { NotificationsComponent } from './notifications/notifications';
import { authGuard } from './guards/auth-guard';
import { roleGuard } from './guards/role-guard';
import { ForgotPasswordComponent } from './forgot-password/forgot-password';
import { ResetPasswordComponent } from './reset-password/reset-password';
import { AchievementsComponent } from './achievements/achievements';
import { HelpComponent } from './help/help';
import { GettingStartedComponent } from './help/getting-started/getting-started';
import { MemoriesMapHelpComponent } from './help/memories-map-help/memories-map-help';
import { BudgetHelpComponent } from './help/budget-help/budget-help';
import { TripPlanningHelpComponent } from './help/trip-planning-help/trip-planning-help';
import { SlideshowComponent } from './slideshow/slideshow';
import { TripHistoryComponent } from './trip-history/trip-history';
import { PrivacyPolicy } from './privacy-policy/privacy-policy';
import { TermsOfService } from './terms-of-service/terms-of-service';
import { LandingPageComponent } from './landing page/landing-page';
import { VerifyEmailChangeComponent } from './verify-email-change/verify-email-change';

export const routes: Routes = [

  // PUBLIC ROUTES
  {
    path: 'privacy-policy',
    component: PrivacyPolicy
  },

  {
    path: 'terms-of-service',
    component: TermsOfService
  },

  {
    path: '',
    component: LandingPageComponent
  },

  {
    path: 'login',
    component: LoginComponent
  },

  {
    path: 'signup',
    component: Signup
  },

  {
    path: 'verify-email',
    component: VerifyEmailComponent
  },

  {
    path: 'verify-email-change',
    component: VerifyEmailChangeComponent
  },

  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
  },

  {
    path: 'reset-password',
    component: ResetPasswordComponent
  },

  {
    path: 'landing-page',
    component: LandingPageComponent
  },

  {
    path: 'help',
    component: HelpComponent
  },

  {
    path: 'help/getting-started',
    component: GettingStartedComponent
  },

  {
    path: 'help/trip-planning',
    component: TripPlanningHelpComponent
  },

  // COMMON PROTECTED ROUTES-Accessible by authenticated users
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [authGuard]
  },

  {
    path: 'settings',
    component: SettingsComponent,
    canActivate: [authGuard]
  },

  {
    path: 'notifications',
    component: NotificationsComponent,
    canActivate: [authGuard]
  },

  {
    path: 'help',
    component: HelpComponent,
    canActivate: [authGuard]
  },

  // TRAVELLER ONLY ROUTES
  {
    path: 'budget',
    component: BudgetDashboard,
    canActivate: [authGuard, roleGuard],
    data: {
      expectedRoles: ['Traveller', 'Traveler']
    }
  },

  {
    path: 'add-expense',
    component: ExpenseForm,
    canActivate: [authGuard, roleGuard],
    data: {
      expectedRoles: ['Traveller', 'Traveler']
    }
  },

  {
    path: 'memories-welcome',
    component: MemoriesWelcomeComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      expectedRoles: ['Traveller', 'Traveler']
    }
  },

  {
    path: 'memories',
    component: MemoriesMapComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      expectedRoles: ['Traveller', 'Traveler']
    }
  },

  {
    path: 'community',
    component: CommunityMapComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      expectedRoles: ['Traveller', 'Traveler']
    }
  },

  {
    path: 'weather',
    component: WeatherSuggestionComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      expectedRoles: ['Traveller', 'Traveler']
    }
  },

  {
    path: 'booking-details/:id',
    component: MyBookings,
    canActivate: [authGuard, roleGuard],
    data: {
      expectedRoles: ['Traveller', 'Traveler']
    }
  },

  {
    path: 'groupChat',
    component: DiscussionComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      expectedRoles: ['Traveller', 'Traveler']
    }
  },

  {
    path: 'timeline',
    component: TripTimelineComponent,
    canActivate: [roleGuard],
    data: {
      expectedRoles: ['Traveller', 'Traveler']
    }
  },
  {
    path: 'trip-timeline',
    redirectTo: 'timeline',
    pathMatch: 'full'
  },

  {
    path: 'achievements',
    component: AchievementsComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      expectedRoles: ['Traveller', 'Traveler']
    }
  },

  {
    path: 'memories-map-help',
    component: MemoriesMapHelpComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      expectedRoles: ['Traveller', 'Traveler']
    }
  },

  {
    path: 'budget-help',
    component: BudgetHelpComponent,
    canActivate: [authGuard],
    data: {
      expectedRoles: ['Traveller', 'Traveler']
    }
  },

  {
    path: 'slideshow/:tripName',
    component: SlideshowComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      expectedRoles: ['Traveller', 'Traveler']
    }
  },

  // Create Trip
  {
    path: 'createTrip',
    component: TripCreateComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      expectedRoles: ['Traveller', 'Traveler']
    }
  },

  // Edit Trip
  {
    path: 'editTrip/:id',
    component: TripCreateComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      expectedRoles: ['Traveller', 'Traveler']
    }
  },

  // Trip Summary
  {
    path: 'trip-summary/:id',
    component: TripSummaryComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      expectedRoles: ['Traveller', 'Traveler']
    }
  },

  {
    path: 'trip-summary',
    component: TripSummaryComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      expectedRoles: ['Traveller', 'Traveler']
    }
  },

  // Trip History
  {
    path: 'trip-history/:id',
    component: TripHistoryComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      expectedRoles: ['Traveller', 'Traveler']
    }
  },

  // EXPLORE
  {
    path: 'explore',
    canActivate: [authGuard, roleGuard],
    data: {
      expectedRoles: ['Traveller', 'Traveler', 'TransportProvider', 'Provider']
    },

    children: [
      {
        path: '',
        component: ExploreWelcome
      },

      {
        path: 'route-optimization',
        component: RouteOptimization
      },

      {
        path: 'hotel-restaurant-finder',
        component: HotelRestaurantFinder
      }
    ]
  },

  {
    path: 'transport',

    component: TransportProvider,

    canActivate: [authGuard, roleGuard],

    data: {
      expectedRoles: ['Traveller', 'Traveler', 'TransportProvider', 'Provider']
    }
  },

  // TRANSPORT PROVIDER ROUTES
  {
    path: 'register-vehicle',
    component: RegisterVehicleComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      expectedRoles: ['TransportProvider', 'Provider']
    }
  },

  {
    path: 'edit-vehicle/:id',
    component: RegisterVehicleComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      expectedRoles: ['TransportProvider', 'Provider']
    }
  },

  {
    path: 'vehicle/:id',
    canActivate: [authGuard, roleGuard],
    data: {
      expectedRoles: ['TransportProvider', 'Provider', 'Traveller', 'Traveler']
    },

    loadComponent: () =>
      import('./transport-provider/vehicle-detail/vehicle-detail')
        .then(m => m.VehicleDetailComponent)
  },

  // PROVIDER DASHBOARD
  {
    path: 'provider-dashboard',
    component: ProviderDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      expectedRoles: ['Provider', 'TransportProvider']
    }
  },

  // Alias
  {
    path: 'transport-provider-dashboard',
    component: ProviderDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      expectedRoles: ['Provider', 'TransportProvider']
    }
  },

  // TRAVELLER DASHBOARD
  {
    path: 'traveller-dashboard',
    component: TravelerDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      expectedRoles: ['Traveller', 'Traveler']
    }
  },

  // ADMIN ROUTES
  {
    path: 'admin-dashboard',
    component: AdminDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      expectedRoles: ['Admin', 'admin']
    }
  },

  {
    path: 'admin-panel',
    redirectTo: 'admin-dashboard',
    pathMatch: 'full'
  },

  // UNKNOWN ROUTES
  {
    path: '**',
    redirectTo: '/profile'
  }

];