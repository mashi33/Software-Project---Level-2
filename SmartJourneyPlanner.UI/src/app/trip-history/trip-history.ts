import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TripService } from '../services/trip.service';

@Component({
  selector: 'app-trip-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trip-history.html',
  styleUrls: ['./trip-history.css']
})
export class TripHistoryComponent implements OnInit {
  tripId: string = '';
  tripName: string = '';
  editHistory: any[] = [];
  loading = true;
  searchTerm: string = '';

  constructor(
    private tripService: TripService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.tripId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.tripId) {
      this.loading = false;
      return;
    }

    this.tripService.getTripById(this.tripId).subscribe({
      next: (data: any) => {
        this.tripName = data?.tripName || data?.TripName || 'Trip';
        const inlineHistory = data?.editHistory || data?.EditHistory || [];
        if (inlineHistory.length) {
          this.editHistory = this.sortByNewest(inlineHistory);
        }
      },
      error: () => { this.tripName = 'Trip'; }
    });

    this.tripService.getTripHistory(this.tripId).subscribe({
      next: (data) => {
        if (data?.length) this.editHistory = this.sortByNewest(data);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private sortByNewest(entries: any[]): any[] {
    return [...entries].sort((a, b) =>
      new Date(b.editedAt || b.EditedAt || 0).getTime() -
      new Date(a.editedAt || a.EditedAt || 0).getTime()
    );
  }

  get filteredHistory(): any[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.editHistory;
    return this.editHistory.filter(entry =>
      `${entry.editedBy || ''} ${entry.changes || ''}`.toLowerCase().includes(term)
    );
  }

  // Distinct people who have modified this trip
  get editorCount(): number {
    const editors = this.editHistory
      .map(entry => (entry.editedBy || '').toLowerCase())
      .filter(name => name !== '');
    return new Set(editors).size;
  }

  get lastEditedAt(): string | null {
    return this.editHistory.length
      ? this.editHistory[0].editedAt || this.editHistory[0].EditedAt || null
      : null;
  }

  initialOf(name: string): string {
    return (name || 'U').charAt(0).toUpperCase();
  }

  onSearch(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
  }

  backToSummary(): void {
    this.router.navigate(['/trip-summary', this.tripId]);
  }
}
