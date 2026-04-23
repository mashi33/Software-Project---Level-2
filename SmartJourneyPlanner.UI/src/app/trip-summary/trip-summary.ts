import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-trip-summary',
  imports: [],
  templateUrl: './trip-summary.html',
  styleUrl: './trip-summary.css',
})
export class TripSummaryComponent implements OnInit {
        constructor() { }

  ngOnInit(): void {
    
    console.log('Trip Summary Loaded!');
  }
}
