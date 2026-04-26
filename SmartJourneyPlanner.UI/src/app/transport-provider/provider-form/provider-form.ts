import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { VehicleType, VehicleClass, Vehicle } from '../../models/transport.model';
import Swal from 'sweetalert2';
import { TransportVehicleService } from '../../services/transport-vehicle.service';

@Component({
  selector: 'app-provider-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './provider-form.html',
  styleUrl: './provider-form.css'
})
export class ProviderForm implements OnInit {
  vehicleForm!: FormGroup;
  todayStr: string = '';
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

  // City Autocomplete
  sriLankanCities = [
    'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Dehiwala-Mount Lavinia',
    'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi',
    'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala', 'Moratuwa', 'Mullaitivu',
    'Negombo', 'Nuwara Eliya', 'Panadura', 'Polonnaruwa', 'Puttalam', 'Ratnapura',
    'Sri Jayawardenepura Kotte', 'Trincomalee', 'Vavuniya', 'Wattala'
  ];
  filteredCities: string[] = [];
  isCityDropdownOpen = false;

  // Image previews
  interiorPreview: string | ArrayBuffer | null = null;
  exteriorPreview: string | ArrayBuffer | null = null;
  nicPreview: string | ArrayBuffer | null = null;
  licensePreview: string | ArrayBuffer | null = null;
  insurancePreview: string | ArrayBuffer | null = null;
  revenuePreview: string | ArrayBuffer | null = null;
  isSubmitting = false;
  
  // File validation state
  fileErrors: { [key: string]: string | null } = {
    interior: null,
    exterior: null,
    nic: null,
    license: null,
    insurance: null,
    revenue: null
  };
  submitted = false;

  constructor(
    private fb: FormBuilder, 
    private eRef: ElementRef,
    private transportVehicleService: TransportVehicleService
  ) {}

  ngOnInit() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    this.todayStr = `${y}-${m}-${d}`;
    
