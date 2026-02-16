import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// 1. Ensure this path points to your memories-gallery folder
import { MemoriesMapComponent } from '../memories-map/memories-map'; 

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
   
    MemoriesMapComponent // 2. Add this here to fix NG8001
    // 3. Remove MemoriesMapComponent from here to fix NG8113 warning
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent { }