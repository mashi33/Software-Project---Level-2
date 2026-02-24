import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Required for [src], *ngIf, etc.
import { RouterModule } from '@angular/router'; // Required for routerLink

@Component({
  selector: 'app-footer',
  standalone: true,
  // This imports property is what was missing:
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css'
})
export class FooterComponent {
  // This variable will always get the current year automatically
  currentYear: number = new Date().getFullYear();
}
