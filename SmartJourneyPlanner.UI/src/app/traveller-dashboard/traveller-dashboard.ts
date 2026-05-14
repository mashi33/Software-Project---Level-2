import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common'; 
import { RouterModule } from '@angular/router'; 

@Component({
  selector: 'app-traveller-dashboard',
  standalone: true, // Ensuring compatibility with modern Angular versions
  imports: [CommonModule, RouterModule],
  templateUrl: './traveller-dashboard.html',
  styleUrls: ['./traveller-dashboard.css']
})
export class TravelerDashboardComponent {
  constructor(private router: Router) {} 

  navigateToWeather() {
    this.router.navigate(['/weather']);
  }

  navigateToMemories() {
    this.router.navigate(['/memories']);
  }
}