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
/**
 * This component handles the form for transport providers to list their vehicles.
 * It includes validation, image uploading, and city autocomplete.
 */
export class ProviderForm implements OnInit {
  // Form and helper variables
  vehicleForm!: FormGroup;
  todayStr: string = ''; // Used to restrict date selection to future only
  vehicleTypes = Object.values(VehicleType); // Enum values for vehicle types
  
  // List of categories shown in the dropdown
  categoryList = [
    { type: VehicleType.Budget, label: 'Budget (Alto, Axio)' },
    { type: VehicleType.Luxury, label: 'Luxury (Mercedes, BMW)' },
    { type: VehicleType.Group, label: 'Group (Van, Bus)' }
  ];
  
  vehicleClasses: VehicleClass[] = ['Car', 'Van', 'Bus'];
  
  // List of languages available for selection
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

  // UI state for various dropdowns
  isLanguageDropdownOpen = false;
  isCategoryDropdownOpen = false;
  isVehicleClassDropdownOpen = false;
  isFuelTypeDropdownOpen = false;
  isTransmissionDropdownOpen = false;

  // List of major Sri Lankan cities for the location autocomplete
  sriLankanCities = [
    'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Dehiwala-Mount Lavinia',
    'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi',
    'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala', 'Moratuwa', 'Mullaitivu',
    'Negombo', 'Nuwara Eliya', 'Panadura', 'Polonnaruwa', 'Puttalam', 'Ratnapura',
    'Sri Jayawardenepura Kotte', 'Trincomalee', 'Vavuniya', 'Wattala'
  ];
  filteredCities: string[] = []; // Cities filtered based on user input
  isCityDropdownOpen = false;

  // Stores base64 strings of uploaded images for preview and submission
  interiorPreview: string | ArrayBuffer | null = null;
  exteriorPreview: string | ArrayBuffer | null = null;
  nicPreview: string | ArrayBuffer | null = null;
  licensePreview: string | ArrayBuffer | null = null;
  insurancePreview: string | ArrayBuffer | null = null;
  revenuePreview: string | ArrayBuffer | null = null;
  
  isSubmitting = false; // Prevents multiple clicks on the submit button
  
  // Stores error messages for each file upload
  fileErrors: { [key: string]: string | null } = {
    interior: null,
    exterior: null,
    nic: null,
    license: null,
    insurance: null,
    revenue: null
  };
  submitted = false; // Tracks if the user has tried to submit the form

  constructor(
    private fb: FormBuilder, 
    private eRef: ElementRef,
    private transportVehicleService: TransportVehicleService
  ) {}

  // Runs when the component loads
  ngOnInit() {
    // Set today's date string for HTML date input 'min' attribute
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    this.todayStr = `${y}-${m}-${d}`;
    
    this.initForm();
  }

