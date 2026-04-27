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
    // 1. Load all trips first
    this.tripService.getAllTrips().subscribe({ 
      next: (res: any[]) => {
        // Filter duplicates
        this.allTrips = Array.from(new Map(res.map(trip => [trip._id || trip.id, trip])).values());

        // 2. ✅ Catch the tripId from the URL Bridge
        this.route.queryParams.subscribe(params => {
          if (params['tripId']) {
            this.tripId = params['tripId'];
            this.loadBudget(); // Automatically load the summary-linked trip
          } else {
            // Default to first trip if no ID in URL
            this.tripId = (this.allTrips.length > 0 ? (this.allTrips[0]._id || this.allTrips[0].id) : '');
            if (this.tripId) this.loadBudget();
          }
        });
      },
      error: (err) => console.error("Trips failed to load", err)
    });
  }

  loadBudget() {
    if (!this.tripId) return;
    
    const selectedTrip = this.allTrips.find(t => (t._id || t.id) === this.tripId);
    if (selectedTrip) {
      // ✅ Bridge: Parse the limit from the selected Trip
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
  
  // 1. Add Title
  doc.setFontSize(18);
  doc.text('Trip Budget Report', 14, 22);
  
  // 2. Add Trip Name (Optional but helpful)
  const selectedTrip = this.allTrips.find(t => (t._id || t.id) === this.tripId);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Trip: ${selectedTrip?.tripName || 'N/A'}`, 14, 30);

  // 3. Prepare the data rows
  const tableData = this.expenses.map(e => [
    e.category, 
    'Rs. ' + Number(e.amount).toFixed(2), 
    new Date(e.date).toLocaleDateString(), 
    e.description
  ]);

  // ✅ 4. Add the Total Spent row at the bottom of the data array
  if (this.budget) {
    tableData.push([
      { content: 'TOTAL SPENT', styles: { fontWeight: 'bold', fillColor: [240, 240, 240] } },
      { content: 'Rs. ' + Number(this.budget.totalSpent).toFixed(2), styles: { fontWeight: 'bold', fillColor: [240, 240, 240] } },
      '',
      ''
    ]);
  }

  // 5. Generate the table
  autoTable(doc, {
    startY: 35,
    head: [['Category', 'Amount', 'Date', 'Description']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [0, 131, 143] }, // Matches your teal/blue theme
    columnStyles: {
      1: { halign: 'right' }, // Align amounts to the right
    }
  });

  // 6. Save
  doc.save(`Budget_Report_${selectedTrip?.tripName || 'Trip'}.pdf`);
}
}