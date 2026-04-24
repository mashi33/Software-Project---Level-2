import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
// 1. Import the new components
import { NavbarComponent } from './navbar/navbar';
import { FooterComponent } from './footer/footer';

@Component({
    selector: 'app-root',
    // 2. Add them to the imports list
    imports: [CommonModule, RouterOutlet, FormsModule, NavbarComponent, FooterComponent],
    templateUrl: './app.html',
    styleUrl: './app.css'
})
export class AppComponent { }
