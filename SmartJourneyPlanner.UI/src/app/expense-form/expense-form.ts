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

  // ✅ FIXED: Using 'description' instead of 'name' to match C# Backend
  expense = {
    description: '', 
    amount: null,
    category: 'Meals',
    date: new Date().toISOString()
  };

  tripId: string = '';
  expenseId: string = ''; // Used for editing a specific record
  isEditMode = false;

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
      
      if (params['tripId']) {
        this.tripId = params['tripId'];
      } else {
        console.warn('⚠️ No Trip ID found in URL.');
        alert('Error: Please select a trip from the Dashboard first.');
        this.router.navigate(['/budget']);
        return; 
      }

      // Check if we are editing an existing expense
      if (params['mode'] === 'edit') {
        this.isEditMode = true;
        this.expenseId = params['expenseId']; // ✅ Capture unique ID for editing

        // Fill form with data passed from dashboard
        this.expense.description = params['description'];
        this.expense.amount = params['amount'];
        this.expense.category = params['category'];
      }
    });
  }

  selectCategory(catName: string) {
    this.expense.category = catName;
  }

  // Validation function
  isNoteValid(note: string): boolean {
    if (!note || note.trim() === '') return true; 
    return /[a-zA-Z]/.test(note);
  }

  onSubmit() {
    // 1. Basic frontend validation
    if (!this.expense.amount || !this.expense.description) {
      alert('Validation Error: Please fill in all required fields!');
      return;
    }

    if (!this.isNoteValid(this.expense.description)) {
      alert('Validation Error: The description must contain letters.');
      return;
    }

    // Prepare data (Ensure amount is a number)
    const payload = {
      ...this.expense,
      amount: Number(this.expense.amount)
    };

    if (this.isEditMode) {
      // ✅ CASE 1: UPDATE using unique expenseId
      this.budgetService.updateExpense(this.tripId, this.expenseId, payload).subscribe({
        next: () => {
          alert('Expense successfully updated!');
          this.router.navigate(['/budget'], { queryParams: { tripId: this.tripId } });
        },
        error: (err: any) => {
          console.error('Database Update Error:', err);
          alert('Failed to update. Check console for 400 error details.');
        }
      });

    } else {
      // ✅ CASE 2: ADD NEW
      this.budgetService.addExpense(this.tripId, payload).subscribe({
        next: () => {
          alert('New expense successfully added!');
          this.router.navigate(['/budget'], { queryParams: { tripId: this.tripId } });
        },
        error: (err: any) => {
          console.error('Database Insertion Error:', err);
          alert('Failed to save. Check the F12 Network tab Payload.');
        }
      });
    }
  }

  cancel() {
    this.router.navigate(['/budget'], { queryParams: { tripId: this.tripId } });
  }
}