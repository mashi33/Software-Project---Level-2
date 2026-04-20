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
  tripId: string = '';
  
  // ✅ ADDED: Variable to hold the calculated split cost
  costPerPerson: number = 0;

  public chartColors: string[] = ['#00ACC1', '#26C6DA', '#80DEEA', '#0097A7', '#006064', '#00838F'];
  public doughnutChartLabels: string[] = [];
  public doughnutChartType: ChartType = 'pie';

  public chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } } 
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
      if (params['tripId']) {
        this.tripId = params['tripId'];
      }
      this.loadBudget();
    });
  }

  loadBudget() {
    if (!this.tripId) return;

    this.budgetService.getBudget(this.tripId).subscribe({
      next: (data: any) => {
        this.expenses = data.expenses || [];
        this.budget = data;
        
        this.calculateTotal();
        this.updateChartData();
        this.cd.detectChanges();
      },
      error: (err: any) => console.error('Error loading budget data:', err)
    });
  }

  getColorForCategory(categoryName: string): string {
    const index = this.doughnutChartLabels.indexOf(categoryName);
    if (index !== -1) {
      return this.chartColors[index % this.chartColors.length];
    }
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

    if (confirm(`Are you sure you want to delete "${expenseName}"?`)) {
      this.budgetService.deleteExpense(this.tripId, expenseName).subscribe({
        next: () => {
          const index = this.expenses.indexOf(item);
          if (index !== -1) {
            this.expenses.splice(index, 1);
          }

          this.calculateTotal();
          this.updateChartData();
          this.cd.detectChanges();
        },
        error: (err: any) => console.error('Error deleting expense:', err)
      });
    }
  }

  /**
   * ✅ UPDATED: Calculates the total spent AND the cost per person.
   */
  calculateTotal() {
    let sum = 0;
    this.expenses.forEach(e => {
      let val = Number(e.amount || e.Amount);
      if (!isNaN(val)) sum += val;
    });
    
    if (this.budget) {
      this.budget.totalSpent = sum;
      
      // Look for members count in DB, default to 1 if not found to prevent NaN errors
      const members = this.budget.membersCount || this.budget.totalMembers || 1;
      this.costPerPerson = sum / members;
    }
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
        backgroundColor: this.chartColors,
        hoverOffset: 4
      }]
    };
  }
}