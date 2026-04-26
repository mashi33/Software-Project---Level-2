/**
 * This component handles the form for Transport Providers to list their vehicles.
 * It includes complex validations, image uploads, and city autocomplete logic.
 */

import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { VehicleType, VehicleClass, Vehicle } from '../../models/transport.model';
import Swal from 'sweetalert2';
import { TransportVehicleService } from '../../services/transport-vehicle.service';

@Component({
    selector: 'app-provider-form',
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './provider-form.html',
    styleUrl: './provider-form.css'
})
export class ProviderForm implements OnInit {
  vehicleForm!: FormGroup;
  todayStr: string = ''; // Today's date to restrict calendar selection
  
  // Data for dropdowns and selections
  vehicleTypes = Object.values(VehicleType);
  categoryList = [
    { type: VehicleType.Budget, label: 'Budget (Alto, Axio)' },
    { type: VehicleType.Luxury, label: 'Luxury (Mercedes, BMW)' },
    { type: VehicleType.Group, label: 'Group (Van, Bus)' }
  ];
  vehicleClasses: VehicleClass[] = ['Car', 'Van', 'Bus'];
  
  languagesList = [
    { name: 'Sinhala', code: 'LK' }, { name: 'English', code: 'GB' }, { name: 'Tamil', code: 'IN' },
    { name: 'French', code: 'FR' }, { name: 'German', code: 'DE' }, { name: 'Russian', code: 'RU' },
    { name: 'Chinese', code: 'CN' }, { name: 'Japanese', code: 'JP' }, { name: 'Italian', code: 'IT' },
    { name: 'Spanish', code: 'ES' }, { name: 'Arabic', code: 'AE' }, { name: 'Korean', code: 'KR' }
  ];

  // Visibility states for custom dropdown menus
  isLanguageDropdownOpen = false;
  isCategoryDropdownOpen = false;
  isVehicleClassDropdownOpen = false;
  isFuelTypeDropdownOpen = false;
  isTransmissionDropdownOpen = false;

  // Sri Lankan City list for the location autocomplete feature
  sriLankanCities = [
    'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Dehiwala-Mount Lavinia',
    'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi',
    'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala', 'Moratuwa', 'Mullaitivu',
    'Negombo', 'Nuwara Eliya', 'Panadura', 'Polonnaruwa', 'Puttalam', 'Ratnapura',
    'Sri Jayawardenepura Kotte', 'Trincomalee', 'Vavuniya', 'Wattala'
  ];
  filteredCities: string[] = []; 
  isCityDropdownOpen = false;

  // Variables to store image data (Base64 strings) for previewing
  interiorPreview: string | ArrayBuffer | null = null;
  exteriorPreview: string | ArrayBuffer | null = null;
  nicPreview: string | ArrayBuffer | null = null;
  licensePreview: string | ArrayBuffer | null = null;
  insurancePreview: string | ArrayBuffer | null = null;
  revenuePreview: string | ArrayBuffer | null = null;
  
  isSubmitting = false; // Flag to prevent multiple clicks on Submit button

  // Tracks error messages for each specific file upload
  fileErrors: { [key: string]: string | null } = {
    interior: null, exterior: null, nic: null, license: null, insurance: null, revenue: null
  };
  submitted = false; // Becomes true once the user clicks "Submit"

  constructor(
    private fb: FormBuilder, 
    private eRef: ElementRef,
    private transportVehicleService: TransportVehicleService
  ) {}

  ngOnInit() {
    // Generate today's date string for HTML date inputs
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    this.todayStr = `${y}-${m}-${d}`;
    
    this.initForm();
  }

