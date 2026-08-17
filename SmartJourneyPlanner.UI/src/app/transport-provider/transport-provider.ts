import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { UserSearch } from './user-search/user-search';
import { MyBookings } from './my-bookings/my-bookings';

@Component({
    selector: 'app-transport-provider',
    imports: [CommonModule, UserSearch, MyBookings],
    templateUrl: './transport-provider.html',
    styleUrl: './transport-provider.css'
})
export class TransportProvider implements OnInit {
  // This variable tracks which tab is currently selected (Find Transport or My Bookings)
  activeTab: 'search' | 'bookings' = 'search';
  targetBookingId: string | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'bookings') {
        this.activeTab = 'bookings';
      }
      if (params['bookingId']) {
        this.targetBookingId = params['bookingId'];
      }
    });
  }
}
