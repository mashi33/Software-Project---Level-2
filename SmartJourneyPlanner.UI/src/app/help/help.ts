import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './help.html',
  styleUrl: './help.css'
})
export class HelpComponent {

  searchText = '';

  faqs = [
    {
      question: 'How do I create a trip?',
      answer: 'Go to Trip Planner and click Create New Trip.',
      open: false
    },
    {
      question: 'How do I save a destination?',
      answer: 'Click the Save button on any destination page.',
      open: false
    },
    {
      question: 'Why is weather data unavailable?',
      answer: 'Weather forecasts are only available within the API forecast range.',
      open: false
    },
    {
      question: 'How do I edit my profile?',
      answer: 'Navigate to Account Settings and update your information.',
      open: false
    },
    {
      question: 'How can I contact support?',
      answer: 'Use Live Chat, Email Support, or Submit a Ticket.',
      open: false
    }
  ];
}