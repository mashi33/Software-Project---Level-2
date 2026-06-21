import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-memories-welcome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome.html',
  styleUrls: ['./welcome.css']
})
export class MemoriesWelcomeComponent {

  constructor(private router: Router) {}

  /**
   * Navigates the user to their private memories dashboard.
   */
  navigateToMemoryMap(): void {
    console.log("Navigating to Personal Memory Map...");
    this.router.navigate(['/memories']); 
    // Update the path ['/memories/personal'] to match your actual routing config
  }

  /**
   * Navigates the user to the public community map.
   */
  navigateToCommunityMap(): void {
    console.log("Navigating to Community Map...");
    this.router.navigate(['/community']); 
    // Update the path ['/memories/community'] to match your actual routing config
  }
}