import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartType } from 'chart.js';
import { BudgetService } from '../services/budget';

@Component({
  selector: 'app-budget-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, FormsModule, RouterModule],
  templateUrl: './budget-dashboard.html',
  styleUrls: ['./budget-dashboard.css']
})
export class BudgetDashboard implements OnInit {

  budget: any = null;
  expenses: any[] = [];
  tripId = 'trip_test_01';

  // ✅ 1. RESTORED: Your beautiful original Teal/Blue Palette
  public chartColors: string[] = ['#00ACC1', '#26C6DA', '#80DEEA', '#0097A7', '#006064', '#00838F'];

  public doughnutChartLabels: string[] = [];
  public doughnutChartType: ChartType = 'pie';

  public chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } } // Hide default legend
  };

  public doughnutChartData: ChartData<'pie'> = { labels: [], datasets: [{ data: [], backgroundColor: [] }] };

  constructor(
    private budgetService: BudgetService,
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['tripId']) this.tripId = params['tripId'];
      this.loadBudget();
    });
  }

  loadBudget() {
    this.budgetService.getBudget(this.tripId).subscribe({
      next: (data: any) => {
        this.expenses = data.expenses || [];
        this.budget = data;
        this.calculateTotal();
        this.updateChartData();
        this.cd.detectChanges();
      },
      error: (err: any) => console.error('Error loading budget:', err)
    });
  }

  // ✅ NEW SMART FUNCTION: Matches Table Colors to Chart Colors
  getColorForCategory(categoryName: string): string {
    // 1. Find where this category is in the chart list
    const index = this.doughnutChartLabels.indexOf(categoryName);

    // 2. If found, give it the same color the Chart uses
    if (index !== -1) {
      return this.chartColors[index % this.chartColors.length];
    }

    // 3. Fallback color if not found
    return '#ccc';
  }

  editExpense(item: any) {
    const expenseName = item.name || item.Name;
    this.router.navigate(['/add-expense'], {
      queryParams: {
        tripId: this.tripId,
        mode: 'edit',
        name: expenseName,
        amount: item.amount,
        category: item.category
      }
    });
  }

  deleteExpense(item: any) {
    const expenseName = item.name || item.Name;

    if (confirm(`Delete "${expenseName}"?`)) {
      this.budgetService.deleteExpense(this.tripId, expenseName).subscribe({
        next: () => {
          // ✅ FIX: Find the INDEX of the item we want to remove
          const index = this.expenses.indexOf(item);

          if (index !== -1) {
            // Remove ONLY that specific item using splice
            this.expenses.splice(index, 1);
          }

          // Recalculate totals and charts
          this.calculateTotal();
          this.updateChartData();
          this.cd.detectChanges();
        },
        error: (err: any) => console.error(err)
      });
    }
  }
  calculateTotal() {
    let sum = 0;
    this.expenses.forEach(e => {
      let val = Number(e.amount || e.Amount);
      if (!isNaN(val)) sum += val;
    });
    if (this.budget) this.budget.totalSpent = sum;
  }

  updateChartData() {
    if (!this.expenses.length) return;

    const totals: { [key: string]: number } = {};
    this.expenses.forEach((e: any) => {
      const cat = e.category || e.Category || 'Others';
      totals[cat] = (totals[cat] || 0) + (e.amount || e.Amount || 0);
    });

    this.doughnutChartLabels = Object.keys(totals);

    this.doughnutChartData = {
      labels: this.doughnutChartLabels,
      datasets: [{
        data: Object.values(totals),
        // Use your original colors, assigned in order
        backgroundColor: this.chartColors,
        hoverOffset: 4
      }]
    };
  }
}
