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

  userTripsList: any[] = [];

  // Tracks the active traveler context to resolve the TS2339 template compilation error
  currentUserEmail: string = '';

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
    // Extract the logged-in user identity token email right on load initialization
    this.extractLoggedInUser();
    // 1. Fetch your user-specific filtered list for your dropdown layout
    this.tripService.getUserTrips().subscribe({
      next: (data: any[]) => {
        // Filter duplicates and store your isolated list context safely
        this.userTripsList = Array.from(new Map(data.map(trip => [trip._id || trip.id, trip])).values());

        // 2. Load all trips (Team workflow logic loop maintained 100% unchanged)
        this.tripService.getAllTrips().subscribe({ 
          next: (res: any[]) => {
            this.allTrips = Array.from(new Map(res.map(trip => [trip._id || trip.id, trip])).values());

            // 3. Coordinate initial route parameter selection safely to fix initial blank drop-down display
            this.route.queryParams.subscribe(params => {
              if (params['tripId']) {
                // If linked from an external component via URL bridge, use that ID
                this.tripId = params['tripId'];
              } else if (this.userTripsList.length > 0) {
                // DEFAULT MATCH: If loading fresh, always fall back to the user's first personal trip
                this.tripId = this.userTripsList[0]._id || this.userTripsList[0].id || '';
              } else {
                // Absolute global fallback if the user has no trips assigned yet
                this.tripId = (this.allTrips.length > 0 ? (this.allTrips[0]._id || this.allTrips[0].id) : '');
              }

              // Fire the data fetch once the correct ID contract has been settled
              if (this.tripId) {
                this.loadBudget();
              }
            });
          },
          error: (err) => console.error("Global trips failed to load", err)
        });
      },
      error: (err: any) => console.error('Failed to load isolated dropdown options:', err)
    });
  }

  // Helper method to safely pull current session identities
private extractLoggedInUser(): void {
    try {
      // 1. Fetch the real encrypted JWT token your authentication module saved on login
      const token = localStorage.getItem('token');
      
      if (token) {
        // 2. Dynamically decode the token payload without any external libraries
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        
        // 3. Inspect standard .NET identity claim keys automatically
        this.currentUserEmail = 
          tokenPayload.email || 
          tokenPayload.unique_name || 
          tokenPayload.sub || 
          tokenPayload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || 
          tokenPayload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || 
          '';

        console.log("🔒 Row Security Status: Logged in user identified as ->", this.currentUserEmail);
      } else {
        console.warn("⚠️ Row Security Warning: No active login session token discovered in localStorage.");
        this.currentUserEmail = '';
      }
    } catch (e) {
      console.error("❌ Row Security Error: Encountered issues decoding identity tokens:", e);
      this.currentUserEmail = '';
    }
  }
  
  onTripDropdownChange(newTripId: string): void {
    if (!newTripId) return;
    this.tripId = newTripId;
    console.log('Dropdown changed state context. Loading data boundaries for Trip ID:', this.tripId);
    this.loadBudget();
  }

  loadBudget() {
    if (!this.tripId) return;
    
    const selectedTrip = this.allTrips.find(t => (t._id || t.id) === this.tripId);
    if (selectedTrip) {
      // Parse the limit from the selected Trip
      this.totalAllowedBudget = this.parseBudgetLimit(selectedTrip.budgetLimit || selectedTrip.BudgetLimit);
      this.membersCount = (selectedTrip.members?.length || 1) + 1;
    }

    this.budgetService.getBudget(this.tripId).subscribe({
      next: (data: any) => {
        this.budget = data;
        this.expenses = data.expenses || []; 
        this.calculateTotal();
        this.updateChartData();
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error("Failed loading budget dataset node context:", err);
        // Clean dynamic reset fallbacks so chart views don't show trailing data lines
        this.budget = null;
        this.expenses = [];
        this.costPerPerson = 0;
        this.budgetPercentage = 0;
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
        tripId: this.tripId, 
        mode: 'edit', 
        expenseId: item.id,
        description: item.description, 
        amount: item.amount, 
        category: item.category,
        addedBy: item.addedBy // Passes validation checks securely to form scopes
      }
    });
  }

  exportToPDF() {
  const doc = new jsPDF();
  
  // Add Title
  doc.setFontSize(18);
  doc.text('Trip Budget Report', 14, 22);
  
  // Add Trip Name
  const selectedTrip = this.allTrips.find(t => (t._id || t.id) === this.tripId);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Trip: ${selectedTrip?.tripName || 'N/A'}`, 14, 30);

  // Prepare the data rows
  const tableData = this.expenses.map(e => [
    e.category, 
    'Rs. ' + Number(e.amount).toFixed(2), 
    new Date(e.date).toLocaleDateString(), 
    e.description
  ]);

  // Add the Total Spent row at the bottom of the data array
  if (this.budget) {
    tableData.push([
      { content: 'TOTAL SPENT', styles: { fontWeight: 'bold', fillColor: [240, 240, 240] } },
      { content: 'Rs. ' + Number(this.budget.totalSpent).toFixed(2), styles: { fontWeight: 'bold', fillColor: [240, 240, 240] } },
      '',
      ''
    ]);
  }

  // Generate the table
  autoTable(doc, {
    startY: 35,
    head: [['Category', 'Amount', 'Date', 'Description']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [0, 131, 143] }, 
    columnStyles: {
      1: { halign: 'right' }, 
    }
  });

  // Save
  doc.save(`Budget_Report_${selectedTrip?.tripName || 'Trip'}.pdf`);
}
}