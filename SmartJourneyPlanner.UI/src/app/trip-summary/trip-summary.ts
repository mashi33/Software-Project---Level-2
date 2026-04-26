import { Component, OnInit } from '@angular/core';
import { TripService } from '../services/trip.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-trip-summary',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './trip-summary.html',
  styleUrls: ['./trip-summary.css']
})
export class TripSummaryComponent implements OnInit {
  // Trip එකේ මූලික විස්තර තියාගන්න
  tripDetails: any;
  // ඉතිහාසය (Edit History) තියාගන්න Array එක
  editHistory: any[] = [];
  isDropdownOpen = false;
  userRole: string = 'owner'; 

  constructor(
    private tripService: TripService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // 1. URL එකෙන් Trip ID එක සහ User Role එක ගන්න
    const tripId = this.route.snapshot.paramMap.get('id');
    const roleFromUrl = this.route.snapshot.queryParamMap.get('role');

    if (roleFromUrl) {
      this.userRole = roleFromUrl;
      console.log('Current User Role:', this.userRole);
    }

    if (tripId) {
      console.log('Fetching data for ID:', tripId);
      
      // 2. Backend එකෙන් Trip එකේ සියලුම විස්තර (History එකත් එක්කම) ගන්න
      this.tripService.getTripById(tripId).subscribe({
        next: (data: any) => {
          this.tripDetails = data;
          console.log('Data received from database:', data);

          // Backend එකෙන් 'editHistory' කියන නමින් data ආවොත් ඒක කෙලින්ම ගන්න
          if (data.editHistory && data.editHistory.length > 0) {
            this.editHistory = data.editHistory;
            console.log('History loaded from main object:', this.editHistory);
          } else {
            // බැරිවෙලාවත් main object එකේ නැත්නම් විතරක් වෙනම call එකක් කරන්න
            this.loadHistory(tripId);
          }
        },
        error: (err) => {
          console.error('Data load error:', err);
          this.loadFromTemp(); // Database error එකක් ආවොත් temp data පෙන්වන්න
        }
      });
    } else {
      this.loadFromTemp();
    }
  }

  // Edit History එක වෙනම ලබාගන්නා backup function එක
  loadHistory(id: string) {
    this.tripService.getTripHistory(id).subscribe({
      next: (data) => {
        this.editHistory = data;
        console.log('Edit history loaded manually:', this.editHistory);
      },
      error: (err) => {
        console.error('History load error:', err);
      }
    });
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  /**
   * Database එකේ දත්ත නැති අවස්ථාවක පෙන්වීමට Sample දත්ත
   */
  loadFromTemp() {
    this.tripDetails = this.tripService.getTempTripData();
    if (!this.tripDetails) {
      console.warn('No data found! Showing sample data.');
      this.tripDetails = {
        tripName: 'Nuwara Eliya Trip',
        destination: 'Nuwara Eliya',
        departFrom: 'Colombo',
        startDate: '2026-05-10',
        endDate: '2026-05-15',
        description: 'Enjoying the cold weather and tea estates.'
      };
    }
  }
}