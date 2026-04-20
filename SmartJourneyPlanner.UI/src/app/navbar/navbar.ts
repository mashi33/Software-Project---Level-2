import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Required for [src], *ngIf, etc.
import { RouterModule } from '@angular/router'; // Required for routerLink


@Component({
  selector: 'app-navbar',
  standalone: true,
  // This imports property is what was missing:
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class NavbarComponent {
  userName: string = 'John Doe';
  profilePic: string = 'assets/profile-user.png';
  notificationCount: number = 5;
}