import { Component } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TripService } from '../services/trip';

@Component({
  selector: 'app-trip-create',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './trip-create.html',
  styleUrls: ['./trip-create.css']
})
export class TripCreateComponent {
  tripForm: FormGroup;

  // 1. Array to temporarily store invited members
  invitedMembers: { email: string; role: string }[] = [];

  constructor(private tripService: TripService) {
    this.tripForm = new FormGroup({
      tripName: new FormControl('', Validators.required), // Required
      departFrom: new FormControl('', Validators.required), // Required
      destination: new FormControl('', Validators.required), // Required
      startDate: new FormControl('', Validators.required), // Required
      endDate: new FormControl('', Validators.required), // Required
      description: new FormControl(''), // Optional

      // Email with validation
      memberEmail: new FormControl('', [Validators.email]),

      // Default role is Viewer
      memberRole: new FormControl('Viewer')
    });
  }

  // Function for Invite button
  onInvite() {
    const email = this.tripForm.get('memberEmail')?.value;
    const role = this.tripForm.get('memberRole')?.value;

    if (email && this.tripForm.get('memberEmail')?.valid) {
      // 2. Add member to the list
      this.invitedMembers.push({ email: email, role: role });

      // Clear input fields after adding
      this.tripForm.get('memberEmail')?.reset();
     

      console.log("Current Invited Members:", this.invitedMembers);
    } else {
      alert("Please enter a valid email address.");
    }
  }

  // Function for Submit button
  onSubmit() {
    console.log("Submit button clicked!");

    if (this.tripForm.valid) {
      // 3. Combine form data with invited members list
      const tripData = {
        tripName: this.tripForm.value.tripName,
        destination: this.tripForm.value.destination,
        startDate: this.tripForm.value.startDate,
        endDate: this.tripForm.value.endDate,
        description: this.tripForm.value.description,
        members: this.invitedMembers // Attach members array
      };

      // Send data to backend via service
      this.tripService.createTrip(tripData).subscribe({
        next: (res: any) => {
          console.log("Backend Response:", res);
          alert("Trip saved successfully with " + this.invitedMembers.length + " members!");

          // 4. Next step: navigate to summary page (can be implemented later)
        },
        error: (err: any) => {
          console.error("Backend Error:", err);
          alert("Error occurred while saving the trip.");
        }
      });

    } else {
      alert("Form has errors. Please check again.");
    }
  }

  // Remove a member from the list (if added by mistake)
  removeMember(index: number) {
    this.invitedMembers.splice(index, 1);
  }
}