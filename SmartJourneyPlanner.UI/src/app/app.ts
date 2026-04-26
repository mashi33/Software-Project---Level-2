import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './navbar/navbar';
import { FooterComponent } from './footer/footer';

@Component({
    selector: 'app-root',
    imports: [CommonModule, RouterOutlet, FormsModule, NavbarComponent, FooterComponent],
    templateUrl: './app.html',
    styleUrl: './app.css'
})
export class AppComponent { }
