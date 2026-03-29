import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProviderForm } from '../transport-provider/provider-form/provider-form';
import { MyBookings } from '../transport-provider/my-bookings/my-bookings';
import { VehicleService } from '../services/vehicle.service';
import { Vehicle } from '../models/transport.model';

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ProviderForm, MyBookings],
  templateUrl: './provider-dashboard.html',
  styleUrl: './provider-dashboard.css'
})
export class ProviderDashboard implements OnInit {
  activeTab: 'register' | 'requests' = 'register';
  providerVehicles: Vehicle[] = [];

  constructor(private vehicleService: VehicleService) {}

  ngOnInit() {
    this.loadProviderVehicles();
  }

  loadProviderVehicles() {
    // Currently no logic needed for fleet display
  }
}
