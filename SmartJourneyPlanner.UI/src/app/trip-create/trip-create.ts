import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TripService } from '../services/trip.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-trip-create',
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
      memberEmail: new FormControl(''),
      memberRole: new FormControl('Viewer')
    });
  }

  ngOnInit() {
    console.log("Checking for trip data...");

    const idFromUrl = this.route.snapshot.paramMap.get('id');

    if (idFromUrl) {
      this.tripId = idFromUrl;
      this.isEditMode = true;

      this.tripService.getTripById(idFromUrl).subscribe({
        next: (data) => {
          if (data) {
            console.log("Loading data from DB:", data);
            this.fillForm(data);
          }
        },
        error: (err) => console.error("Error fetching trip for edit:", err)
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
      this.invitedMembers.push({ email: email, role: role });
      this.tripForm.get('memberEmail')?.reset();
      this.tripForm.patchValue({ memberRole: 'Viewer' });
    } else {
      alert("Please enter a valid email address.");
    }
  }

  onSubmit() {
    if (this.tripForm.valid) {
      const token = localStorage.getItem('token');
      let createdBy = '';
      if (token) {
        const decoded: any = JSON.parse(atob(token.split('.')[1]));
        createdBy = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || '';
      }

      const tripData = {
        TripName: this.tripForm.value.tripName,
        Destination: this.tripForm.value.destination,
        StartDate: new Date(this.tripForm.value.startDate).toISOString(),
        EndDate: new Date(this.tripForm.value.endDate).toISOString(),
        budgetLimit: this.tripForm.value.budgetLimit,
        Description: this.tripForm.value.description,
        DepartFrom: this.tripForm.value.departFrom,
        Members: this.invitedMembers.map(m => ({
          Email: m.email,
          Role: m.role
        })),
        CreatedBy: createdBy
      };

      if (this.isEditMode && this.tripId) {
        this.tripService.updateTrip(this.tripId, tripData).subscribe({
          next: (res: any) => {
            console.log("Update Success:", res);
            this.tripService.setTempTripData({ ...tripData, Id: this.tripId });
            alert("Trip updated successfully!");
            this.router.navigate(['/trip-summary', this.tripId]);
          },
          error: (err) => alert("Error updating trip")
        });
      } else {
        this.tripService.createTrip(tripData).subscribe({
          next: (res: any) => {
            console.log("Backend Response:", res);
            const newId = res.tripId || res.id;

            if (newId) {
              this.tripService.setTempTripData({ ...tripData, Id: newId });
              alert("Trip saved successfully!");
              this.router.navigate(['/trip-summary', newId]);
            } else {
              this.router.navigate(['/trip-summary']);
            }
          },
          error: (err) => alert("Error saving trip")
        });
      }
    } else {
      alert("Form has errors. Please check again.");
    }
  }

  onAddBudget() {
    const budget = this.tripForm.get('budgetLimit')?.value;
    console.log("Selected Budget:", budget);
  }

  removeMember(index: number) {
    this.invitedMembers.splice(index, 1);
  }
}