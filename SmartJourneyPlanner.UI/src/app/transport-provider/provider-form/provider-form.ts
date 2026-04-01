import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
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
  categoryList = [
    { type: VehicleType.Budget, label: 'Budget (Alto, Axio)' },
    { type: VehicleType.Luxury, label: 'Luxury (Mercedes, BMW)' },
    { type: VehicleType.Group, label: 'Group (Van, Bus)' }
  ];
  vehicleClasses: VehicleClass[] = ['Car', 'Van', 'Bus'];
  languagesList = [
    { name: 'Sinhala', code: 'LK' },
    { name: 'English', code: 'GB' },
    { name: 'Tamil', code: 'IN' },
    { name: 'French', code: 'FR' },
    { name: 'German', code: 'DE' },
    { name: 'Russian', code: 'RU' },
    { name: 'Chinese', code: 'CN' },
    { name: 'Japanese', code: 'JP' },
    { name: 'Italian', code: 'IT' },
    { name: 'Spanish', code: 'ES' },
    { name: 'Arabic', code: 'AE' },
    { name: 'Korean', code: 'KR' }
  ];
  isLanguageDropdownOpen = false;
  isCategoryDropdownOpen = false;
  isVehicleClassDropdownOpen = false;
  isFuelTypeDropdownOpen = false;
  isTransmissionDropdownOpen = false;

  // Image previews
  interiorPreview: string | ArrayBuffer | null = null;
  exteriorPreview: string | ArrayBuffer | null = null;
  nicPreview: string | ArrayBuffer | null = null;
  licensePreview: string | ArrayBuffer | null = null;
  insurancePreview: string | ArrayBuffer | null = null;
  revenuePreview: string | ArrayBuffer | null = null;

  constructor(private fb: FormBuilder, private eRef: ElementRef) {}

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
      
      transmission: ['Automatic', Validators.required],
      fuelType: ['Petrol', Validators.required],
      termsAccepted: [false, Validators.requiredTrue],
      
      insuranceExpiry: ['', Validators.required],
      revenueLicenseExpiry: ['', Validators.required]
    });
  }

  isFieldInvalid(path: string): boolean {
    const control = this.vehicleForm.get(path);
    if (!control) return false;
    return !!(control.invalid && (control.touched || control.dirty));
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

  onLanguageChange(lang: string, event: any) {
    const checked = event.target.checked;
    const currentLanguages = this.vehicleForm.get('languages')?.value as string[] || [];
    
    if (checked) {
      this.vehicleForm.patchValue({ languages: [...currentLanguages, lang] });
    } else {
      this.vehicleForm.patchValue({ languages: currentLanguages.filter(l => l !== lang) });
    }
  }

  isLanguageSelected(lang: string): boolean {
    return (this.vehicleForm.get('languages')?.value as string[] || []).includes(lang);
  }

  toggleLanguageDropdown() {
    this.isLanguageDropdownOpen = !this.isLanguageDropdownOpen;
  }

  getSelectedLanguagesDisplay(): string {
    const selected = this.vehicleForm.get('languages')?.value as string[] || [];
    if (selected.length === 0) return 'Select all languages you can speak';
    if (selected.length <= 2) return selected.join(', ');
    return `${selected.slice(0, 2).join(', ')} +${selected.length - 2} more`;
  }

  toggleCategoryDropdown() {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
    if (this.isCategoryDropdownOpen) this.isLanguageDropdownOpen = false;
  }

  selectCategory(type: VehicleType) {
    this.vehicleForm.patchValue({ type });
    this.isCategoryDropdownOpen = false;
  }

  getCategoryDisplay(): string {
    const type = this.vehicleForm.get('type')?.value;
    return this.categoryList.find(c => c.type === type)?.label || 'Select Category';
  }

  toggleVehicleClassDropdown() {
    this.isVehicleClassDropdownOpen = !this.isVehicleClassDropdownOpen;
    if (this.isVehicleClassDropdownOpen) this.closeAllDropdownsExcept('vehicleClass');
  }

  selectVehicleClass(cls: VehicleClass) {
    this.vehicleForm.patchValue({ vehicleClass: cls });
    this.isVehicleClassDropdownOpen = false;
  }

  toggleFuelTypeDropdown() {
    this.isFuelTypeDropdownOpen = !this.isFuelTypeDropdownOpen;
    if (this.isFuelTypeDropdownOpen) this.closeAllDropdownsExcept('fuelType');
  }

  selectFuelType(type: string) {
    this.vehicleForm.patchValue({ fuelType: type });
    this.isFuelTypeDropdownOpen = false;
  }

  toggleTransmissionDropdown() {
    this.isTransmissionDropdownOpen = !this.isTransmissionDropdownOpen;
    if (this.isTransmissionDropdownOpen) this.closeAllDropdownsExcept('transmission');
  }

  selectTransmission(trans: string) {
    this.vehicleForm.patchValue({ transmission: trans });
    this.isTransmissionDropdownOpen = false;
  }

  private closeAllDropdownsExcept(except: string) {
    this.isLanguageDropdownOpen = except === 'language';
    this.isCategoryDropdownOpen = except === 'category';
    this.isVehicleClassDropdownOpen = except === 'vehicleClass';
    this.isFuelTypeDropdownOpen = except === 'fuelType';
    this.isTransmissionDropdownOpen = except === 'transmission';
  }

  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.isLanguageDropdownOpen = false;
      this.isCategoryDropdownOpen = false;
      this.isVehicleClassDropdownOpen = false;
      this.isFuelTypeDropdownOpen = false;
      this.isTransmissionDropdownOpen = false;
    }
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
      languages: [],
      transmission: 'Automatic',
      fuelType: 'Petrol',
      termsAccepted: false
    });
    this.interiorPreview = null;
    this.exteriorPreview = null;
    this.nicPreview = null;
    this.licensePreview = null;
    this.insurancePreview = null;
    this.revenuePreview = null;
  }
}
