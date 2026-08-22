import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { UserSearch } from './user-search/user-search';
import { MyBookings } from './my-bookings/my-bookings';
import { AuthService } from '../services/auth.service';
import { TransportBookingService } from '../services/transport-booking.service';

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
  isProvider = false;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private transportBookingService: TransportBookingService
  ) {}

  ngOnInit() {
    const role = this.authService.getUserRole();
    this.isProvider = (role === 'TransportProvider' || role === 'Provider');

    if (this.isProvider) {
      this.activeTab = 'search';
    }

    // 🚀 Pre-fetch traveler bookings in the background so switching to 'My Bookings' tab is instant (0ms)
    if (!this.isProvider) {
      const travelerId = this.authService.getUserId();
      if (travelerId) {
        this.transportBookingService.getUserBookings(travelerId).subscribe({
          error: () => {} // Silently ignore background prefetch errors
        });
      }
    }

    this.route.queryParams.subscribe(params => {
      if (!this.isProvider && params['tab'] === 'bookings') {
        this.activeTab = 'bookings';
      }
      this.targetBookingId = params['bookingId'] || null;
    });
  }
}
