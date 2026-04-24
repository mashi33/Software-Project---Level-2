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

  sortColumn: string = '';
  sortAscending: boolean = true;

  public chartColors: string[] = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#88D49E', '#FF9F1C'];
  public doughnutChartLabels: string[] = [];
  public doughnutChartType: ChartType = 'pie';
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
        this.allTrips = res;
        this.route.queryParams.subscribe(params => {
          if (params['tripId']) {
            this.tripId = params['tripId'];
          } else if (this.allTrips.length > 0) {
            this.tripId = this.allTrips[0]._id || this.allTrips[0].id;
          }
          if (this.tripId) {
            this.loadBudget();
          }
        });
      },
      error: (err: any) => console.error("Could not load trips:", err)
    });
  }

  loadBudget() {
    if (!this.tripId) return;
    this.budgetService.getBudget(this.tripId).subscribe({
      next: (data: any) => {
        this.budget = data;
        this.expenses = data.expenses || []; 
        
        // --- Sync Member Count ---
        const selectedTrip = this.allTrips.find(t => (t._id || t.id) === this.tripId);
        const tripMembersCount = selectedTrip?.members?.length;
        
        // Priority: DB budget count > Trip member list size > Default 1
        this.membersCount = data.membersCount || tripMembersCount || 1;

        this.calculateTotal();
        this.updateChartData();
        this.cd.detectChanges();
      },
      error: (err: any) => console.error('Error loading budget:', err)
    });
  }

  calculateTotal() {
    if (this.budget) {
      const sum = this.expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
      this.budget.totalSpent = sum;
      
      const divisor = this.membersCount > 0 ? this.membersCount : 1;
      this.costPerPerson = sum / divisor;

      // ✅ Updated: Calculate raw percentage (allow > 100 for warning triggers)
      this.budgetPercentage = (sum / this.totalAllowedBudget) * 100;
    }
  }

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

  deleteExpense(expenseId: string) {
    if (confirm(`Delete this expense?`)) {
      this.budgetService.deleteExpense(this.tripId, expenseId).subscribe({
        next: () => this.loadBudget(),
        error: (err: any) => console.error('Error deleting:', err)
      });
    }
  }

  editExpense(item: any) {
    this.router.navigate(['/add-expense'], {
      queryParams: {
        tripId: this.tripId,
        mode: 'edit',
        expenseId: item.id,
        description: item.description,
        amount: item.amount,
        category: item.category
      }
    });
  }

  updateChartData() {
    if (!this.expenses || !this.expenses.length) {
      this.doughnutChartData = { labels: [], datasets: [] };
      return;
    }
    const totals: { [key: string]: number } = {};
    this.expenses.forEach((e: any) => {
      const cat = e.category || 'Others';
      totals[cat] = (totals[cat] || 0) + Number(e.amount);
    });
    this.doughnutChartLabels = Object.keys(totals);
    this.doughnutChartData = {
      labels: this.doughnutChartLabels,
      datasets: [{
        data: Object.values(totals),
        backgroundColor: this.chartColors,
      }]
    };
  }

  getColorForCategory(categoryName: string): string {
    const index = this.doughnutChartLabels.indexOf(categoryName);
    return index !== -1 ? this.chartColors[index % this.chartColors.length] : '#ccc';
  }

  exportToPDF() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(10, 64, 135); 
    doc.text('Trip Budget Report', 14, 22);
    const tableData = this.expenses.map(e => [
      e.category,
      'Rs. ' + Number(e.amount).toFixed(2),
      new Date(e.date).toLocaleDateString(),
      e.description
    ]);
    autoTable(doc, {
      startY: 30,
      head: [['Category', 'Amount', 'Date', 'Description']],
      body: tableData,
      foot: [['Total', 'Rs. ' + (this.budget?.totalSpent || 0).toFixed(2), '', '']],
      theme: 'grid',
      headStyles: { fillColor: [0, 131, 143] }
    });
    doc.save(`Budget_Report_${this.tripId}.pdf`);
  }
}