    this.initForm();
  }

  initForm() {
    const currentYear = new Date().getFullYear();
    // Support international formats and common separators (spaces, hyphens, brackets)
    const phoneRegex = /^\+?[0-9\s\-\(\)]{7,20}$/;
    // Must contain at least 2 letters, and ONLY letters, spaces, dots or hyphens. No numbers.
    const nameRegex = /^(?=.*[a-zA-Z].*[a-zA-Z])[a-zA-Z\s\.\-]{3,}$/;
    // Location: Must contain at least 2 letters, and ONLY letters, spaces, dots or hyphens. No numbers.
    const locationRegex = /^(?=.*[a-zA-Z].*[a-zA-Z])[a-zA-Z\s\.\,\-\/]{3,}$/;
    // Vehicle Model: Must contain at least one letter, allows numbers and common separators.
    const modelRegex = /^(?=.*[a-zA-Z])[a-zA-Z0-9\s\.\-]{2,50}$/;

    this.vehicleForm = this.fb.group({
      providerProfile: this.fb.group({
        name: ['', [Validators.required, Validators.pattern(nameRegex), this.repeatedCharValidator]],
        phone: ['', [Validators.required, Validators.pattern(phoneRegex), this.repeatedPhoneValidator]],
        email: ['', [Validators.required, this.emailValidator]],
        location: ['', [Validators.required, Validators.pattern(locationRegex), this.repeatedCharValidator]]
      }),
      type: [VehicleType.Budget, Validators.required],
      vehicleClass: ['Car', Validators.required],
      modelName: ['', [Validators.required, Validators.pattern(modelRegex)]],
      yearOfManufacture: [currentYear, [Validators.required, Validators.min(1950), Validators.max(currentYear + 1)]],
      seatCount: [4, [Validators.required, Validators.min(1), Validators.max(100)]],
      isAc: [true],
      standardDailyRate: [2000, [Validators.required, Validators.min(500), Validators.max(500000)]],
      freeKMLimit: [100, [Validators.required, Validators.min(10)]],
      extraKMRate: [50, [Validators.required, Validators.min(1), Validators.max(2000)]],
      driverNightOutFee: [1000, [Validators.required, Validators.min(0), Validators.max(50000)]],
      
      features: this.fb.group({
        luggage: [2, [Validators.required, Validators.min(1), Validators.max(50)]],
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
    }, { validators: this.vehicleClassSeatValidator });
  }

  // Cross-field validator: Vehicle Class vs Seat Count
  vehicleClassSeatValidator(group: FormGroup) {
    const vClass = group.get('vehicleClass')?.value;
    const seats = group.get('seatCount')?.value;

    if (vClass === 'Car' && seats > 9) return { invalidSeatsForCar: true };
    if (vClass === 'Van' && (seats < 5 || seats > 20)) return { invalidSeatsForVan: true };
    if (vClass === 'Bus' && seats < 15) return { invalidSeatsForBus: true };

    return null;
  }

  // Prevent non-numeric characters in numeric fields
  onNumericKeyDown(event: KeyboardEvent) {
    const allowedKeys = ['Backspace', 'Tab', 'End', 'Home', 'ArrowLeft', 'ArrowRight', 'Delete', 'Enter'];
    if (allowedKeys.includes(event.key)) return;
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  // Custom Validator to prevent repeated characters and numbers
  repeatedCharValidator(control: any) {
    if (!control.value) return null;
    const val = control.value;
    
    // Check for numbers (Commonly not expected in City/Area name)
    if (/[0-9]/.test(val)) {
      return { hasNumbers: true };
    }

    const cleaned = val.replace(/[\s\.\-\/\,]/g, '').toLowerCase();
    if (cleaned.length > 0) {
      const allSame = cleaned.split('').every((char: string) => char === cleaned[0]);
      if (allSame && cleaned.length < 10) return { repeatedChars: true };
    }
    return null;
  }

  // Custom Email Validator for fake detection
  emailValidator(control: any) {
    if (!control.value) return null;
    const email = control.value.toLowerCase();
    
    // Basic regex for better format check
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return { invalidFormat: true };
    }
    
    // Block common fake emails
    const fakeEmails = ['test@test.com', 'abc@abc.com', 'a@a.com', 'aaa@aaa.com'];
    if (fakeEmails.includes(email)) {
      return { isFake: true };
    }
    
    return null;
  }

  // Custom Validator for repeated digits in phone
  repeatedPhoneValidator(control: any) {
    if (!control.value) return null;
    const val = control.value;
    
    // Check for letters
    if (/[a-zA-Z]/.test(val)) {
      return { hasLetters: true };
    }

    const digitsOnly = val.replace(/\D/g, '');
    
    // Sri Lankan specific check
    const isSL = /^(?:0|94|\+94)?7[01245678]\d{7}$/.test(val.replace(/\s/g, ''));
    if (!isSL) {
      return { invalidSL: true };
    }

    if (digitsOnly.length > 5) {
      const allSame = digitsOnly.split('').every((char: string) => char === digitsOnly[0]);
      if (allSame) return { repeatedDigits: true };
    }
    return null;
  }

  isFieldInvalid(path: string): boolean {
    const control = this.vehicleForm.get(path);
    if (!control) return false;
    return !!(control.invalid && (control.touched || control.dirty));
  }

  onFileSelected(event: any, type: 'interior' | 'exterior' | 'nic' | 'license' | 'insurance' | 'revenue') {
    const file = event.target.files[0];
    this.fileErrors[type] = null; // Reset error

    if (file) {
      // 1. File Type Validation (.jpg, .png, .pdf)
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        this.fileErrors[type] = 'Only .jpg, .png, and .pdf files are allowed.';
        this.clearPreview(type);
        return;
      }

      // 2. File Size Validation (Max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        this.fileErrors[type] = 'File size must be less than 5MB.';
        this.clearPreview(type);
        return;
      }

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

  private clearPreview(type: string) {
    switch (type) {
      case 'interior': this.interiorPreview = null; break;
      case 'exterior': this.exteriorPreview = null; break;
      case 'nic': this.nicPreview = null; break;
      case 'license': this.licensePreview = null; break;
      case 'insurance': this.insurancePreview = null; break;
      case 'revenue': this.revenuePreview = null; break;
    }
  }

  isFileMissing(type: string): boolean {
    const preview = (this as any)[`${type}Preview`];
    return this.submitted && !preview && !this.fileErrors[type];
  }

  onLanguageChange(lang: string, event: any) {
    const checked = event.target.checked;
    const currentLanguages = this.vehicleForm.get('languages')?.value as string[] || [];
    
    if (checked) {
      if (!currentLanguages.includes(lang)) {
        this.vehicleForm.patchValue({ languages: [...currentLanguages, lang] });
      }
    } else {
      this.vehicleForm.patchValue({ languages: currentLanguages.filter((l: string) => l !== lang) });
    }
  }

  isLanguageSelected(lang: string): boolean {
    return (this.vehicleForm.get('languages')?.value as string[] || []).includes(lang);
  }

  toggleLanguageDropdown() {
    this.isLanguageDropdownOpen = !this.isLanguageDropdownOpen;
    if (this.isLanguageDropdownOpen) this.closeAllDropdownsExcept('language');
  }

  getSelectedLanguagesDisplay(): string {
    const selected = this.vehicleForm.get('languages')?.value as string[] || [];
    if (selected.length === 0) return 'Select all languages you can speak';
    if (selected.length <= 2) return selected.join(', ');
    return `${selected.slice(0, 2).join(', ')} +${selected.length - 2} more`;
  }

  toggleCategoryDropdown() {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
    if (this.isCategoryDropdownOpen) this.closeAllDropdownsExcept('category');
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
    this.isCityDropdownOpen = except === 'city';
  }

  filterCities(event: any) {
    const value = event.target.value.toLowerCase();
    if (value) {
      this.filteredCities = this.sriLankanCities.filter(city => city.toLowerCase().includes(value));
      this.isCityDropdownOpen = this.filteredCities.length > 0;
    } else {
      this.filteredCities = [];
      this.isCityDropdownOpen = false;
    }
  }

  selectCity(city: string) {
    this.vehicleForm.get('providerProfile.location')?.setValue(city);
    this.isCityDropdownOpen = false;
  }

  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    const targetElement = event.target as HTMLElement;

    // If click is outside of any pf-dropdown, close them all
    if (!targetElement.closest('.pf-dropdown')) {
      this.isLanguageDropdownOpen = false;
      this.isCategoryDropdownOpen = false;
      this.isVehicleClassDropdownOpen = false;
      this.isFuelTypeDropdownOpen = false;
      this.isTransmissionDropdownOpen = false;
    }

    // Close city autocomplete if click is outside the location input and its dropdown
    const isCityAutocompleteClick = targetElement.closest('input[formControlName="location"]') || targetElement.closest('.pf-dropdown-menu');
    if (!isCityAutocompleteClick) {
      this.isCityDropdownOpen = false;
    }
  }

  submitForm() {
    if (this.isSubmitting) return;
    this.submitted = true;
    if (this.vehicleForm.invalid) {
      this.vehicleForm.markAllAsTouched();
      Swal.fire('Error', 'Please fill all required fields correctly.', 'error');
      return;
    }

    const hasFileErrors = Object.values(this.fileErrors).some(err => err !== null);
    if (hasFileErrors) {
      Swal.fire('Invalid Files', 'Please fix the errors in your uploaded files.', 'error');
      return;
    }

    if (!this.exteriorPreview || !this.interiorPreview || !this.nicPreview || !this.licensePreview || !this.insurancePreview || !this.revenuePreview) {
      Swal.fire('Missing Documents', 'Please upload all required photos and verification documents.', 'warning');
      return;
    }

    // Trimming logic to remove extra whitespace
    const rawValue = this.vehicleForm.value;
    const cleanValue = {
      ...rawValue,
      providerProfile: {
        ...rawValue.providerProfile,
        name: rawValue.providerProfile.name.trim(),
        email: rawValue.providerProfile.email.trim().toLowerCase(),
        location: rawValue.providerProfile.location.trim()
      },
      modelName: rawValue.modelName.trim()
    };

    const formData: Vehicle = {
      ...cleanValue,
      providerId: 'p1', // mock provider ID
      interiorPhoto: this.interiorPreview as string,
      exteriorPhoto: this.exteriorPreview as string,
      driverNicUrl: this.nicPreview as string,
      driverLicenseUrl: this.licensePreview as string,
      insuranceDocUrl: this.insurancePreview as string,
      revenueLicenseUrl: this.revenuePreview as string,
      description: '',
      isVerified: false,
      status: 'Pending',
      reviews: [],
      availableDates: [],
      bookedDates: []
    };

    this.isSubmitting = true;
    this.transportVehicleService.createVehicle(formData).subscribe({
      next: () => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          title: 'Listing Submitted!',
          text: 'Your vehicle listing is under review. It will be published once verified.',
          confirmButtonColor: '#38bdf8'
        });
        this.resetForm();
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error(err);
        Swal.fire('Error', 'Failed to submit listing.', 'error');
      }
    });
  }

  resetForm() {
    this.submitted = false;
    this.vehicleForm.reset({
      providerProfile: { name: '', phone: '', email: '', location: '' },
      type: VehicleType.Budget,
      vehicleClass: 'Car',
      modelName: '',
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
