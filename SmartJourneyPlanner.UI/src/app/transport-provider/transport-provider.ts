import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserSearch } from './user-search/user-search';
import { MyBookings } from './my-bookings/my-bookings';

@Component({
  selector: 'app-transport-provider',
  standalone: true,
  imports: [CommonModule, UserSearch, MyBookings],
  templateUrl: './transport-provider.html',
  styleUrl: './transport-provider.css',
})
export class TransportProvider {
  activeTab: 'search' | 'bookings' = 'search';
}
