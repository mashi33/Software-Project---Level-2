import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartType, Chart, registerables } from 'chart.js'; 
import { BudgetService } from '../services/budget';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// This jump-starts the Chart.js engine so our pie chart actually draws on the screen!
Chart.register(...registerables); 

@Component({
  selector: 'app-budget-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, FormsModule, RouterModule],
  templateUrl: './budget-dashboard.html',
  styleUrls: ['./budget-dashboard.css']
})
export class BudgetDashboard implements OnInit {

  // --- CORE DATA VARIABLES ---
  budget: any = null;          // Holds the main trip data
  expenses: any[] = [];        // Holds the list of individual expenses
  tripId: string = 'trip_test_01'; // Default trip ID
  costPerPerson: number = 0;   // Calculated mathematically later

  // --- BUDGET & PROGRESS BAR VARIABLES ---
  membersCount: number = 1;             // How many people are splitting the bill
  totalAllowedBudget: number = 10000;   // The maximum limit before the progress bar turns red
  budgetPercentage: number = 0;         // Used to draw the width of the progress bar (0 to 100%)

  // --- SORTING VARIABLES ---
  sortColumn: string = '';       // Remembers which column we clicked (e.g., 'amount' or 'date')
  sortAscending: boolean = true; // Remembers if we are sorting A-Z (true) or Z-A (false)

  // --- CHART VARIABLES ---
  public chartColors: string[] = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#88D49E', '#FF9F1C'];
  public doughnutChartLabels: string[] = []; // Category names (Meals, Transport, etc.)
  public doughnutChartType: ChartType = 'pie';
  public chartOptions: any = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
  public doughnutChartData: ChartData<'pie'> = { labels: [], datasets: [{ data: [], backgroundColor: [] }] };

