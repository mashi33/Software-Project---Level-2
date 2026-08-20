import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar/navbar';
import { FooterComponent } from './footer/footer';
import { SidebarComponent } from './sidebar/sidebar';
import { TransportVehicleService } from './services/transport-vehicle.service';

@Component({
    selector: 'app-root',
    imports: [CommonModule, RouterOutlet, FormsModule, NavbarComponent, FooterComponent, SidebarComponent],
    templateUrl: './app.html',
    styleUrl: './app.css'
})
export class AppComponent implements OnInit {
    constructor(
        public router: Router,
        private vehicleService: TransportVehicleService
    ) { }

    ngOnInit(): void {
        // Pre-warm fleet cache immediately on application startup
        this.vehicleService.preloadVehicles();
    }

    // Function to determine whether to show the navbar and footer based on the current route
    showNavbarFooter(): boolean {
        const hiddenRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/admin-dashboard', '/admin-panel'];

        return !hiddenRoutes.some(route => this.router.url.includes(route));
    }
}
