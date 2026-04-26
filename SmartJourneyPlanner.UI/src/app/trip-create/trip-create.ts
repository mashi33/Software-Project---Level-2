import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TripService } from '../services/trip.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-trip-create',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './trip-create.html',
  styleUrls: ['./trip-create.css']
})
export class TripCreateComponent implements OnInit {

  tripForm: FormGroup;
  invitedMembers: { email: string; role: string }[] = [];
  isEditMode: boolean = false;
  tripId: string | null = null;

  constructor(
    private tripService: TripService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.tripForm = new FormGroup({
      tripName: new FormControl('', Validators.required),
      departFrom: new FormControl('', Validators.required),
      destination: new FormControl('', Validators.required),
      startDate: new FormControl('', Validators.required),
      endDate: new FormControl('', Validators.required),
      budgetLimit: new FormControl(''),
      description: new FormControl(''),
      memberEmail: new FormControl('', [Validators.email]),
      memberRole: new FormControl('Viewer')
    });
  }

  ngOnInit() {
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    if (idFromUrl) {
      this.tripId = idFromUrl;
      this.isEditMode = true;
      this.tripService.getTripById(idFromUrl).subscribe({
        next: (data) => { if (data) this.fillForm(data); },
        error: (err) => console.error("Error fetching trip:", err)
      });
    } else {
      const savedData = this.tripService.getTempTripData();
      if (savedData) {
        this.isEditMode = true;
        this.tripId = savedData.Id || savedData.id;
        this.fillForm(savedData);
      }
    }
  }

  fillForm(data: any) {
    this.tripForm.patchValue({
      tripName: data.tripName || data.TripName,
      departFrom: data.departFrom || data.DepartFrom,
      destination: data.destination || data.Destination,
      startDate: this.formatDate(data.startDate || data.StartDate),
      endDate: this.formatDate(data.endDate || data.EndDate),
      budgetLimit: data.budgetLimit || data.BudgetLimit,
      description: data.description || data.Description
    });
    const members = data.members || data.Members;
    if (members) {
      this.invitedMembers = members.map((m: any) => ({
        email: m.email || m.Email,
        role: m.role || m.Role
      }));
    }
  }

  formatDate(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  }

  onInvite() {
    const email = this.tripForm.get('memberEmail')?.value;
    const role = this.tripForm.get('memberRole')?.value;
    if (email && this.tripForm.get('memberEmail')?.valid) {
      this.invitedMembers.push({ email, role });
      this.tripForm.get('memberEmail')?.reset();
      this.tripForm.patchValue({ memberRole: 'Viewer' });
    }
  }

  onSubmit() {
    if (this.tripForm.valid) {
      const token = localStorage.getItem('token');
      let createdBy = '';
      if (token) {
        try {
          const decoded: any = JSON.parse(atob(token.split('.')[1]));
          createdBy = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || '';
        } catch (e) { console.error(e); }
      }

      const tripData = {
        TripName: this.tripForm.value.tripName,
        Destination: this.tripForm.value.destination,
        StartDate: new Date(this.tripForm.value.startDate).toISOString(),
        EndDate: new Date(this.tripForm.value.endDate).toISOString(),
        BudgetLimit: this.tripForm.value.budgetLimit, 
        Description: this.tripForm.value.description,
        DepartFrom: this.tripForm.value.departFrom,
        Members: this.invitedMembers.map(m => ({ Email: m.email, Role: m.role })),
        CreatedBy: createdBy
      };

      const request = (this.isEditMode && this.tripId) 
        ? this.tripService.updateTrip(this.tripId, tripData)
        : this.tripService.createTrip(tripData);

      request.subscribe({
        next: (res: any) => {
          const id = this.tripId || res.tripId || res.id;
          this.tripService.setTempTripData({ ...tripData, Id: id });
          alert("Trip saved successfully!");
          this.router.navigate(['/trip-summary', id]);
        },
        error: () => alert("Error saving trip")
      });
    }
  }

  onAddBudget() {
    const budget = this.tripForm.get('budgetLimit')?.value;
    console.log("Selected Budget Limit:", budget);
  }

  removeMember(index: number) { this.invitedMembers.splice(index, 1); }
}