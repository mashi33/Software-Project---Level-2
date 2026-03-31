import { Routes } from '@angular/router';
import { RouteOptimization } from './route-optimization/route-optimization';
import { DiscussionComponent } from './Discussion/discussion'; 
import { TransportProvider } from './transport-provider/transport-provider';
import { ProviderDashboard } from './provider-dashboard/provider-dashboard';


export const routes: Routes = [
{ path: 'groupChat', component: DiscussionComponent },
  
  // මේ පේළිය පරීක්ෂා කරන්න. මෙතන RouteOptimization තිබිය යුතුයි.
  { path: 'explore', component: RouteOptimization }, 
  { path: 'memories', component: TransportProvider },
  { path: 'vehicle/:id', loadComponent: () => import('./transport-provider/vehicle-detail/vehicle-detail').then(m => m.VehicleDetailComponent) },
  { path: 'provider', component: ProviderDashboard },

  
  { path: '', redirectTo: '/explore', pathMatch: 'full' }
];
