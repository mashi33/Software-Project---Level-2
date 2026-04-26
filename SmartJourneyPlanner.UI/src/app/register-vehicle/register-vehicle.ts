import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProviderForm } from '../transport-provider/provider-form/provider-form';
import { TransportVehicleService } from '../services/transport-vehicle.service';
import { Vehicle } from '../models/transport.model';

@Component({
    selector: 'app-register-vehicle',
    imports: [CommonModule, ProviderForm],
    templateUrl: './register-vehicle.html',
    styleUrl: './register-vehicle.css'
})
export class RegisterVehicleComponent implements OnInit {
  providerVehicles: Vehicle[] = [];

  constructor(private transportVehicleService: TransportVehicleService) {}

  ngOnInit() {
    this.loadProviderVehicles();
  }

  loadProviderVehicles() {
    // Currently no logic needed for fleet display
  }
}
