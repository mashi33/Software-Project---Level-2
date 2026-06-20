import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar/navbar';
import { FooterComponent } from './footer/footer';

@Component({
    selector: 'app-root',
    imports: [CommonModule, RouterOutlet, FormsModule, NavbarComponent, FooterComponent],
    templateUrl: './app.html',
    styleUrl: './app.css'
})
export class AppComponent {
    constructor(public router: Router) { }

    // Function to determine whether to show the navbar and footer based on the current route
    showNavbarFooter(): boolean {
        const hiddenRoutes = ['/login', '/signup', '/forgot-password', '/reset-password'];


        return !hiddenRoutes.some(route => this.router.url.includes(route));
    }
}