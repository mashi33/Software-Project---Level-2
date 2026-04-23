import { Component, OnInit } from '@angular/core';
import { TripService } from '../services/trip.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-trip-summary',
  standalone: true,
  imports: [CommonModule,RouterLink],
  templateUrl: './trip-summary.html',
  styleUrls: ['./trip-summary.css']
})
export class TripSummaryComponent implements OnInit {
  tripDetails: any;

  constructor(
    private tripService: TripService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // 1. URL එකේ ID එකක් තියෙනවාද බලනවා (උදා: /trip-summary/69ea...)
    const tripId = this.route.snapshot.paramMap.get('id');

    if (tripId) {
      console.log('Fetching data for ID:', tripId);
      // 2. ID එකක් තියෙනවා නම් Database එකෙන් අලුත්ම දත්ත ගන්නවා
      this.tripService.getTripById(tripId).subscribe({
        next: (data) => {
          this.tripDetails = data;
          console.log('Database එකෙන් ලැබුණ දත්ත:', data);
        },
        error: (err) => {
          console.error('Data load error:', err);
          // මොකක් හරි අවුලක් වුණොත් temporary data බලනවා
          this.loadFromTemp();
        }
      });
    } else {
      // 3. URL එකේ ID එකක් නැත්නම් කෙලින්ම temporary data බලනවා
      this.loadFromTemp();
    }
  }

  loadFromTemp() {
    this.tripDetails = this.tripService.getTempTripData();
    if (!this.tripDetails) {
      console.warn('No data found at all! Showing sample data.');
      this.tripDetails = {
        destination: 'Nuwara Eliya',
        departFrom: 'Colombo',
        startDate: '2026-05-10',
        endDate: '2026-05-15',
        description: 'Sample data description'
      };
    }
  }
}