  /**
   * Defines the form fields and their validation rules.
   */
  initForm() {
    const currentYear = new Date().getFullYear();
    
    // Regular Expressions for strict validation
    const phoneRegex = /^\+?[0-9\s\-\(\)]{7,20}$/; 
    const nameRegex = /^(?=.*[a-zA-Z].*[a-zA-Z])[a-zA-Z\s\.\-]{3,}$/; 
    const locationRegex = /^(?=.*[a-zA-Z].*[a-zA-Z])[a-zA-Z\s\.\,\-\/]{3,}$/; 

    this.vehicleForm = this.fb.group({
      // Owner information
      providerProfile: this.fb.group({
        name: ['', [Validators.required, Validators.pattern(nameRegex), this.repeatedCharValidator]],
        phone: ['', [Validators.required, Validators.pattern(phoneRegex), this.repeatedPhoneValidator]],
        email: ['', [Validators.required, this.emailValidator]],
        location: ['', [Validators.required, Validators.pattern(locationRegex), this.repeatedCharValidator]]
      }),
      
      // Vehicle details
      type: [VehicleType.Budget, Validators.required],
      vehicleClass: ['Car', Validators.required],
      modelName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      yearOfManufacture: [currentYear, [Validators.required, Validators.min(1950), Validators.max(currentYear + 1)]],
      seatCount: [4, [Validators.required, Validators.min(1), Validators.max(100)]],
      isAc: [true],
      
      // Pricing settings
      standardDailyRate: [2000, [Validators.required, Validators.min(500), Validators.max(500000)]],
      freeKMLimit: [100, [Validators.required, Validators.min(10)]],
      extraKMRate: [50, [Validators.required, Validators.min(1), Validators.max(2000)]],
      driverNightOutFee: [1000, [Validators.required, Validators.min(0), Validators.max(50000)]],
      
      // Features (Checkboxes)
      features: this.fb.group({
        luggage: [2, [Validators.required, Validators.min(1), Validators.max(50)]],
        safety: [false], childSeats: [false], entertainment: [false], tv: [false], 
        wifi: [false], bluetooth: [false], airbags: [true], usbCharging: [false]
      }),
      
      languages: [[], Validators.required], // List of languages the driver speaks
      transmission: ['Automatic', Validators.required],
      fuelType: ['Petrol', Validators.required],
      termsAccepted: [false, Validators.requiredTrue], // Provider must agree to rules
      
      insuranceExpiry: ['', Validators.required],
      revenueLicenseExpiry: ['', Validators.required]
    }, { validators: this.vehicleClassSeatValidator }); 
  }

  /**
   * Cross-checks vehicle type and seat count.
   * Prevents errors like a "Car" having 30 seats or a "Bus" having 2 seats.
   */
  vehicleClassSeatValidator(group: FormGroup) {
    const vClass = group.get('vehicleClass')?.value;
    const seats = group.get('seatCount')?.value;

    if (vClass === 'Car' && seats > 9) return { invalidSeatsForCar: true };
    if (vClass === 'Van' && (seats < 5 || seats > 20)) return { invalidSeatsForVan: true };
    if (vClass === 'Bus' && seats < 15) return { invalidSeatsForBus: true };

    return null;
  }

  // Prevents typing letters in price/numeric fields
  onNumericKeyDown(event: KeyboardEvent) {
    const allowedKeys = ['Backspace', 'Tab', 'End', 'Home', 'ArrowLeft', 'ArrowRight', 'Delete', 'Enter'];
    if (allowedKeys.includes(event.key)) return;
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  // Catch fake names like "aaaaa" or names containing numbers
  repeatedCharValidator(control: any) {
    if (!control.value) return null;
    const val = control.value;
    if (/[0-9]/.test(val)) return { hasNumbers: true };
    const cleaned = val.replace(/[\s\.\-\/\,]/g, '').toLowerCase();
    if (cleaned.length > 0) {
      const allSame = cleaned.split('').every((char: string) => char === cleaned[0]);
      if (allSame && cleaned.length < 10) return { repeatedChars: true };
    }
    return null;
  }

  // Validates email format and blocks "test@test.com"
  emailValidator(control: any) {
    if (!control.value) return null;
    const email = control.value.toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return { invalidFormat: true };
    const fakeEmails = ['test@test.com', 'abc@abc.com', 'a@a.com', 'aaa@aaa.com'];
    if (fakeEmails.includes(email)) return { isFake: true };
    return null;
  }

  // Validates phone numbers and checks for Sri Lankan format (+94)
  repeatedPhoneValidator(control: any) {
    if (!control.value) return null;
    const val = control.value;
    if (/[a-zA-Z]/.test(val)) return { hasLetters: true };
    const digitsOnly = val.replace(/\D/g, '');
    const isSL = /^(?:0|94|\+94)?7[01245678]\d{7}$/.test(val.replace(/\s/g, ''));
    if (!isSL) return { invalidSL: true };
    if (digitsOnly.length > 5) {
      const allSame = digitsOnly.split('').every((char: string) => char === digitsOnly[0]);
      if (allSame) return { repeatedDigits: true };
    }
    return null;
  }

  // Returns true if a specific form field has validation errors
  isFieldInvalid(path: string): boolean {
    const control = this.vehicleForm.get(path);
    if (!control) return false;
    return !!(control.invalid && (control.touched || control.dirty));
  }

  /**
   * Handles selecting photos and PDF documents.
   * Checks for valid formats (PNG/JPG/PDF) and file size (Max 5MB).
   */
  onFileSelected(event: any, type: 'interior' | 'exterior' | 'nic' | 'license' | 'insurance' | 'revenue') {
    const file = event.target.files[0];
    this.fileErrors[type] = null;

    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        this.fileErrors[type] = 'Only .jpg, .png, and .pdf files are allowed.';
        this.clearPreview(type);
        return;
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        this.fileErrors[type] = 'File size must be less than 5MB.';
        this.clearPreview(type);
        return;
      }

      // Convert file to Base64 string for previewing and saving
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

  // Returns true if a required file is missing when trying to submit
  isFileMissing(type: string): boolean {
    const preview = (this as any)[`${type}Preview`];
    return this.submitted && !preview && !this.fileErrors[type];
  }

  // Updates the language selection list based on checkbox clicks
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

  // --- Dropdown UI Handlers ---
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

  // --- Autocomplete for City ---
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

  // Close dropdowns if the user clicks outside of them
  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    const targetElement = event.target as HTMLElement;
    if (!targetElement.closest('.pf-dropdown')) {
      this.isLanguageDropdownOpen = false;
      this.isCategoryDropdownOpen = false;
      this.isVehicleClassDropdownOpen = false;
      this.isFuelTypeDropdownOpen = false;
      this.isTransmissionDropdownOpen = false;
    }
    const isCityAutocompleteClick = targetElement.closest('input[formControlName="location"]') || targetElement.closest('.pf-dropdown-menu');
    if (!isCityAutocompleteClick) this.isCityDropdownOpen = false;
  }

