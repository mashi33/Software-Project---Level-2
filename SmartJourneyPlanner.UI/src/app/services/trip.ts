import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Trip {
  // Properties of a Trip 
  id?: string;
  destination: string = '';
  startDate: string = '';
  endDate: string = '';
  budget: number = 0;
  description?: string;
  
  // User related data
  userName?: string;
  userEmail?: string;
}