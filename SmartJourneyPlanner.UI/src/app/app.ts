import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
// 1. Import the new components
import { NavbarComponent } from './navbar/navbar';
import { FooterComponent } from './footer/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  // 2. Add them to the imports list
  imports: [CommonModule, RouterOutlet, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
  constructor(public router: Router) {}
 }
