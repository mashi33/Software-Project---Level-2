import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TripService } from '../services/trip.service';
import { Router, ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2'; // Import SweetAlert2 for professional notifications

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
  isEditMode: boolean = false; // Flag to distinguish between Create and Edit modes
  tripId: string | null = null;
  todayDate: string = ''; // Stores today's date for date picker constraints

  constructor(
    private tripService: TripService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Initialize form controls and validation rules
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
    // Check URL parameters to determine if editing an existing trip
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    const today = new Date();
    this.todayDate = today.toISOString().split('T')[0];

    if (idFromUrl) {
      this.tripId = idFromUrl;
      this.isEditMode = true;
      // Fetch existing trip details from the backend
      this.tripService.getTripById(idFromUrl).subscribe({
        next: (data) => { if (data) this.fillForm(data); },
        error: (err) => this.showErrorAlert("Error fetching trip for edit.")
      });
    } else {
      // Check for temporary saved data (e.g., returning from a summary page)
      const savedData = this.tripService.getTempTripData();
      if (savedData) {
        this.isEditMode = true;
        this.tripId = savedData.Id || savedData.id;
        this.fillForm(savedData);
      }
    }
  }

  // --- Helper Alert Functions ---

  // Displays a success notification
  showSuccessAlert(message: string) {
    Swal.fire({
      icon: 'success',
      title: 'Success!',
      text: message,
      confirmButtonColor: '#1b6fd5',
      timer: 2500,
      timerProgressBar: true
    });
  }

  // Displays an error notification
  showErrorAlert(message: string) {
    Swal.fire({
      icon: 'error',
      title: 'Oops...',
      text: message,
      confirmButtonColor: '#d33'
    });
  }

  // Maps backend data to the reactive form
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

  // Formats dates for the input field (YYYY-MM-DD)
  formatDate(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return [d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2)].join('-');
  }

  // Invites a new member to the list
  onInvite() {
    const email = this.tripForm.get('memberEmail')?.value;
    const role = this.tripForm.get('memberRole')?.value;
    if (email && this.tripForm.get('memberEmail')?.valid) {
      this.invitedMembers.push({ email, role });
      this.tripForm.get('memberEmail')?.reset();
      this.tripForm.patchValue({ memberRole: 'Viewer' });
    }
  }

  // Processes form submission (Create or Update)
  onSubmit() {
    if (this.tripForm.valid) {
      const token = localStorage.getItem('token');
      let createdBy = '', creatorEmail = '';
      if (token) {
        try {
          const decoded: any = JSON.parse(atob(token.split('.')[1]));
          createdBy = decoded['userId'] || '';
          creatorEmail = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || '';
        } catch (e) { console.error("Token decoding failed", e); }
      }

      // Construct object for backend
      const tripData = {
        TripName: this.tripForm.value.tripName,
        Destination: this.tripForm.value.destination,
        StartDate: new Date(this.tripForm.value.startDate).toISOString(),
        EndDate: new Date(this.tripForm.value.endDate).toISOString(),
        BudgetLimit: this.tripForm.value.budgetLimit,
        Description: this.tripForm.value.description,
        DepartFrom: this.tripForm.value.departFrom,
        Members: this.invitedMembers.map(m => ({ Email: m.email, Role: m.role })),
        CreatedBy: createdBy,
        CreatorEmail: creatorEmail
      };

      if (this.isEditMode && this.tripId) {
        // Update existing trip
        this.tripService.updateTrip(this.tripId, tripData).subscribe({
          next: () => {
            this.tripService.setTempTripData({ ...tripData, Id: this.tripId });
            this.showSuccessAlert("Trip updated successfully!");
            this.router.navigate(['/trip-summary', this.tripId]);
          },
          error: () => this.showErrorAlert("Error updating trip.")
        });
      } else {
        // Create new trip
        this.tripService.createTrip(tripData).subscribe({
          next: (res: any) => {
            const newId = res.tripId || res.id;
            if (newId) {
              this.tripService.setTempTripData({ ...tripData, Id: newId });
              this.showSuccessAlert("Trip saved successfully!");
              this.router.navigate(['/trip-summary', newId]);
            } else {
              this.router.navigate(['/trip-summary']);
            }
          },
          error: () => this.showErrorAlert("Error saving trip.")
        });
      }
    } else {
      this.showErrorAlert("Form has errors. Please check again.");
    }
  }

  // Removes a member from the invitation list with confirmation
  removeMember(index: number) {
    Swal.fire({
      title: 'Are you sure?',
      text: "You want to remove this member?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, remove it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.invitedMembers.splice(index, 1);
        this.showSuccessAlert('Member removed successfully!');
      }
    });
  }
}