  /**
   * Initializes the Reactive Form with all controls and validation rules.
   */
  initForm() {
    const currentYear = new Date().getFullYear();
    
    // Regular expressions for text pattern validation
    const phoneRegex = /^\+?[0-9\s\-\(\)]{7,20}$/; // Standard phone format
    const nameRegex = /^(?=.*[a-zA-Z].*[a-zA-Z])[a-zA-Z\s\.\-]{3,}$/; // No numbers, min 3 chars
    const locationRegex = /^(?=.*[a-zA-Z].*[a-zA-Z])[a-zA-Z\s\.\,\-\/]{3,}$/; // Address format
    const modelRegex = /^[a-zA-Z0-9\s\.\-\(\)]{2,50}$/; // Allows parentheses too

    this.vehicleForm = this.fb.group({
      // Personal details of the transport owner
      providerProfile: this.fb.group({
        name: ['', [Validators.required, Validators.pattern(nameRegex), this.repeatedCharValidator]],
        phone: ['', [Validators.required, Validators.pattern(phoneRegex), this.repeatedPhoneValidator]],
        email: ['', [Validators.required, this.emailValidator]],
        location: ['', [Validators.required, Validators.pattern(locationRegex), this.repeatedCharValidator]]
      }),
      
      // Basic vehicle details
      type: [VehicleType.Budget, Validators.required],
      vehicleClass: ['Car', Validators.required],
      modelName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      yearOfManufacture: [currentYear, [Validators.required, Validators.min(1950), Validators.max(currentYear + 1)]],
      seatCount: [4, [Validators.required, Validators.min(1), Validators.max(100)]],
      isAc: [true],
      
      // Pricing details
      standardDailyRate: [2000, [Validators.required, Validators.min(500), Validators.max(500000)]],
      freeKMLimit: [100, [Validators.required, Validators.min(10)]],
      extraKMRate: [50, [Validators.required, Validators.min(1), Validators.max(2000)]],
      driverNightOutFee: [1000, [Validators.required, Validators.min(0), Validators.max(50000)]],
      
      // Safety and comfort features
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
      
      languages: [[], Validators.required], // Languages the driver can speak
      
      transmission: ['Automatic', Validators.required],
      fuelType: ['Petrol', Validators.required],
      termsAccepted: [false, Validators.requiredTrue], // User must agree to terms
      
      insuranceExpiry: ['', Validators.required],
      revenueLicenseExpiry: ['', Validators.required]
    }, { validators: this.vehicleClassSeatValidator }); // Add cross-field validation
  }

  /**
   * Validates that the seat count makes sense for the selected vehicle class.
   * e.g., A car shouldn't have 50 seats.
   */
  vehicleClassSeatValidator(group: FormGroup) {
    const vClass = group.get('vehicleClass')?.value;
    const seats = group.get('seatCount')?.value;

    if (vClass === 'Car' && seats > 9) return { invalidSeatsForCar: true };
    if (vClass === 'Van' && (seats < 5 || seats > 20)) return { invalidSeatsForVan: true };
    if (vClass === 'Bus' && seats < 15) return { invalidSeatsForBus: true };

    return null;
  }

