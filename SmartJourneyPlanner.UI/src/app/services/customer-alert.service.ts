import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class CustomerAlertService implements OnDestroy {
  private apiUrl = `${environment.apiUrl}/Admin`;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private shownAlertIds = new Set<string>();
  private popupOpen = false;
  private monitoring = false;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  startMonitoring(): void {
    if (this.monitoring || !this.isTraveller()) return;
    this.monitoring = true;

    this.loadAndShowAlerts();
    this.pollInterval = setInterval(() => this.loadAndShowAlerts(), 15000);
  }

  stopMonitoring(): void {
    this.monitoring = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  ngOnDestroy(): void {
    this.stopMonitoring();
  }

  private isTraveller(): boolean {
    if (!this.authService.isLoggedIn()) return false;
    const role = (this.authService.getUserRole() || '').toLowerCase();
    return role === 'traveller' || role === 'traveler';
  }

  private loadAndShowAlerts(): void {
    const userId = this.authService.getUserId();
    if (!userId || !this.isTraveller() || this.popupOpen) return;

    this.http.get<any[]>(`${this.apiUrl}/customer-alerts/${userId}`).subscribe({
      next: (alerts) => {
        const pending = (alerts || []).filter(a => !a.dismissed && !a.Dismissed);
        if (pending.length > 0) {
          this.showAlertPopup(pending[0]);
        }
      },
      error: (err) => console.error('Failed to load customer alerts:', err)
    });
  }

  private showAlertPopup(alert: any): void {
    const alertId = alert.id || alert._id || alert.Id;
    if (!alertId || this.shownAlertIds.has(alertId) || this.popupOpen) return;

    this.shownAlertIds.add(alertId);
    this.popupOpen = true;

    const vehicleInfo = alert.vehicleInfo || alert.VehicleInfo || 'Selected Transport';
    const message = alert.message || alert.Message ||
      'Sorry, the vehicle you booked has been declined by the admin. Your booking has been automatically cancelled. Please find a new vehicle.';

    Swal.fire({
      title: '🚨 Vehicle Service / Booking Notice',
      width: '580px',
      padding: '2em',
      html: `
        <div style="font-family: inherit; text-align: left; color: #1e293b;">
          <div style="background: #fef2f2; border-left: 5px solid #ef4444; padding: 14px; border-radius: 8px; margin-bottom: 16px;">
            <strong style="color: #b91c1c; font-size: 15px; display: block; margin-bottom: 4px;">Attention Required</strong>
            <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.5;">${message}</p>
          </div>
          <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #64748b;">
            <div><strong>Vehicle:</strong> ${vehicleInfo}</div>
            <div style="margin-top: 4px;"><strong>Action:</strong> Click below to find a new vehicle.</div>
          </div>
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: 'Find New Vehicle',
      confirmButtonColor: '#ef4444',
      showCancelButton: false, 
      allowOutsideClick: false
    }).then(() => {
      this.handleAlertAction(alertId);
    });
  }

  private handleAlertAction(alertId: string): void {
    this.dismissAlert(alertId);
    this.popupOpen = false;
    this.router.navigate(['/transport']);
  }

  private dismissAlert(alertId: string): void {
    this.http.patch(`${this.apiUrl}/customer-alerts/${alertId}/dismiss`, {}).subscribe({
      error: (err) => console.error('Failed to dismiss alert:', err)
    });
  }
}