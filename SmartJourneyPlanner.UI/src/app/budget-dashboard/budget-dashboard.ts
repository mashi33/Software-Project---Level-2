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
import Swal from 'sweetalert2';

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
  currentUserEmail: string = '';
  tripDetails: any = null;

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
    this.extractLoggedInUser();
    
    this.budgetService.getUserTripsForDropdown().subscribe({
      next: (data: any[]) => {
        this.userTripsList = Array.from(new Map(data.map(trip => [trip.id, trip])).values());

        this.tripService.getAllTrips().subscribe({ 
          next: (res: any[]) => {
            this.allTrips = Array.from(new Map(res.map(trip => [trip._id || trip.id, trip])).values());

            this.route.queryParams.subscribe(params => {
              if (params['tripId']) {
                this.tripId = params['tripId'];
              } else if (this.userTripsList.length > 0) {
                this.tripId = this.userTripsList[0].id || '';
              } else {
                this.tripId = (this.allTrips.length > 0 ? (this.allTrips[0]._id || this.allTrips[0].id) : '');
              }

              if (this.tripId) {
                this.loadBudget();
              }
            });
          },
          error: (err) => console.error("Global trips failed to load", err)
        });
      },
      error: (err: any) => console.error('Failed to load dropdown options:', err)
    });
  }

  private extractLoggedInUser(): void {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        this.currentUserEmail = 
          tokenPayload.email || 
          tokenPayload.unique_name || 
          tokenPayload.sub || 
          tokenPayload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || 
          tokenPayload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || 
           '';
        console.log("🔒 Security Payload Active Session Email Context Discovered ->", this.currentUserEmail);
      }
    } catch (e) {
      console.error("Row Security Error parsing profile identities:", e);
    }
  }
  
  onTripDropdownChange(newTripId: string): void {
    if (!newTripId) return;
    this.tripId = newTripId;
    this.loadBudget();
  }

  loadBudget() {
    if (!this.tripId) return;
    
    const selectedTrip = this.allTrips.find(t => (t._id || t.id) === this.tripId);
    if (selectedTrip) {
      this.tripDetails = selectedTrip;
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
        this.budget = null;
        this.expenses = [];
        this.costPerPerson = 0;
        this.budgetPercentage = 0;
        this.tripDetails = null; 
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

  get remainingBudget(): number {
    if (!this.budget) return this.totalAllowedBudget;
    const remaining = this.totalAllowedBudget - (this.budget.totalSpent || 0);
    return remaining > 0 ? remaining : 0;
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
    Swal.fire({
      title: 'Delete this expense?',
      text: "This item will be permanently removed from your trip's budget tracking.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e53e3e',
      cancelButtonColor: '#64748b',  
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Keep it',
      background: '#ffffff',
      customClass: {
        popup: 'swal2-premium-popup',
        title: 'swal2-premium-title'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.budgetService.deleteExpense(this.tripId, expenseId).subscribe({
          next: () => {
            this.loadBudget();
            
            Swal.fire({
              position: 'top-end', 
              icon: 'success',
              title: 'Expense removed',
              showConfirmButton: false, 
              timer: 1200, 
              toast: true, 
              background: '#ffffff'
            });
          },
          error: (err) => {
            Swal.fire('Error!', 'Could not remove this expense entry.', 'error');
            console.error(err);
          }
        });
      }
    });
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
        addedBy: item.addedBy 
      }
    });
  }

  resolveMemberName(email: string): string {
    if (!email) return 'Teammate';
    
    const searchEmail = email.trim().toLowerCase();
    
    if (searchEmail === this.currentUserEmail?.trim().toLowerCase()) {
      return 'You';
    }
    
    if (this.tripDetails && this.tripDetails.members) {
      const foundMember = this.tripDetails.members.find((m: any) => {
        const memberEmail = (m.email || m.Email || '').trim().toLowerCase();
        return memberEmail === searchEmail;
      });

      if (foundMember) {
        const fullName = foundMember.fullName || foundMember.FullName;
        if (fullName) return fullName;
      }
    }
    
    const fallbackPrefix = email.split('@')[0].split(/[\._0-9]/)[0];
    return fallbackPrefix.charAt(0).toUpperCase() + fallbackPrefix.slice(1) || 'Teammate';
  }

  exportToPDF() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const selectedTrip = this.allTrips.find(t => (t._id || t.id) === this.tripId);
  const tripName = selectedTrip?.tripName || 'Trip Workspace';
  
  // Modern Top Accent Bar
  doc.setFillColor(37, 99, 235); 
  doc.rect(0, 0, 105, 3.5, 'F');
  doc.setFillColor(14, 165, 233); 
  doc.rect(105, 0, 105, 3.5, 'F');

  // Document Title & Subtitle
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); 
  doc.text('Smart Journey Planner', 14, 18);

  doc.setFontSize(12);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(100, 116, 139); 
  doc.text('Expense Allocation & Budget Audit Report', 14, 24);

  doc.setDrawColor(226, 232, 240); 
  doc.setLineWidth(0.4);
  doc.line(14, 29, 196, 29);

  // Extended Metadata Info Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 33, 182, 24, 2, 2, 'FD');

  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139); 

  // Trip & Date Generated
  doc.text('Target Trip Name :', 20, 40);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(tripName, 52, 40);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Report Generated:', 115, 40);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 146, 40);

  // Members Count & Cost Per Person
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Cost Shared Among:', 20, 50);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`${this.membersCount || 1} People`, 52, 50);

  const dynamicSum = this.expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const calculatedCostPerPerson = this.membersCount > 0 ? dynamicSum / this.membersCount : dynamicSum;
  const formattedCpp = 'Rs. ' + calculatedCostPerPerson.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Cost Per Person:', 115, 50);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(2, 132, 199); 
  doc.text(formattedCpp, 146, 50);

  // Expenses Table Data Mapping
  const tableBodyRows = this.expenses.map(e => [
    e.category,                                                                                          
    new Date(e.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),     
    e.description || '-',                                                                                
    'Rs. ' + Number(e.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
  ]);

  // Professional AutoTable Configuration
  autoTable(doc, {
    startY: 62,
    head: [['Category', 'Date Logged', 'Description' , 'Amount']],
    body: tableBodyRows,
    theme: 'striped',
    headStyles: { 
      fillColor: [15, 23, 42], 
      textColor: [248, 250, 252], 
      fontStyle: 'bold',
      fontSize: 10,
      cellPadding: 6
    },
    bodyStyles: {
      fontSize: 9.5,
      textColor: [51, 65, 85], 
      cellPadding: 5.5,
      lineColor: [241, 245, 249]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] 
    },  
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' },
      1: { cellWidth: 50, halign: 'left' },
      2: { cellWidth: 52, halign: 'left' }, 
      3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.section === 'head' && data.column.index === 3) {
        data.cell.styles.halign = 'right';
      }
    },
    didDrawPage: (data) => {
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8.5);
      doc.setFont('Helvetica', 'italic');
      doc.setTextColor(148, 163, 184); 
      doc.text('Smart Journey Planner — Official Financial Audit Report', 14, pageHeight - 10);
      doc.text(`Generated on: ${new Date().toLocaleTimeString()}`, 196, pageHeight - 10, { align: 'right' });
    }
  });

  // Aggregate Sum Total Card Box
  if (this.budget) {
    const finalY = (doc as any).lastAutoTable.finalY || 60;
    const boxWidth = 182;
    const boxHeight = 15;
    const boxX = 14;
    const boxY = finalY + 6;

    doc.setFillColor(240, 253, 244); 
    doc.setDrawColor(187, 247, 208); 
    doc.setLineWidth(0.5);
    
    doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2.5, 2.5, 'FD');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(22, 101, 52); 
    doc.text('AGGREGATE SUM TOTAL SPENT', boxX + 6, boxY + 9.5);

    const formattedTotal = 'Rs. ' + dynamicSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    doc.setFontSize(12);
    doc.setTextColor(21, 128, 61); 
    doc.text(formattedTotal, boxX + boxWidth - 6, boxY + 9.5, { align: 'right' });
  }

  // 7. Save PDF
  const sanitizedName = tripName.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Budget_Report_${sanitizedName}.pdf`);
  }
}
