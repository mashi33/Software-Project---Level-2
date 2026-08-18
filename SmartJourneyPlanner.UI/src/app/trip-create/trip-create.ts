import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TripService } from '../services/trip.service';
import { Router, ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-trip-create',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './trip-create.html',
  styleUrls: ['./trip-create.css']
})
export class TripCreateComponent implements OnInit {

  tripForm: FormGroup;
  invitedMembers: { email: string; role: string; isNew: boolean }[] = [];
  isEditMode: boolean = false;
  tripId: string | null = null;
  todayDate: string = '';
  // Owner of the trip being edited; kept so an update never re-assigns ownership
  ownerEmail: string = '';
  ownerId: string = '';

  transportOptions = [
    { value: 'Cycle', label: 'Cycle', icon: 'bi-bicycle', eco: true },
    { value: 'Public Transport', label: 'Public Transport', icon: 'bi-bus-front', eco: true },
    { value: 'Walking', label: 'Walking', icon: 'bi-person-walking', eco: true },
    { value: 'Transport Provider', label: 'Transport Provider (from system)', icon: 'bi-truck', eco: false }
  ];

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
      transportMode: new FormControl(''),
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
      transportMode: data.transportMode || data.TransportMode || '',
      description: data.description || data.Description
    });
    this.ownerId = data.createdBy || data.CreatedBy || '';
    this.ownerEmail = (data.creatorEmail || data.CreatorEmail || '').toLowerCase();

    const members = data.members || data.Members || [];
    const owner = members.find((m: any) => (m.role || m.Role) === 'Owner');
    if (owner && !this.ownerEmail) {
      this.ownerEmail = (owner.email || owner.Email || '').toLowerCase();
    }

    // The owner is returned inside the member list by the API, but is not an invited member
    this.invitedMembers = members
      .filter((m: any) => (m.role || m.Role) !== 'Owner')
      .map((m: any) => ({
        email: (m.email || m.Email || '').toLowerCase(),
        role: m.role || m.Role || 'Viewer',
        isNew: false
      }))
      .filter((m: { email: string }, i: number, list: { email: string }[]) =>
        m.email !== '' && m.email !== this.ownerEmail && list.findIndex(x => x.email === m.email) === i
      );
  }

  // Formats dates for the input field (YYYY-MM-DD)
  formatDate(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return [d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2)].join('-');
  }

  // Number of members added during the current editing session
  get newMemberCount(): number {
    return this.invitedMembers.filter(m => m.isNew).length;
  }

  // Invites a new member to the list
  onInvite() {
    const email = (this.tripForm.get('memberEmail')?.value || '').trim().toLowerCase();
    const role = this.tripForm.get('memberRole')?.value;

    if (!email || !this.tripForm.get('memberEmail')?.valid) {
      this.showErrorAlert('Please enter a valid email address.');
      return;
    }

    if (email === this.ownerEmail || email === this.getCurrentUser().email) {
      this.showErrorAlert('You are already the owner of this trip.');
      return;
    }

    if (this.invitedMembers.some(m => m.email === email)) {
      this.showErrorAlert('This member is already on the list.');
      return;
    }

    this.invitedMembers.push({ email, role, isNew: true });
    this.tripForm.get('memberEmail')?.reset();
    this.tripForm.patchValue({ memberRole: 'Viewer' });
  }

  // Reads the logged-in user identity out of the stored JWT token
  private getCurrentUser(): { id: string; email: string } {
    const token = localStorage.getItem('token');
    if (!token) return { id: '', email: '' };
    try {
      const decoded: any = JSON.parse(atob(token.split('.')[1]));
      return {
        id: decoded['userId'] || '',
        email: (decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || '').toLowerCase()
      };
    } catch (e) {
      console.error('Token decoding failed', e);
      return { id: '', email: '' };
    }
  }

  // Processes form submission (Create or Update)
  onSubmit() {
    if (!this.tripForm.value.transportMode) {
      this.showErrorAlert('Please select a transport type.');
      return;
    }

    if (this.tripForm.valid) {
      const currentUser = this.getCurrentUser();
      // Editing must never transfer ownership to the editor
      const createdBy = (this.isEditMode && this.ownerId) ? this.ownerId : currentUser.id;
      const creatorEmail = (this.isEditMode && this.ownerEmail) ? this.ownerEmail : currentUser.email;

      // Construct object for backend
      const tripData = {
        TripName: this.tripForm.value.tripName,
        Destination: this.tripForm.value.destination,
        StartDate: new Date(this.tripForm.value.startDate).toISOString(),
        EndDate: new Date(this.tripForm.value.endDate).toISOString(),
        BudgetLimit: this.tripForm.value.budgetLimit,
        TransportMode: this.tripForm.value.transportMode,
        Description: this.tripForm.value.description,
        DepartFrom: this.tripForm.value.departFrom,
        Members: this.invitedMembers.map(m => ({ Email: m.email, Role: m.role })),
        CreatedBy: createdBy,
        CreatorEmail: creatorEmail
      };

      const useTransportProvider = this.tripForm.value.transportMode === 'Transport Provider';

      if (this.isEditMode && this.tripId) {
        const newCount = this.newMemberCount;
        // Update existing trip
        this.tripService.updateTrip(this.tripId, tripData).subscribe({
          next: () => {
            this.invitedMembers = this.invitedMembers.map(m => ({ ...m, isNew: false }));
            this.tripService.setTempTripData({ ...tripData, Id: this.tripId });
            this.showSuccessAlert(newCount > 0
              ? `Trip updated and ${newCount} new invitation${newCount > 1 ? 's' : ''} sent!`
              : "Trip updated successfully!");
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
              if (useTransportProvider) {
                Swal.fire({
                  icon: 'info',
                  title: 'Book Transport',
                  text: 'Your trip is saved! Browse transport providers to book a vehicle.',
                  confirmButtonText: 'Find Transport',
                  showCancelButton: true,
                  cancelButtonText: 'View Summary'
                }).then(result => {
                  if (result.isConfirmed) {
                    this.router.navigate(['/transport']);
                  } else {
                    this.router.navigate(['/trip-summary', newId]);
                  }
                });
              } else {
                this.router.navigate(['/trip-summary', newId]);
              }
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