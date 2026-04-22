import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BudgetService } from '../services/budget';

@Component({
  selector: 'app-expense-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './expense-form.html',
  styleUrls: ['./expense-form.css']
})
export class ExpenseForm implements OnInit {

  expense = {
    name: '',
    amount: null,
    category: 'Meals',
    date: new Date().toISOString()
  };

  // ✅ FIX: No more hardcoding! Initialized as empty string.
  tripId: string = '';

  // Variables to track Edit Mode
  isEditMode = false;
  oldName = '';

  categories = [
    { name: 'Meals', icon: '🍔' },
    { name: 'Transport', icon: '🚕' },
    { name: 'Accommodation', icon: '🛏️' },
    { name: 'Shopping', icon: '🛍️' },
    { name: 'Others', icon: '⚡' }
  ];

  constructor(
    private budgetService: BudgetService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      
      // Error Handling. Ensure a Trip ID actually exists!
      if (params['tripId']) {
        this.tripId = params['tripId'];
      } else {
        console.warn('⚠️ No Trip ID found in URL. Redirecting to prevent orphan records.');
        alert('Error: Please select a trip from the Dashboard first.');
        this.router.navigate(['/budget']);
        return; 
      }

      // Check if we are editing an existing expense
      if (params['mode'] === 'edit') {
        this.isEditMode = true;
        this.oldName = params['name'];

        // Fill form with old data
        this.expense.name = params['name'];
        this.expense.amount = params['amount'];
        this.expense.category = params['category'];
      }
    });
  }

  selectCategory(catName: string) {
    this.expense.category = catName;
  }

  // ✅ NEW: Validation function to ensure the note (expense.name) isn't just numbers
  isNoteValid(note: string): boolean {
    // If empty, let the HTML 'required' tag handle it
    if (!note || note.trim() === '') {
      return true; 
    }
    
    // Checks if there is at least ONE letter in the string.
    // "1234" -> false | "Taxi 2" -> true
    return /[a-zA-Z]/.test(note);
  }

  onSubmit() {
    // Basic frontend validation
    if (!this.expense.amount || !this.expense.name) {
      alert('Validation Error: Please fill in all required fields!');
      return;
    }

    // ✅ NEW: Double-check our Regex validation before sending to database
    if (!this.isNoteValid(this.expense.name)) {
      alert('Validation Error: The description must contain letters, not just numbers.');
      return;
    }

    if (this.isEditMode) {
      // CASE 1: UPDATE EXISTING
      this.budgetService.updateExpense(this.tripId, this.oldName, this.expense).subscribe({
        next: () => {
          alert('Expense successfully updated!');
          this.router.navigate(['/budget'], { queryParams: { tripId: this.tripId } });
        },
        error: (err: any) => {
          console.error('Database Update Error:', err);
          alert('Failed to update expense. Please try again later.');
        }
      });

    } else {
      // CASE 2: ADD NEW
      this.budgetService.addExpense(this.tripId, this.expense).subscribe({
        next: () => {
          alert('New expense successfully added!');
          this.router.navigate(['/budget'], { queryParams: { tripId: this.tripId } });
        },
        error: (err: any) => {
          console.error('Database Insertion Error:', err);
          alert('Failed to save expense. Please try again later.');
        }
      });
    }
  }

  cancel() {
    this.router.navigate(['/budget'], { queryParams: { tripId: this.tripId } });
  }
}