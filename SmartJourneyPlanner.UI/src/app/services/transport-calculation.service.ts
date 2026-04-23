import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TransportCalculationService {

  constructor() { }

  /**
   * Calculates the estimated minimum total for a booking.
   * Formula: Total = (Daily Rate * Days) + (Driver Night Out Fee * Nights)
   * Note: This only includes the 100km per day limit.
   */
  calculateEstimatedTotal(
    dailyRate: number, 
    days: number, 
    nightOutFee: number, 
    nights: number
  ): number {
    if (days <= 0) return 0;
    
    const dailyTotal = dailyRate * days;
    const nightOutTotal = nightOutFee * nights;
    
    return dailyTotal + nightOutTotal;
  }

  /**
   * Generates a clear pricing breakdown for the UI.
   */
  getPricingBreakdown(
    dailyRate: number, 
    days: number, 
    nightOutFee: number, 
    nights: number
  ) {
    return {
      dailyDetails: `${dailyRate} x ${days} Days`,
      nightOutDetails: `${nightOutFee} x ${nights} Nights`,
      total: this.calculateEstimatedTotal(dailyRate, days, nightOutFee, nights),
      note: 'Extra KM distance is paid separately to the driver at the end of the trip.'
    };
  }
}