  /**
   * Restricts user input to numbers only for numeric fields.
   */
  onNumericKeyDown(event: KeyboardEvent) {
    const allowedKeys = ['Backspace', 'Tab', 'End', 'Home', 'ArrowLeft', 'ArrowRight', 'Delete', 'Enter'];
    if (allowedKeys.includes(event.key)) return;
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  /**
   * Custom validator to catch names that are just repeated characters like "aaaaa"
   * and to prevent numbers in name fields.
   */
  repeatedCharValidator(control: any) {
    if (!control.value) return null;
    const val = control.value;
    
    // Check for numbers (not allowed in names)
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

  /**
   * Custom email validator to check format and block common "test" emails.
   */
  emailValidator(control: any) {
    if (!control.value) return null;
    const email = control.value.toLowerCase();
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return { invalidFormat: true };
    }
    
    // Block obviously fake emails
    const fakeEmails = ['test@test.com', 'abc@abc.com', 'a@a.com', 'aaa@aaa.com'];
    if (fakeEmails.includes(email)) {
      return { isFake: true };
    }
    
    return null;
  }

  /**
   * Custom phone validator: checks for Sri Lankan format and repeated digits.
   */
  repeatedPhoneValidator(control: any) {
    if (!control.value) return null;
    const val = control.value;
    
    if (/[a-zA-Z]/.test(val)) {
      return { hasLetters: true };
    }

    const digitsOnly = val.replace(/\D/g, '');
    
    // Specific check for Sri Lankan mobile/landline patterns
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

  /**
   * Helper to check if a specific field has an error and should be highlighted.
   */
  isFieldInvalid(path: string): boolean {
    const control = this.vehicleForm.get(path);
    if (!control) return false;
    return !!(control.invalid && (control.touched || control.dirty));
  }

  /**
   * Handles file selection for images and documents.
   * Includes validation for file type (PNG/JPG/PDF) and size (5MB).
   */
  onFileSelected(event: any, type: 'interior' | 'exterior' | 'nic' | 'license' | 'insurance' | 'revenue') {
    const file = event.target.files[0];
    this.fileErrors[type] = null; // Clear previous error

    if (file) {
      // Check file extension
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        this.fileErrors[type] = 'Only .jpg, .png, and .pdf files are allowed.';
        this.clearPreview(type);
        return;
      }

      // Check file size (Max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        this.fileErrors[type] = 'File size must be less than 5MB.';
        this.clearPreview(type);
        return;
      }

      // Read file and generate a base64 string for preview
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

  /**
   * Clears an image preview when a file is removed or invalid.
   */
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

  /**
   * Checks if a required file is missing after the user tries to submit.
   */
  isFileMissing(type: string): boolean {
    const preview = (this as any)[`${type}Preview`];
    return this.submitted && !preview && !this.fileErrors[type];
  }

  /**
   * Updates the 'languages' control when a language checkbox is clicked.
   */
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

  // Toggles the custom dropdown for languages
  toggleLanguageDropdown() {
    this.isLanguageDropdownOpen = !this.isLanguageDropdownOpen;
    if (this.isLanguageDropdownOpen) this.closeAllDropdownsExcept('language');
  }

  // Returns a readable string of selected languages for display
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

  // Closes all other open dropdowns to keep the UI clean
  private closeAllDropdownsExcept(except: string) {
    this.isLanguageDropdownOpen = except === 'language';
    this.isCategoryDropdownOpen = except === 'category';
    this.isVehicleClassDropdownOpen = except === 'vehicleClass';
    this.isFuelTypeDropdownOpen = except === 'fuelType';
    this.isTransmissionDropdownOpen = except === 'transmission';
    this.isCityDropdownOpen = except === 'city';
  }

  /**
   * Filters the list of cities as the user types in the location field.
   */
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

  /**
   * Sets the selected city into the form and closes the autocomplete.
   */
  selectCity(city: string) {
    this.vehicleForm.get('providerProfile.location')?.setValue(city);
    this.isCityDropdownOpen = false;
  }

  /**
   * Listens for clicks anywhere on the document to close dropdowns when clicking outside.
   */
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
    if (!isCityAutocompleteClick) {
      this.isCityDropdownOpen = false;
    }
  }

  /**
   * The main submission function. Validates everything before sending to the backend.
   */
  submitForm() {
    if (this.isSubmitting) return; // Prevent double submission
    this.submitted = true;
    
    // Step 1: Check basic form validation
    if (this.vehicleForm.invalid) {
      this.vehicleForm.markAllAsTouched();
      Swal.fire('Error', 'Please fill all required fields correctly.', 'error');
      return;
    }

    // Step 2: Check for file validation errors (size/type)
    const hasFileErrors = Object.values(this.fileErrors).some(err => err !== null);
    if (hasFileErrors) {
      Swal.fire('Invalid Files', 'Please fix the errors in your uploaded files.', 'error');
      return;
    }

    // Step 3: Ensure all required files are uploaded
    if (!this.exteriorPreview || !this.interiorPreview || !this.nicPreview || !this.licensePreview || !this.insurancePreview || !this.revenuePreview) {
      Swal.fire('Missing Documents', 'Please upload all required photos and verification documents.', 'warning');
      return;
    }

    // Step 4: Clean the data (remove extra spaces, lowercase emails)
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

    // Step 5: Build the final object to be sent to the API
    const formData: Vehicle = {
      ...cleanValue,
      providerId: 'p1', // In a real app, this would be the logged-in user ID
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

    // Step 6: Send request to server
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

  /**
   * Resets the form and previews to their original state.
   */
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
    // Clear image previews
    this.interiorPreview = null;
    this.exteriorPreview = null;
    this.nicPreview = null;
    this.licensePreview = null;
    this.insurancePreview = null;
    this.revenuePreview = null;
  }
}
