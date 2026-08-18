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
      question: 'How do I set a budget for my trip?',
      answer: 'Navigate to My Budget section, select your trip, and set your budget limit when creating or editing a trip.',
      open: false
    },
    {
      question: 'How do I add expenses to my budget?',
      answer: 'Go to Add Expense in the My Budget section, select the trip, enter expense details, and save.',
      open: false
    },
    {
      question: 'What happens when I exceed my budget?',
      answer: 'The system will flag your trip as "Over Budget" and show warnings in the budget dashboard.',
      open: false
    },
    {
      question: 'Can I edit or delete expenses?',
      answer: 'Yes, you can view all expenses in the budget dashboard and edit or delete individual entries.',
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