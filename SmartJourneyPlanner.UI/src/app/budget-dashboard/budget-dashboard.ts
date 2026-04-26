import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartType, Chart, registerables } from 'chart.js'; 
import { BudgetService } from '../services/budget';
import { TripService } from '../services/trip.service'; 
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

Chart.register(...registerables); 

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
  allTrips: any[] = []; 
  tripId: string = ''; 
  costPerPerson: number = 0;
  membersCount: number = 1;
  totalAllowedBudget: number = 50000; 
  budgetPercentage: number = 0;

  // UI State for Sorting
  sortColumn: string = '';
  sortAscending: boolean = true;

  // Chart UI Variables
  public doughnutChartType: ChartType = 'pie';
  public chartColors: string[] = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#88D49E', '#FF9F1C'];
  public doughnutChartLabels: string[] = [];
  public doughnutChartData: ChartData<'pie'> = { labels: [], datasets: [] };
  public chartOptions: any = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

  constructor(
    private budgetService: BudgetService,
    private tripService: TripService, 
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.tripService.getAllTrips().subscribe({ 
      next: (res: any[]) => {
        // ✅ FIX: Filter out duplicates based on ID to fix the "Multiple Sigiriya" issue
        this.allTrips = Array.from(new Map(res.map(trip => [trip._id || trip.id, trip])).values());

        this.route.queryParams.subscribe(params => {
          this.tripId = params['tripId'] || (this.allTrips.length > 0 ? (this.allTrips[0]._id || this.allTrips[0].id) : '');
          if (this.tripId) this.loadBudget();
        });
      },
      error: (err) => console.error("Trips failed to load", err)
    });
  }

  loadBudget() {
    if (!this.tripId) return;
    
    const selectedTrip = this.allTrips.find(t => (t._id || t.id) === this.tripId);
    if (selectedTrip) {
      // ✅ Bridge: Parse the limit from the selected Trip dropdown value
      this.totalAllowedBudget = this.parseBudgetLimit(selectedTrip.budgetLimit || selectedTrip.BudgetLimit);
      this.membersCount = selectedTrip.members?.length || 1;
    }

    this.budgetService.getBudget(this.tripId).subscribe({
      next: (data: any) => {
        this.budget = data;
        this.expenses = data.expenses || []; 
        this.calculateTotal();
        this.updateChartData();
        this.cd.detectChanges();
      }
    });
  }

  private parseBudgetLimit(limitStr: string): number {
    if (!limitStr) return 50000;
    if (limitStr.includes('Above')) return 60000;
    const parts = limitStr.split('-');
    const numericValue = parts.length > 1 ? parts[1].trim() : limitStr.trim();
    return parseInt(numericValue, 10) || 50000;
  }

  calculateTotal() {
    if (this.budget) {
      const sum = this.expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
      this.budget.totalSpent = sum;
      this.costPerPerson = sum / (this.membersCount || 1);
      this.budgetPercentage = (sum / this.totalAllowedBudget) * 100;
    }
  }

  // ✅ ADDED: sortTable logic to fix the TS2339 error
  sortTable(column: string) {
    if (this.sortColumn === column) {
      this.sortAscending = !this.sortAscending;
    } else {
      this.sortColumn = column;
      this.sortAscending = true;
    }
    this.expenses.sort((a, b) => {
      let valA = a[column];
      let valB = b[column];
      if (column === 'date') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else if (column === 'amount') {
        valA = Number(valA);
        valB = Number(valB);
      } else {
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
      }
      if (valA < valB) return this.sortAscending ? -1 : 1;
      if (valA > valB) return this.sortAscending ? 1 : -1;
      return 0;
    });
  }

  updateChartData() {
    const totals: { [key: string]: number } = {};
    this.expenses.forEach(e => {
      const cat = e.category || 'Others';
      totals[cat] = (totals[cat] || 0) + Number(e.amount);
    });
    this.doughnutChartLabels = Object.keys(totals);
    this.doughnutChartData = {
      labels: this.doughnutChartLabels,
      datasets: [{ data: Object.values(totals), backgroundColor: this.chartColors }]
    };
  }

  deleteExpense(expenseId: string) {
    if (confirm(`Delete this expense?`)) {
      this.budgetService.deleteExpense(this.tripId, expenseId).subscribe({
        next: () => this.loadBudget()
      });
    }
  }

  editExpense(item: any) {
    this.router.navigate(['/add-expense'], {
      queryParams: {
        tripId: this.tripId, mode: 'edit', expenseId: item.id,
        description: item.description, amount: item.amount, category: item.category
      }
    });
  }

  exportToPDF() {
    const doc = new jsPDF();
    doc.text('Trip Budget Report', 14, 22);
    autoTable(doc, {
      startY: 30,
      head: [['Category', 'Amount', 'Date', 'Description']],
      body: this.expenses.map(e => [
        e.category, 
        'Rs. ' + Number(e.amount).toFixed(2), 
        new Date(e.date).toLocaleDateString(), 
        e.description
      ]),
      theme: 'grid'
    });
    doc.save(`Budget_Report_${this.tripId}.pdf`);
  }
}