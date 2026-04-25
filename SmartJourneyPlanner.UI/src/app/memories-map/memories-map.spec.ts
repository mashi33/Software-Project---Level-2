import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemoriesMapComponent } from '../memories-map/memories-map'; 

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MemoriesMapComponent 
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent { }