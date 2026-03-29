import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VehicleType, VehicleClass } from '../../models/transport.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-provider-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './provider-form.html',
  styleUrl: './provider-form.css'
})
export class ProviderForm implements OnInit {
  vehicleForm!: FormGroup;
  vehicleTypes = Object.values(VehicleType);
  vehicleClasses: VehicleClass[] = ['Car', 'Van', 'Bus'];
  languagesList = ['Sinhala', 'English', 'Tamil', 'German', 'Russian', 'French'];

  // Image previews
  interiorPreview: string | ArrayBuffer | null = null;
  exteriorPreview: string | ArrayBuffer | null = null;
  nicPreview: string | ArrayBuffer | null = null;
  licensePreview: string | ArrayBuffer | null = null;
  insurancePreview: string | ArrayBuffer | null = null;
  revenuePreview: string | ArrayBuffer | null = null;

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.initForm();
  }

  initForm() {
    this.vehicleForm = this.fb.group({
      providerProfile: this.fb.group({
        name: ['', Validators.required],
        phone: ['', Validators.required],
        location: ['', Validators.required]
      }),
      type: [VehicleType.Budget, Validators.required],
      vehicleClass: ['Car', Validators.required],
      yearOfManufacture: [new Date().getFullYear(), [Validators.required, Validators.min(1900), Validators.max(new Date().getFullYear() + 1)]],
      seatCount: [4, [Validators.required, Validators.min(1)]],
      description: ['', Validators.required],
      isAc: [true],
      standardDailyRate: [0, [Validators.required, Validators.min(1)]],
      freeKMLimit: [100, [Validators.required, Validators.min(1)]],
      extraKMRate: [0, [Validators.required, Validators.min(0)]],
      driverNightOutFee: [0, [Validators.required, Validators.min(0)]],
      
      features: this.fb.group({
        luggage: [2, [Validators.required, Validators.min(0)]],
        safety: [false],
        childSeats: [false],
        entertainment: [false],
        tv: [false],
        wifi: [false],
        bluetooth: [false],
        airbags: [true],
        usbCharging: [false]
      }),
      
      languages: [[], Validators.required],
      
      insuranceExpiry: ['', Validators.required],
      revenueLicenseExpiry: ['', Validators.required]
    });
  }

  onFileSelected(event: any, type: 'interior' | 'exterior' | 'nic' | 'license' | 'insurance' | 'revenue') {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        const result = reader.result;
        switch (type) {
          case 'interior': this.interiorPreview = result; break;
          case 'exterior': this.exteriorPreview = result; break;
          case 'nic': this.nicPreview = result; break;
          case 'license': this.licensePreview = result; break;
          case 'insurance': this.insurancePreview = result; break;
          case 'revenue': this.revenuePreview = result; break;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  onLanguageChange(event: any) {
    const selectedOptions = Array.from((event.target as HTMLSelectElement).selectedOptions);
    const selectedValues = selectedOptions.map(option => option.value);
    this.vehicleForm.patchValue({ languages: selectedValues });
  }

  submitForm() {
    if (this.vehicleForm.invalid) {
      this.vehicleForm.markAllAsTouched();
      Swal.fire('Error', 'Please fill all required fields correctly.', 'error');
      return;
    }

    if (!this.exteriorPreview || !this.interiorPreview || !this.nicPreview || !this.licensePreview || !this.insurancePreview || !this.revenuePreview) {
      Swal.fire('Missing Documents', 'Please upload all required photos and verification documents.', 'warning');
      return;
    }

    const formData = this.vehicleForm.value;
    console.log('Submitting Vehicle Data:', formData);
    
    Swal.fire({
      icon: 'success',
      title: 'Listing Submitted!',
      text: 'Your vehicle listing is under review. It will be published once verified.',
      confirmButtonColor: '#38bdf8'
    });

    this.resetForm();
  }

  resetForm() {
    this.vehicleForm.reset({
      providerProfile: { name: '', phone: '', location: '' },
      type: VehicleType.Budget,
      vehicleClass: 'Car',
      yearOfManufacture: new Date().getFullYear(),
      seatCount: 4,
      isAc: true,
      standardDailyRate: 0,
      freeKMLimit: 100,
      extraKMRate: 0,
      driverNightOutFee: 0,
      features: { luggage: 2, safety: false, childSeats: false, entertainment: false, tv: false, wifi: false, bluetooth: false, airbags: true, usbCharging: false },
      languages: []
    });
    this.interiorPreview = null;
    this.exteriorPreview = null;
    this.nicPreview = null;
    this.licensePreview = null;
    this.insurancePreview = null;
    this.revenuePreview = null;
  }
}
