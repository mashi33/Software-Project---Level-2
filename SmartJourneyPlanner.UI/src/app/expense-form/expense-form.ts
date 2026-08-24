import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BudgetService } from '../services/budget';
import Swal from 'sweetalert2'; 

@Component({
    selector: 'app-expense-form',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './expense-form.html',
    styleUrls: ['./expense-form.css']
})
export class ExpenseForm implements OnInit {
  expense = {
    description: '', 
    amount: null,
    category: 'Meals',
    date: new Date().toISOString()
  };

  tripId: string = '';
  expenseId: string = ''; 
  isEditMode = false;

  categories = [
    { name: 'Meals', icon: '🍔' },
    { name: 'Transport', icon: '🚕' },
    { name: 'Stay', icon: '🛏️' },
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
        Swal.fire({
          icon: 'error',
          title: 'Trip Missing',
          text: 'Please select a valid trip from the Dashboard first.',
          confirmButtonColor: '#2563eb'
        });
        this.router.navigate(['/budget']);
        return; 
      }

      // Check if we are editing an existing expense
      if (params['mode'] === 'edit') {
        this.isEditMode = true;
        this.expenseId = params['expenseId']; 
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
    if (!this.expense.amount || !this.expense.description) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Fields',
        text: 'Please fill in all required fields before saving.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    if (!this.isNoteValid(this.expense.description)) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Description',
        text: 'The description must contain letters.',
        confirmButtonColor: '#2563eb'
      });
      return;
    }

    const payload = {
      ...this.expense,
      amount: Math.abs(Number(this.expense.amount))
    };

    if (this.isEditMode) {
      this.budgetService.updateExpense(this.tripId, this.expenseId, payload).subscribe({
        next: () => {
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Expense updated successfully!',
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true,
            background: '#ffffff',
            iconColor: '#2563eb'
          });

          setTimeout(() => {
            this.router.navigate(['/budget'], { queryParams: { tripId: this.tripId } });
          }, 1500);
        },
        error: (err: any) => {
          console.error('Database Update Error:', err);
          Swal.fire({
            icon: 'error',
            title: 'Update Failed',
            text: 'Failed to update. Check console for error details.',
            confirmButtonColor: '#2563eb'
          });
        }
      });

    } else {
      this.budgetService.addExpense(this.tripId, payload).subscribe({
        next: () => {
          // Frictionless self-closing top corner toast notification
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'New expense successfully added!',
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true,
            background: '#ffffff',
            iconColor: '#2563eb'
          });

          setTimeout(() => {
            this.router.navigate(['/budget'], { queryParams: { tripId: this.tripId } });
          }, 1500);
        },
        error: (err: any) => {
          console.error('Database Insertion Error:', err);
          Swal.fire({
            icon: 'error',
            title: 'Save Failed',
            text: 'Failed to save. Check the network log payload.',
            confirmButtonColor: '#2563eb'
          });
        }
      });
    }
  }

  cancel() {
    this.router.navigate(['/budget'], { queryParams: { tripId: this.tripId } });
  }
}