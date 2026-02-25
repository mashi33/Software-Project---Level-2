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

  tripId = 'trip_test_01';

  // ✅ NEW: Variables to track Edit Mode
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
      if (params['tripId']) {
        this.tripId = params['tripId'];
      }

      // ✅ CHECK: Are we editing?
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

 onSubmit() {
    if (!this.expense.amount || !this.expense.name) {
      alert('Please fill in all fields!');
      return;
    }

    if (this.isEditMode) {
      // ✅ CASE 1: UPDATE EXISTING
      this.budgetService.updateExpense(this.tripId, this.oldName, this.expense).subscribe({
        next: () => {
          alert('Expense Updated!');
          // CHANGED HERE 👇
          this.router.navigate(['/budget'], { queryParams: { tripId: this.tripId } });
        },
        error: (err: any) => console.error(err)
      });

    } else {
      // ✅ CASE 2: ADD NEW
      this.budgetService.addExpense(this.tripId, this.expense).subscribe({
        next: () => {
          alert('Expense Added!');
          // CHANGED HERE 👇
          this.router.navigate(['/budget'], { queryParams: { tripId: this.tripId } });
        },
        error: (err: any) => console.error(err)
      });
    }
  }

  cancel() {
    // CHANGED HERE 👇
    this.router.navigate(['/budget'], { queryParams: { tripId: this.tripId } });
  }
}
