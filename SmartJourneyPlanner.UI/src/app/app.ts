import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router'; // මේක තියෙන්න ඕනේ
import { NavbarComponent } from './navbar/navbar'; 
import { FooterComponent } from './footer/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    NavbarComponent, // 2. මෙතැනට Navbar එක එකතු කරන්න
    FooterComponent  // 3. මෙතැනට Footer එක එකතු කරන්න
  ], // මෙතන RouterOutlet අනිවාර්යයි
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent { }
