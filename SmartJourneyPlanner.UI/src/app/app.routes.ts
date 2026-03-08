import { Routes } from '@angular/router';
import { RouteOptimization } from './route-optimization/route-optimization';
import { DiscussionComponent } from './discussion/discussion'; 

export const routes: Routes = [
{ path: 'groupChat', component: DiscussionComponent },
  
  // මේ පේළිය පරීක්ෂා කරන්න. මෙතන RouteOptimization තිබිය යුතුයි.
  { path: 'explore', component: RouteOptimization }, 
  
  //{ path: '', redirectTo: '/route-optimization', pathMatch: 'full' }
];