  /**
   * Submits the entire vehicle listing to the server.
   * Includes all text data and base64 strings for images.
   */
  submitForm() {
    if (this.isSubmitting) return; 
    this.submitted = true;
    
    // Step 1: Form Validation
    if (this.vehicleForm.invalid) {
      this.vehicleForm.markAllAsTouched();
      Swal.fire('Error', 'Please fill all required fields correctly.', 'error');
      return;
    }

    // Step 2: File Validation
    const hasFileErrors = Object.values(this.fileErrors).some(err => err !== null);
    if (hasFileErrors) {
      Swal.fire('Invalid Files', 'Please fix the errors in your uploaded files.', 'error');
      return;
    }

    // Step 3: Check for missing mandatory uploads
    if (!this.exteriorPreview || !this.interiorPreview || !this.nicPreview || !this.licensePreview || !this.insurancePreview || !this.revenuePreview) {
      Swal.fire('Missing Documents', 'Please upload all required photos and verification documents.', 'warning');
      return;
    }

    // Prepare data for API
    const rawValue = this.vehicleForm.value;
    const formData: Vehicle = {
      ...rawValue,
      providerId: 'p1', // Mock Provider ID
      interiorPhoto: this.interiorPreview as string,
      exteriorPhoto: this.exteriorPreview as string,
      driverNicUrl: this.nicPreview as string,
      driverLicenseUrl: this.licensePreview as string,
      insuranceDocUrl: this.insurancePreview as string,
      revenueLicenseUrl: this.revenuePreview as string,
      isVerified: false,
      status: 'Pending',
      reviews: [], availableDates: [], bookedDates: []
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
        Swal.fire('Error', 'Failed to submit listing.', 'error');
      }
    });
  }

  // Resets all fields and clear image previews
  resetForm() {
    this.submitted = false;
    this.vehicleForm.reset({
      providerProfile: { name: '', phone: '', email: '', location: '' },
      type: VehicleType.Budget, vehicleClass: 'Car', modelName: '',
      yearOfManufacture: new Date().getFullYear(), seatCount: 4, isAc: true,
      standardDailyRate: 0, freeKMLimit: 100, extraKMRate: 0, driverNightOutFee: 0,
      features: { luggage: 2, safety: false, airbags: true },
      languages: [], transmission: 'Automatic', fuelType: 'Petrol', termsAccepted: false
    });
    this.interiorPreview = this.exteriorPreview = this.nicPreview = this.licensePreview = this.insurancePreview = this.revenuePreview = null;
  }
}
