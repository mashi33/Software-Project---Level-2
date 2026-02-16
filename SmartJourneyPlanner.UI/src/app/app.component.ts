import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
// 1. Import the new components
import { NavbarComponent } from './navbar/navbar';
import { FooterComponent } from './footer/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  // 2. Add them to the imports list
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'SmartJourneyPlanner';
}
