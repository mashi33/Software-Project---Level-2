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
export class TripCreateComponent implements OnInit { //  Added OnInit interface

  tripForm: FormGroup;
  invitedMembers: { email: string; role: string }[] = [];
  isEditMode: boolean = false;
  tripId: string | null = null;

  constructor(
    private tripService: TripService, // 1. Inject TripService for API calls
    private router: Router,        // 2. Inject Router for navigation
    private route: ActivatedRoute
  ) {
    //  Initialize the form with necessary controls and validators
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
  
  //  On component initialization, check if we're in edit mode and load data accordingly
  ngOnInit() {
    console.log("Checking for trip data...");

    const idFromUrl = this.route.snapshot.paramMap.get('id');// Check if there's an ID in the URL to determine if we're editing an existing trip
    
    if (idFromUrl) {
      this.tripId = idFromUrl;
      this.isEditMode = true;

      this.tripService.getTripById(idFromUrl).subscribe({ // Fetch the trip details from the backend using the ID
        next: (data) => {
          if (data) {
            console.log("Loading data from DB:", data);
            this.fillForm(data);
          }
        },
        error: (err) => console.error("Error fetching trip for edit:", err)
      });
    } else {
      const savedData = this.tripService.getTempTripData();//Check trip data from temp storage in case we are coming back from summary page after creating a new trip. This allows us to pre-fill the form with the data we just created, making it easier to edit if needed.
      if (savedData) {
        this.isEditMode = true;
        this.tripId = savedData.Id || savedData.id;
        this.fillForm(savedData);
      }
    }
  }
  
  //Fill the form with existing trip data when in edit mode. This function maps the data from the backend to the form controls, allowing for seamless editing of existing trips. It also handles both camelCase and PascalCase property names to ensure compatibility with different backend implementations.
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
      this.invitedMembers = members.map((m: any) => ({ // Map members to the format used in the form, handling both camelCase and PascalCase property names
        email: m.email || m.Email,
        role: m.role || m.Role
      }));
    }
  }
  
  // Utility function to format dates into a consistent string format (YYYY-MM-DD) for both displaying in the form and sending to the backend. This ensures that date values are correctly interpreted regardless of the original format they were stored in.
  formatDate(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  }
  
  // Method to handle inviting members to the trip. It validates the email input and adds the member to the invitedMembers array with their selected role. This allows users to easily manage who is part of the trip and their permissions.
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

  // Method to handle form submission for both creating a new trip and updating an existing one. It constructs the trip data object from the form values and invited members, then makes the appropriate API call based on whether we're in edit mode or not. After a successful response, it navigates to the trip summary page, passing along the new or updated trip ID.
  onSubmit() {
    if (this.tripForm.valid) {
      const token = localStorage.getItem('token');
      let createdBy = '';
      if (token) {
        try {
          const decoded: any = JSON.parse(atob(token.split('.')[1]));
          createdBy = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || '';//
        } catch (e) {
          console.error("Token decoding failed", e);
        }
      }
      
      //contruct trip data to send to backend
      const tripData = {
        TripName: this.tripForm.value.tripName,
        Destination: this.tripForm.value.destination,
        StartDate: new Date(this.tripForm.value.startDate).toISOString(),
        EndDate: new Date(this.tripForm.value.endDate).toISOString(),
        BudgetLimit: this.tripForm.value.budgetLimit,
        Description: this.tripForm.value.description,
        DepartFrom: this.tripForm.value.departFrom,
        Members: this.invitedMembers.map(m => ({
          Email: m.email,
          Role: m.role
        })),
        CreatedBy: createdBy
      };
      
      // If we're in edit mode, update the existing trip; otherwise, create a new one. This logic ensures that the same form can be used for both creating and editing trips, providing a seamless user experience.
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
            //Save trip temperary
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
  //Method to handle budget limi changes
  onAddBudget() {
    const budget = this.tripForm.get('budgetLimit')?.value;
    console.log("Selected Budget:", budget);
  }
  //Remove member from the invited member list
  removeMember(index: number) {
    this.invitedMembers.splice(index, 1);
  }
}