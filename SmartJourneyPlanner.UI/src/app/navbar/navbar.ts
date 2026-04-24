import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Required for [src], *ngIf, etc.
import { RouterModule } from '@angular/router'; // Required for routerLink


@Component({
    selector: 'app-navbar',
    // This imports property is what was missing:
    imports: [CommonModule, RouterModule],
    templateUrl: './navbar.html',
    styleUrl: './navbar.css'
})
export class NavbarComponent {
  userName: string = 'Krishan Karunarathna';
  profilePic: string = '/profilePic.jpg';
  notificationCount: number = 5;
}