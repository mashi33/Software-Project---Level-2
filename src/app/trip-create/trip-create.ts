import { Component } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TripService } from '../services/trip';

@Component({
  selector: 'app-trip-create',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule], // Required modules for reactive forms and common directives
  templateUrl: './trip-create.html',
  styleUrls: ['./trip-create.css']
})
export class TripCreateComponent {
  tripForm: FormGroup;

  constructor(private tripService: TripService) {
    // Initialize the form and define form controls
    this.tripForm = new FormGroup({
      tripName: new FormControl('', Validators.required), // Trip name (required)
      departFrom: new FormControl('', Validators.required), // Starting location (required)
      destination: new FormControl('', Validators.required), // Destination (required)
      startDate: new FormControl('', Validators.required), // Start date (required)
      endDate: new FormControl('', Validators.required), // End date (required)
      description: new FormControl(''), // Optional description
      memberEmail: new FormControl(''), // Email to invite a member
      memberRole: new FormControl('Viewer') // Default role for invited member
    });
  }

  onInvite() {
    const email = this.tripForm.get('memberEmail')?.value; // Get email from form

    if (email) {
      console.log("Inviting member:", email); // Log email in console
      alert(email + " has been invited!"); // Show success message
    } else {
      alert("Please enter an email address."); // Show error if email is empty
    }
  }


  onSubmit() {
    console.log("Submit button clicked!");

    if (this.tripForm.valid) {
      const tripData = this.tripForm.value; 
      
      
      this.tripService.createTrip(tripData).subscribe({
        next: (res) => {
          console.log("Backend Response:", res);
          alert("Trip saved to MongoDB successfully! ");
        },
        error: (err) => {
          console.error("Backend Error:", err);
          alert("error occured, check the backend");
        }
      });

    } else {
      alert("Form has errors. Please check again.");
    }
  }
}