import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
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
  submitted: boolean = false;
  invitedMembers: { email: string; role: string; isNew: boolean }[] = [];
  isEditMode: boolean = false;
  tripId: string | null = null;
  todayDate: string = '';

  isLoading: boolean = false;

  // Owner of the trip being edited; kept so an update never re-assigns ownership
  ownerEmail: string = '';
  ownerId: string = '';

  transportOptions = [
    { value: 'Cycle', label: 'Cycle', icon: 'bi-bicycle', eco: true },
    { value: 'Public Transport', label: 'Public Transport', icon: 'bi-bus-front', eco: true },
    { value: 'Walking', label: 'Walking', icon: 'bi-person-walking', eco: true },
    { value: 'Transport Provider', label: 'Transport Provider (from SmartJourneyPlanner)', icon: 'bi-truck', eco: false }
  ];

  constructor(
    private tripService: TripService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Initialize form controls and validation rules
    this.tripForm = new FormGroup({
      tripName: new FormControl('', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(60)
      ]),
      departFrom: new FormControl('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(60),
        Validators.pattern(/^[A-Za-z\u0D80-\u0DFF\s.,'-]+$/)
      ]),
      destination: new FormControl('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(60),
        Validators.pattern(/^[A-Za-z\u0D80-\u0DFF\s.,'-]+$/)
      ]),
      startDate: new FormControl('', Validators.required),
      endDate: new FormControl('', Validators.required),
      budgetLimit: new FormControl('', Validators.required),
      transportMode: new FormControl('', Validators.required),
      description: new FormControl('', Validators.maxLength(500)),
      memberEmail: new FormControl('', [Validators.email]),
      memberRole: new FormControl('Viewer')
    }, { validators: [this.tripRulesValidator] });
  }

  // Cross-field rules: dates must be in order, not in the past, and origin must differ from destination
  private tripRulesValidator = (group: AbstractControl): ValidationErrors | null => {
    const start = group.get('startDate')?.value;
    const end = group.get('endDate')?.value;
    const from = (group.get('departFrom')?.value || '').trim().toLowerCase();
    const to = (group.get('destination')?.value || '').trim().toLowerCase();
    const errors: ValidationErrors = {};

    if (start && end && new Date(end) < new Date(start)) {
      errors['endBeforeStart'] = true;
    }
    if (!this.isEditMode && start && this.todayDate && start < this.todayDate) {
      errors['startInPast'] = true;
    }
    if (from && to && from === to) {
      errors['sameLocations'] = true;
    }

    return Object.keys(errors).length ? errors : null;
  };

  // True once the user has interacted with the field or tried to submit
  showError(controlName: string): boolean {
    const control = this.tripForm.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty || this.submitted);
  }

  // True when a cross-field rule failed and the user has already tried to submit
  showFormError(errorName: string): boolean {
    return this.submitted && this.tripForm.hasError(errorName);
  }

  ngOnInit() {
    // Check URL parameters to determine if editing an existing trip
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    const today = new Date();
    this.todayDate = today.toISOString().split('T')[0];
    this.tripForm.updateValueAndValidity();

    // 1. Trip Name - සෑම වචනයකම මුල් අකුර Capital කිරීම (Title Case)
    this.tripForm.get('tripName')?.valueChanges.subscribe((value: string) => {
      if (value) {
        const capitalized = value.replace(/\w\S*/g, (txt: string) => {
          return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
        if (value !== capitalized) {
          this.tripForm.get('tripName')?.setValue(capitalized, { emitEvent: false });
        }
      }
    });

    // 2. Depart From - සෑම වචනයකම මුල් අකුර Capital කිරීම (Title Case)
    this.tripForm.get('departFrom')?.valueChanges.subscribe((value: string) => {
      if (value) {
        const capitalized = value.replace(/\w\S*/g, (txt: string) => {
          return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
        if (value !== capitalized) {
          this.tripForm.get('departFrom')?.setValue(capitalized, { emitEvent: false });
        }
      }
    });

    // 3. Destination - සෑම වචනයකම මුල් අකුර Capital කිරීම (Title Case)
    this.tripForm.get('destination')?.valueChanges.subscribe((value: string) => {
      if (value) {
        const capitalized = value.replace(/\w\S*/g, (txt: string) => {
          return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
        if (value !== capitalized) {
          this.tripForm.get('destination')?.setValue(capitalized, { emitEvent: false });
        }
      }
    });

    // 4. Description - මුල් වාක්‍යයේ පළමු අකුර පමණක් Capital කිරීම (Sentence Case)
    this.tripForm.get('description')?.valueChanges.subscribe((value: string) => {
      if (value && value.length > 0) {
        const sentenceCase = value.charAt(0).toUpperCase() + value.slice(1);
        if (value !== sentenceCase) {
          this.tripForm.get('description')?.setValue(sentenceCase, { emitEvent: false });
        }
      }
    });

    this.tripForm.get('startDate')?.valueChanges.subscribe(startDate => {
      const endDateControl = this.tripForm.get('endDate');
      const endDate = endDateControl?.value;

      if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
        // set end date to start date if it is earlier
        endDateControl?.setValue(startDate);
      }
    });

    if (idFromUrl) {
      this.tripId = idFromUrl;
      this.isEditMode = true;
      // Fetch existing trip details from the backend
      this.tripService.getTripById(idFromUrl).subscribe({
        next: (data) => { if (data) this.fillForm(data); },
        error: (err) => this.showErrorAlert("Error fetching trip for edit.")
      });
    } else {
      this.isEditMode = false;
      this.tripId = null;
      this.tripForm.reset();
      this.invitedMembers = [];
      this.tripService.setTempTripData(null);
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

    const endDateRaw = data.endDate || data.EndDate;
    if (endDateRaw) {
      const end = new Date(endDateRaw);
      const today = new Date();
      end.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      if (end < today) {
        Swal.fire({
          icon: 'info',
          title: 'Trip Completed',
          text: 'This trip has already been completed. You cannot edit it or add members.',
          confirmButtonColor: '#0284c7'
        }).then(() => {
          this.router.navigate(['/trip-summary', this.tripId]);
        });
        return;
      }
    }

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
    if (this.isLoading) {
      return;
    }
    this.submitted = true;

    if (this.tripForm.invalid) {
      this.tripForm.markAllAsTouched();
      this.showErrorAlert(
        this.tripForm.hasError('endBeforeStart')
          ? 'End date cannot be earlier than the start date.'
          : this.tripForm.hasError('startInPast')
            ? 'Start date cannot be in the past.'
            : this.tripForm.hasError('sameLocations')
              ? 'Departure and destination cannot be the same place.'
              : 'Please fill all required fields correctly.'
      );
      return;
    }
    this.isLoading = true;

    {
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
            this.isLoading = false;
            this.invitedMembers = this.invitedMembers.map(m => ({ ...m, isNew: false }));
            this.tripService.setTempTripData({ ...tripData, Id: this.tripId });
            this.showSuccessAlert(newCount > 0
              ? `Trip updated and ${newCount} new invitation${newCount > 1 ? 's' : ''} sent!`
              : "Trip updated successfully!");
            this.router.navigate(['/trip-summary', this.tripId]);
          },
          error: () => {
            this.isLoading = false;
            this.showErrorAlert("Error updating trip.");
          }
        });
      } else {
        // Create new trip
        this.tripService.createTrip(tripData).subscribe({
          next: (res: any) => {
            this.isLoading = false;
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
                    this.router.navigate(['/transport'], {
                      queryParams: {
                        tripId: newId,
                        start: this.formatDate(tripData.StartDate),
                        end: this.formatDate(tripData.EndDate),
                        pickup: tripData.DepartFrom,
                        destination: tripData.Destination
                      }
                    });
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

  onCancel() {
    if (this.isEditMode && this.tripId) {

      this.router.navigate(['/trip-summary', this.tripId]);
    } else {

      this.router.navigate(['/traveller-dashboard']);
    }
  }
}