  // --- CONSTRUCTOR --- (Brings in the services we need like Routing and our Backend Service)
  constructor(
    private budgetService: BudgetService,
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  // --- NG_ON_INIT --- (Runs automatically the moment the page opens)
  ngOnInit() {
    // 1. Look at the web address (URL) to see if a tripId was passed to us
    this.route.queryParams.subscribe(params => {
      if (params['tripId']) {
        this.tripId = params['tripId'];
      }
      // 2. Fetch the data for that specific trip from the database
      this.loadBudget();
    });
  }

  // --- FETCH DATA FROM BACKEND ---
  loadBudget() {
    if (!this.tripId) return;

    this.budgetService.getBudget(this.tripId).subscribe({
      next: (data: any) => {
        console.log("BACKEND DATA RECEIVED:", data); 
        
        // Save the data to our variables (checking for both upper and lowercase just in case)
        this.expenses = data.expenses || data.Expenses || []; 
        this.budget = data;
        
        // Now that we have the data, do the math and draw the chart!
        this.calculateTotal();
        this.updateChartData();
        this.cd.detectChanges(); // Tells Angular to update the screen
      },
      error: (err: any) => console.error('Error loading budget data:', err)
    });
  }

  // --- GET COLOR FOR LEGEND DOTS ---
  getColorForCategory(categoryName: string): string {
    const index = this.doughnutChartLabels.indexOf(categoryName);
    if (index !== -1) {
      return this.chartColors[index % this.chartColors.length];
    }
    return '#ccc'; // Default gray if category not found
  }

  // --- EDIT EXPENSE --- (Sends the user to the form page with the data attached)
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

  // --- DELETE EXPENSE ---
  deleteExpense(item: any) {
    const expenseName = item.name || item.Name;

    // 1. Ask the user to confirm so they don't delete by accident
    if (confirm(`Are you sure you want to delete "${expenseName}"?`)) {
      // 2. Tell the backend to delete it
      this.budgetService.deleteExpense(this.tripId, expenseName).subscribe({
        next: () => {
          // 3. Remove it from our local array so it vanishes from the screen immediately
          const index = this.expenses.indexOf(item);
          if (index !== -1) {
            this.expenses.splice(index, 1);
          }
          // 4. Recalculate totals and redraw the pie chart
          this.calculateTotal();
          this.updateChartData();
          this.cd.detectChanges();
        },
        error: (err: any) => console.error('Error deleting expense:', err)
      });
    }
  }

  // --- CALCULATE MATH ---
  calculateTotal() {
    let sum = 0;
    
    // 1. Add up all the expense amounts
    this.expenses.forEach(e => {
      let val = Number(e.amount || e.Amount);
      if (!isNaN(val)) sum += val;
    });
    
    if (this.budget) {
      this.budget.totalSpent = sum;
      
      // 2. Figure out how many people are splitting the bill. 
      // If we haven't typed a number, pull the default from the database.
      if (this.membersCount === 1 && (this.budget.membersCount || this.budget.totalMembers)) {
         this.membersCount = this.budget.membersCount || this.budget.totalMembers;
      }
      
      // 3. Calculate the Per Person cost
      this.costPerPerson = sum / (this.membersCount || 1);
      
      // 4. Calculate the Progress Bar width (Ensuring it doesn't go over 100%)
      this.budgetPercentage = Math.min((sum / this.totalAllowedBudget) * 100, 100);
    }
  }

  // --- DRAW PIE CHART ---
  updateChartData() {
    if (!this.expenses.length) return;

    // 1. Group expenses by category (e.g., combining all "Meals" into one sum)
    const totals: { [key: string]: number } = {};
    this.expenses.forEach((e: any) => {
      const cat = e.category || e.Category || 'Others';
      totals[cat] = (totals[cat] || 0) + (e.amount || e.Amount || 0);
    });

    // 2. Give the grouped data to Chart.js to draw
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

  // --- SORT TABLE BY COLUMN ---
  sortTable(column: string) {
    // 1. If we clicked the same column again, reverse the direction (Up/Down arrow)
    if (this.sortColumn === column) {
      this.sortAscending = !this.sortAscending;
    } else {
      // Otherwise, start a fresh sort on the new column
      this.sortColumn = column;
      this.sortAscending = true;
    }

    // 2. Sort the array
    this.expenses.sort((a, b) => {
      let valA = a[column] || a[column.charAt(0).toUpperCase() + column.slice(1)];
      let valB = b[column] || b[column.charAt(0).toUpperCase() + column.slice(1)];

      // Make sure we are sorting numbers as numbers, dates as dates, and words as words
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

      // Move items up or down based on the arrow direction
      if (valA < valB) return this.sortAscending ? -1 : 1;
      if (valA > valB) return this.sortAscending ? 1 : -1;
      return 0;
    });
  }

  // --- GENERATE PDF REPORT ---
  exportToPDF() {
    const doc = new jsPDF();
    
    // 1. Add the main title to the PDF document
    doc.setFontSize(18);
    doc.setTextColor(10, 64, 135); 
    doc.text('Budget Report - ' + (this.tripId.replace('_', ' ')), 14, 22);

    // 2. Format our raw expense data into neat rows for the PDF table
    const tableData = this.expenses.map(e => [
      e.category || e.Category,
      'Rs. ' + (e.amount || e.Amount).toFixed(2),
      new Date(e.date || e.Date).toLocaleDateString(),
      e.name || e.Name
    ]);

    // 3. Draw the table using the AutoTable library
    autoTable(doc, {
      startY: 30,
      head: [['Category', 'Amount', 'Date', 'Note']], // Column Titles
      body: tableData,                                // The Data
      foot: [['Total', 'Rs. ' + this.budget?.totalSpent.toFixed(2), '', '']], // Footer Row
      theme: 'grid',
      headStyles: { fillColor: [0, 131, 143] },       // Teal header to match our theme
      footStyles: { fillColor: [224, 247, 250], textColor: [0, 96, 100] }
    });

    // 4. Download the file to the user's computer
    doc.save(`Budget_Report_${this.tripId}.pdf`);
  }
}