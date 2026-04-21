import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Fixes *ngFor errors
import { VehicleService } from '../services/providerDashboard';

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [CommonModule], // Required to use *ngFor in HTML
  templateUrl: './provider-dashboard.html',
  styleUrls: ['./provider-dashboard.css']
})
export class ProviderDashboardComponent implements OnInit {
  
  // Declaring properties here fixes the red underlines
  stats: any = { totalVehicles: 0, totalBookings: 0, rating: 0 };
  vehicles: any[] = [];
  bookings: any[] = [];

  constructor(private svc: VehicleService) {}

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    // Fetches fresh data from your API
    this.svc.getStats().subscribe(data => this.stats = data);
    this.svc.getVehicles().subscribe(data => this.vehicles = data);
    this.svc.getBookings().subscribe(data => this.bookings = data);
  }

  // Action: Toggle Availability
  toggleAvailability(v: any) {
    this.svc.updateAvailability(v.id, !v.available).subscribe(() => this.loadAll());
  }

  // Action: Delete Vehicle
  deleteVehicle(id: string) {
    if(confirm('Are you sure you want to delete this vehicle?')) {
      this.svc.deleteVehicle(id).subscribe(() => this.loadAll());
    }
  }

  // Action: Delete Booking
  deleteBooking(id: string) {
    this.svc.deleteBooking(id).subscribe(() => this.loadAll());
  }

  // Action: Accept Booking
  acceptBooking(id: string) {
    // You should add an 'acceptBooking' method in your vehicle.service.ts
    // this.svc.acceptBooking(id).subscribe(() => this.loadAll());
    console.log("Booking accepted:", id);
  }
}