import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { NavbarComponent } from './navbar/navbar';
import { FooterComponent } from './footer/footer';
import { SidebarComponent } from './sidebar/sidebar';
import { AuthService } from './services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, RouterOutlet, FormsModule, NavbarComponent, FooterComponent, SidebarComponent],
    templateUrl: './app.html',
    styleUrl: './app.css'
})
export class AppComponent implements OnInit {
    currentUrl: string = '';
    constructor(public router: Router, private authService: AuthService) { }

    ngOnInit(): void {
        this.currentUrl = this.router.url;

        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: any) => {
            this.currentUrl = event.urlAfterRedirects;
        });
    }

    // Function to determine whether to show Navbar and Sidebar
    showNavbarSidebar(): boolean {
        const cleanUrl = this.currentUrl.split('?')[0];


        if (this.authService.isLoggedIn() && (cleanUrl === '/' || cleanUrl === '/landing')) {
            return true;
        }


        const hiddenRoutes = [
            '/',
            '/landing',
            '/login',
            '/signup',
            '/forgot-password',
            '/reset-password',
            '/admin-dashboard',
            '/admin-panel',
            '/verify-email',
            '/privacy-policy',
            '/terms-conditions'
        ];

        return !hiddenRoutes.includes(cleanUrl);
    }

    showFooter(): boolean {
        const cleanUrl = this.currentUrl.split('?')[0];

        // Hide footer ONLY on these specific authentication/admin pages
        const hideFooterRoutes = [
            '/login',
            '/signup',
            '/forgot-password',
            '/reset-password',
            '/admin-dashboard',
            '/admin-panel',
            '/verify-email'
        ];

        return !hideFooterRoutes.includes(cleanUrl);
    }
}