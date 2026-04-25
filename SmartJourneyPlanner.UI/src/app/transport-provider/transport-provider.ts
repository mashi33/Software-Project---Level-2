import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserSearch } from './user-search/user-search';
import { MyBookings } from './my-bookings/my-bookings';

@Component({
    selector: 'app-transport-provider',
    imports: [CommonModule, UserSearch, MyBookings],
    templateUrl: './transport-provider.html',
    styleUrl: './transport-provider.css'
})
export class TransportProvider {
  // This variable tracks which tab is currently selected (Find Transport or My Bookings)
  activeTab: 'search' | 'bookings' = 'search';
}
