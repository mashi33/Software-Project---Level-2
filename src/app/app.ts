import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoginComponent } from './login/login'; 

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoginComponent], 
  templateUrl: './app.html',
  styleUrl: './app.css' 
})
export class App {
  title = 'smart-journey-ui';
}