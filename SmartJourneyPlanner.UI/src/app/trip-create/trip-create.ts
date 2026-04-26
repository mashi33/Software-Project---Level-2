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

    // Initializing the form with validation rules
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

    //Check if there's an ID in the URL for editing an existing trip
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
      // 2. Fallback to temporary data if ID is not in URL
      const savedData = this.tripService.getTempTripData();
      if (savedData) {
        this.isEditMode = true;
        this.tripId = savedData.Id || savedData.id;
        this.fillForm(savedData);
      }
    }
  }

  /**
   * Populates the form fields with existing data.
   * Handles both camelCase and PascalCase from the backend.
   */
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

  /**
   * Formats ISO date strings to YYYY-MM-DD for HTML date inputs.
   */
  formatDate(date: any) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return ''; 
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  }

  /**
   * Adds an email and role to the local invited members list.
   */
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

  /**
   * Handles form submission for both Create and Update operations.
   */
  onSubmit() {
    if (this.tripForm.valid) { // Ensure form is valid before submission
    if (this.tripForm.valid) {

      // FIX: JWT token එකෙන් email ලබාගෙන CreatedBy field එකට save කිරීම
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
        // FIX: Trip create කළ user ගේ email save කිරීම
        CreatedBy: createdBy
      };

      if (this.isEditMode && this.tripId) {
        //UPDATE EXISTING TRIP
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

            if (newId) { // If backend returns the new trip ID, use it for redirection and temp storage
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
  
  // Debugging function to log the selected budget value
  onAddBudget() {
  const budget = this.tripForm.get('budgetLimit')?.value;
  console.log("Selected Budget:", budget);
  }
  
  // Function to remove an invited member from the list
  removeMember(index: number) {
    this.invitedMembers.splice(index, 1);
  }
}