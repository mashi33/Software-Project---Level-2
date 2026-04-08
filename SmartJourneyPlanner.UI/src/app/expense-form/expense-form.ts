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

  /**
   * Initializes the component. Retrieves the dynamic tripId from the URL parameters.
   * If no tripId is found, it triggers an error redirect to protect the database.
   * Also configures form state if the user is in 'edit' mode.
   */
  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      
      // ✅ FIX: Error Handling. Ensure a Trip ID actually exists!
      if (params['tripId']) {
        this.tripId = params['tripId'];
      } else {
        console.warn('⚠️ No Trip ID found in URL. Redirecting to prevent orphan records.');
        alert('Error: Please select a trip from the Dashboard first.');
        this.router.navigate(['/budget']);
        return; // Stops the rest of the code from running
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

  /**
   * Updates the selected category for the new expense.
   * @param catName The name of the category selected by the user.
   */
  selectCategory(catName: string) {
    this.expense.category = catName;
  }

  /**
   * Handles form submission. Validates inputs and routes the data
   * to either the update or add service methods based on the current mode.
   */
  onSubmit() {
    // Basic frontend validation
    if (!this.expense.amount || !this.expense.name) {
      alert('Validation Error: Please fill in all required fields!');
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

  /**
   * Cancels the operation and safely routes the user back to the Budget Dashboard.
   */
  cancel() {
    this.router.navigate(['/budget'], { queryParams: { tripId: this.tripId } });
  }
}
