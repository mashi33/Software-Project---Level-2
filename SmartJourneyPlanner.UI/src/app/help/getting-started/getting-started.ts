import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-getting-started',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './getting-started.html',
  styleUrls: ['./getting-started.css']
})
export class GettingStartedComponent { }