import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { VehicleService } from '../services/providerDashboard';
import { TransportBookingService } from '../services/transport-booking.service';
import { AuthService } from '../services/auth.service';
import { TransportVehicleService } from '../services/transport-vehicle.service';
import { Booking } from '../models/transport.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './provider-dashboard.html',
  styleUrls: ['./provider-dashboard.css']
})
export class ProviderDashboardComponent implements OnInit {
  
  stats: any = { totalVehicles: 0, totalBookings: 0, rating: 0, totalRevenue: 0, acceptedVehicles: 0, pendingVehicles: 0, pendingBookings: 0, acceptedBookings: 0, completedBookings: 0, rejectedBookings: 0, canceledBookings: 0 };
  vehicles: any[] = [];
  bookings: Booking[] = [];
  filteredVehicles: any[] = [];
  filteredBookings: Booking[] = [];
  currentBookingsInProgress: any[] = [];
  providerId: string | null = null;
  userName: string = '';

  // Filter properties
  vehicleSearchTerm: string = '';
  vehicleStatusFilter: string = '';
  bookingSearchTerm: string = '';
  bookingStatusFilter: string = '';
  bookingProximityFilter: string = '';
  showOldBookings: boolean = false;

  // Blocked Date Ranges properties
  showBlockedRangesModal: boolean = false;
  blockedRangesVehicle: any = null;
  blockedRangesStartDate: string = '';
  blockedRangesEndDate: string = '';
  blockedRangesReason: string = '';
  blockedRangesList: any[] = [];
  editingBlockedRange: any = null;

  constructor(
    private vehicleService: VehicleService,
    private transportVehicleService: TransportVehicleService,
    private bookingService: TransportBookingService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.providerId = this.authService.getUserEmail() || this.authService.getUserName();
    console.log('Active Provider Identifier resolved to:', this.providerId);
    if (!this.providerId) {
      console.error('Failed to extract provider identifier from authentication context.');
      Swal.fire({
        icon: 'error',
        title: 'Authentication Error',
        text: 'Failed to extract provider identifier. Please log in again.',
        confirmButtonColor: '#3085d6'
      });
      this.router.navigate(['/login']);
      return;
    }
    this.userName = this.authService.getUserName() || 'Provider';
    this.loadAll();
  }

  loadAll() {
    // Load stats
    this.vehicleService.getStats().subscribe(data => {
      this.stats = data;
    });

    // Load vehicles
    this.vehicleService.getVehicles().subscribe((data: any) => {
      if (Array.isArray(data)) {
        // Calculate accepted and pending counts
        this.stats.acceptedVehicles = data.filter((vehicle: any) => {
          const adminStatus = vehicle.adminVerificationStatus || vehicle.AdminVerificationStatus || '';
          return adminStatus === 'Approved' || adminStatus === 'Verified' || adminStatus !== 'Pending';
        }).length;

        this.stats.pendingVehicles = data.filter((vehicle: any) => {
          const adminStatus = vehicle.adminVerificationStatus || vehicle.AdminVerificationStatus || '';
          return adminStatus === 'Pending';
        }).length;

        const approvedFleetOnly = data.filter((vehicle: any) => {
          // checks the admin's verification status
          const adminStatus = vehicle.adminVerificationStatus || vehicle.AdminVerificationStatus || '';
          return adminStatus !== 'Pending';
        });

        this.vehicles = approvedFleetOnly.map((vehicle: any) => ({
          ...vehicle,
          id: vehicle.id || vehicle._id
        }));
        
        this.calculateProviderAverageRating();

        // Apply initial filter
        this.filterVehicles();
      } else {
        this.vehicles = [];
        this.filteredVehicles = [];
        this.stats.acceptedVehicles = 0;
        this.stats.pendingVehicles = 0;
      }
    });

    // Load bookings for this provider only
    if (this.providerId) {
      console.log('Sending providerId to API:', this.providerId);
     this.bookingService.getProviderBookings(this.providerId).subscribe((data: any[]) => {
    console.log('Raw API Response data received:', data);
    
    //Process each booking to dynamically pull vehicle data using vehicleId
    this.bookings = data.map((booking: any) => {
      //  Force fallbacks on fields that are empty or undefined in your C# model
      booking.vehicleName = booking.vehicleName || 'Loading vehicle details...';
      
      booking.statusChangedDate = booking.statusChangedDate || booking.StatusChangedDate || null;
      // Calculate durationText here so EVERY booking gets it instantly!
      if (booking.startDate && booking.endDate) {
        const sDate = new Date(booking.startDate);
        const eDate = new Date(booking.endDate);
        sDate.setHours(0, 0, 0, 0);
        eDate.setHours(0, 0, 0, 0);

        const diffTime = Math.abs(eDate.getTime() - sDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 captures partial checkout blocks
        booking.durationText = `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
      } else {
        booking.durationText = 'N/A';
      }

      //  Safely call your vehicle service to fetch the real name from MongoDB dynamically!
      if (booking.vehicleId) {
        this.transportVehicleService.getVehicleById(booking.vehicleId).subscribe({
          next: (vehicle: any) => {
            if (vehicle) {
              // Extract whatever naming field variation your vehicle schema uses
              booking.vehicleName = vehicle.ModelName || vehicle.modelName || vehicle.Name || 'Standard Car';
            }
          },
          error: () => {
            booking.vehicleName = 'Standard Vehicle'; // Fallback name on error
          }
        });
      } else {
        booking.vehicleName = 'Unassigned Vehicle';
      }

      return booking;
    });

    // Calculate booking status counts
    this.stats.totalBookings = this.bookings.length;
    this.stats.pendingBookings = this.bookings.filter((b: any) => b.status === 'Pending').length;
    this.stats.acceptedBookings = this.bookings.filter((b: any) => b.status === 'Confirmed').length;
    this.stats.completedBookings = this.bookings.filter((b: any) => b.status === 'Completed').length;
    this.stats.rejectedBookings = this.bookings.filter((b: any) => b.status === 'Rejected').length;
    this.stats.canceledBookings = this.bookings.filter((b: any) => b.status === 'Cancelled' || b.status === 'Canceled').length;

        // Find current booking in progress (Confirmed and within date range)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        this.currentBookingsInProgress = this.bookings.filter((booking: any) => {
          if (booking.status !== 'Confirmed' && booking.status !== 'On-going') return false;
          const startDate = new Date(booking.startDate);
          const endDate = new Date(booking.endDate);
          startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
          return today >= startDate && today <= endDate;
        }).map((booking: any) => {
      const startDate = new Date(booking.startDate);
      const endDate = new Date(booking.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      //  Calculate Day Count duration cleanly
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 captures partial checkout blocks
      booking.durationText = `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;

      // Assign conditional labels based on calendar deadlines
      if (today.getTime() === endDate.getTime()) {
        booking.displayStatus = 'Pending Return';
        booking.statusClass = 'badge-pending-return'; // Style handle for label component
      } else {
        booking.displayStatus = 'On-going';
        booking.statusClass = 'badge-ongoing';
      }

      return booking;
    });
        // Apply initial filter
        this.filterBookings();
      });
    }
  }

  calculateProviderAverageRating() {
    let totalRatingSum = 0;
    let totalReviewCount = 0;

    this.vehicles.forEach(vehicle => {
      
      const reviews = vehicle.Reviews || vehicle.reviews;
      
      if (Array.isArray(reviews) && reviews.length > 0) {
        reviews.forEach((r: any) => {
          if (r.rating || r.Rating) {
            totalRatingSum += (r.rating || r.Rating);
            totalReviewCount++;
          }
        });
      }
    });

    if (totalReviewCount > 0) {
      this.stats.rating = parseFloat((totalRatingSum / totalReviewCount).toFixed(1));
    } else {
      this.stats.rating = 0;
    }
    
    console.log(`Calculated Provider Average Rating: ${this.stats.rating} based on ${totalReviewCount} reviews.`);
  }

  // Filter vehicles based on search term and status
  filterVehicles() {
    this.filteredVehicles = this.vehicles.filter((vehicle: any) => {
      const searchTerm = this.vehicleSearchTerm.toLowerCase();
      const statusFilter = this.vehicleStatusFilter;
      
      // Filter by search term (model name, class, year)
      const matchesSearch = !searchTerm || 
        (vehicle.ModelName || vehicle.modelName || '').toLowerCase().includes(searchTerm) ||
        (vehicle.VehicleClass || vehicle.vehicleClass || '').toLowerCase().includes(searchTerm) ||
        (vehicle.YearOfManufacture || vehicle.yearOfManufacture || '').toString().includes(searchTerm);
      
      // Filter by checking the boolean
      const isAvailable = vehicle.isAvailableForBooking === true || vehicle.IsAvailableForBooking === true;
      const matchesStatus = !statusFilter || 
                            (statusFilter === 'Available' && isAvailable) || 
                            (statusFilter === 'Unavailable' && !isAvailable);
      
      return matchesSearch && matchesStatus;
    });
  }

  // Filter bookings based on search term and status
  filterBookings() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const prox = this.bookingProximityFilter;
    const isSorting = prox.startsWith('sort-');

    // Filter bookings arrays
    let result = this.bookings.filter((b: any) => {
      const matchesSearch = !this.bookingSearchTerm || 
        (b.userName || '').toLowerCase().includes(this.bookingSearchTerm.toLowerCase()) ||
        (b.vehicleName || '').toLowerCase().includes(this.bookingSearchTerm.toLowerCase());

      const realStatus = b.Status || b.status || '';
      const currentStatus = realStatus.toLowerCase(); 
      const filterStatusSelected = (this.bookingStatusFilter || '').toLowerCase();

      let matchesStatus = false;
      if (isSorting) {
        if (filterStatusSelected === 'canceled' || filterStatusSelected === 'cancelled') {
          matchesStatus = currentStatus === 'canceled' || currentStatus === 'cancelled';
        } else {
          const isAllowedStatus = currentStatus === 'confirmed' || currentStatus === 'pending';
          const matchesDropdown = !this.bookingStatusFilter || currentStatus === filterStatusSelected;
          matchesStatus = isAllowedStatus && matchesDropdown;
        }
      } else {
        // Standard behavior when sorting is turned off
        if (!this.bookingStatusFilter) {
          matchesStatus = true;
        } else if (filterStatusSelected === 'canceled' || filterStatusSelected === 'cancelled') {
          matchesStatus = currentStatus === 'canceled' || currentStatus === 'cancelled';
        } else {
          matchesStatus = currentStatus === filterStatusSelected;
        }
      }

      // Calculate proximity days
      let matchesProx = true;
      if (b.startDate && !isSorting && prox) {
        const diffDays = Math.ceil((new Date(b.startDate).setHours(0,0,0,0) - today.getTime()) / (1000 * 60 * 60 * 24));
        matchesProx = prox === 'near' ? (diffDays >= 0 && diffDays <= 3) : (diffDays > 7);
      }

      let matchesAge = true;
      const targetsForAgeCheck = ['completed', 'rejected', 'cancelled', 'canceled'];
      const realStatusDate = b.StatusChangedDate || b.statusChangedDate || null;
      
      if (!this.showOldBookings && realStatusDate && targetsForAgeCheck.includes(currentStatus)) {
        const changedDate = new Date(realStatusDate);
        
        // 30 days=1 month
        const diffTime = Math.abs(today.getTime() - changedDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 30) {
          matchesAge = false; // hide if old more than 1 month
        }
      }

      return matchesSearch && matchesStatus && matchesProx && matchesAge;
    });

    // Sort results if necessary
    if (isSorting) {
      result.sort((a: any, b: any) => {
        const diff = new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime();
        return prox === 'sort-near-to-far' ? diff : -diff;
      });
    }

    this.filteredBookings = result;
  }

  toggleAvailability(vehicle: any) {
    const targetId = vehicle.id || vehicle._id;
    
    // Determine the current boolean state and flip it
    const currentlyAvailable = vehicle.isAvailableForBooking === true || vehicle.IsAvailableForBooking === true;
    const nextStatus = !currentlyAvailable;

    // Optimistically update the property value in frontend memory so the toggle slides instantly
    vehicle.isAvailableForBooking = nextStatus;
    vehicle.IsAvailableForBooking = nextStatus;

    // Call your service to update MongoDB
    this.vehicleService.updateAvailability(targetId, nextStatus).subscribe({
      next: () => {
        console.log(`⚡ Availability successfully synchronized to: ${nextStatus}`);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `Vehicle is now ${nextStatus ? 'Live' : 'Hidden'}`,
          showConfirmButton: false,
          timer: 2000
        });
      },
      error: (err) => {
        console.error('Error saving checkbox state:', err);
        Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: 'Could not sync availability status to the server.'
        });
        this.loadAll(); // Revert back if database save fails
      }
    });
  }

  editVehicle(id: string) {
  if (!id) return;
  this.router.navigate(['/edit-vehicle', id]);
}

  deleteVehicle(id: string) {
    if (!id) return;

    // Beautiful Interactive Confirmation Dialog
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this asset deletion!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.transportVehicleService.deleteVehicle(id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'The vehicle asset has been removed.', 'success');
            this.loadAll();
          },
          error: (err) => {
            Swal.fire('Error', 'Failed to remove the asset.', 'error');
            console.error(err);
          }
        });
      }
    });
  }

  acceptBooking(booking: Booking) {
    if (!booking.id) return;
    this.bookingService.updateBookingStatus(booking.id, 'Confirmed').subscribe(() => {
      booking.status = 'Confirmed';
      booking.statusChangedDate = new Date().toISOString();
      Swal.fire('Confirmed!', 'The booking has been successfully accepted.', 'success');
      this.loadAll();
    });
  }

  completeBooking(booking: Booking) {
    if (!booking.id) return;
    this.bookingService.updateBookingStatus(booking.id, 'Completed').subscribe({
      next: () => {
        booking.status = 'Completed';
        booking.statusChangedDate = new Date().toISOString();
        Swal.fire('Completed!', 'Trip marked as completed.', 'success');
        this.loadAll();
      },
      error: (err) => Swal.fire('Error', 'Could not update booking status.', 'error')
    });
  }

  rejectBooking(booking: Booking) {
    if (!booking.id) return;
    
    //  Rejection Confirmation Dialog
    Swal.fire({
      title: 'Reject Booking Request?',
      text: 'Are you sure you want to turn down this reservation request?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, reject it'
    }).then((result) => {
      if (result.isConfirmed) {
        const bookingId: string = booking.id!;
        this.bookingService.updateBookingStatus(bookingId, 'Rejected').subscribe({
          next: () => {
            booking.status = 'Rejected';
            booking.statusChangedDate = new Date().toISOString();
            Swal.fire('Rejected', 'The booking request was turned down.', 'info');
            this.loadAll();
          },
          error: (err) => Swal.fire('Error', 'Failed to execute status transition.', 'error')
        });
      }
    });
  }

  viewBookingDetails(id: string | undefined) {
  const b = this.bookings.find(x => x.id === id);
  if (!b) return;

  const formattedStatusDate = b.statusChangedDate 
      ? new Date(b.statusChangedDate).toLocaleDateString() + ' ' + new Date(b.statusChangedDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      : 'Not Updated Yet';

  const s = b.startDate ? new Date(b.startDate).setHours(0,0,0,0) : 0;
  const e = b.endDate ? new Date(b.endDate).setHours(0,0,0,0) : 0;
  const days = (s && e) ? Math.ceil(Math.abs(e - s) / 86400000) + 1 : (b.days || 1);
  const nights = b.nights || (days > 1 ? days - 1 : 0);

  const pr = b.pricingSummary;
  const rate = pr?.dailyRate || 0;
  const rental = pr?.dailyRental || (rate * days);
  const nRate = pr?.nightlyRate || 0;
  const nightFee = pr?.driverNightOut || (nRate * nights);
  const total = b.totalAmount || (rental + nightFee);

  Swal.fire({
    title: 'Booking Request Details',
    width: '620px',
    confirmButtonText: 'Close',
    confirmButtonColor: '#0c92f4',
    html: `
      <div class="text-start fs-6 lh-base" style="font-family: sans-serif;">
        <h6 class="text-primary fw-bold mb-1">Customer Details</h6>
        <div class="bg-light p-2 rounded border mb-3">
          <p class="m-0"><strong>Name:</strong> ${b.userName || 'N/A'}</p>
          <p class="m-1 0"><strong>Phone:</strong> ${b.contactNumber || 'Not Provided'}</p>
          <p class="m-0"><strong>Status:</strong> <span class="badge bg-warning text-dark">${b.status}</span></p>
          <p class="m-0 mt-1"><small class="text-muted"><strong>Last Status Update:</strong> ${formattedStatusDate}</small></p>
        </div>

        <h6 class="text-primary fw-bold mb-1">Trip Itinerary</h6>
        <div class="bg-light p-2 rounded border mb-3">
          <p class="m-0"><strong>Vehicle:</strong> ${b.vehicleName || 'Standard Car'}</p>
          <p class="m-1 0"><strong>Travel Dates:</strong> ${new Date(b.startDate).toLocaleDateString()} to ${new Date(b.endDate).toLocaleDateString()} (${days} Days)</p>
          <p class="m-1 0"><strong>Pickup:</strong> ${b.pickupAddress || 'N/A'}</p>
          <p class="m-0"><strong>Destination:</strong> ${b.destinationAddress || b.pickupAddress || 'N/A'}</p>
        </div>

        <h6 class="text-primary fw-bold mb-1">Pricing Breakdown</h6>
        <table class="table table-sm table-bordered m-0 fs-6">
          <thead class="table-light">
            <tr><th>Item</th><th class="text-end">Amount</th></tr>
          </thead>
          <tbody>
            <tr><td>Daily Rental (LKR ${rate.toLocaleString()} x ${days} Days)</td><td class="text-end">LKR ${rental.toLocaleString()}</td></tr>
            <tr><td>Driver Night Fee (LKR ${nRate.toLocaleString()} x ${nights} Nights)</td><td class="text-end">LKR ${nightFee.toLocaleString()}</td></tr>
            <tr class="table-primary fw-bold text-primary"><td>Total Earnings (Estimated)</td><td class="text-end fs-5">LKR ${total.toLocaleString()}</td></tr>
          </tbody>
        </table>
        <small class="text-muted d-block mt-2"><i>* Extra KM charges are collected separately based on usage.</i></small>
      </div>
    `
  });
  }

  // Blocked Date Ranges Methods
  openBlockedRangesModal(vehicle: any) {
    this.blockedRangesVehicle = vehicle;
    this.blockedRangesStartDate = '';
    this.blockedRangesEndDate = '';
    this.blockedRangesReason = '';
    this.blockedRangesList = [];
    this.editingBlockedRange = null;
    this.showBlockedRangesModal = true;
    this.loadBlockedRanges(vehicle.id || vehicle._id);
  }

  closeBlockedRangesModal() {
    this.showBlockedRangesModal = false;
    this.blockedRangesVehicle = null;
    this.editingBlockedRange = null;
  }

  loadBlockedRanges(vehicleId: string) {
    this.vehicleService.getBlockedDateRanges(vehicleId).subscribe({
      next: (ranges) => {
        this.blockedRangesList = ranges || [];
      },
      error: (err) => {
        console.error('Error loading blocked ranges:', err);
        this.blockedRangesList = [];
      }
    });
  }

  addBlockedRange() {
    if (!this.blockedRangesVehicle || !this.blockedRangesStartDate || !this.blockedRangesEndDate) {
      Swal.fire('Error', 'Please select both start and end dates', 'error');
      return;
    }

    const vehicleId = this.blockedRangesVehicle.id || this.blockedRangesVehicle._id;
    
    if (this.editingBlockedRange) {
      // Update existing range
      this.vehicleService.editBlockedDateRange(vehicleId, this.editingBlockedRange.id, this.blockedRangesStartDate, this.blockedRangesEndDate, this.blockedRangesReason).subscribe({
        next: () => {
          Swal.fire('Success', 'Blocked date range updated successfully', 'success');
          this.blockedRangesStartDate = '';
          this.blockedRangesEndDate = '';
          this.blockedRangesReason = '';
          this.editingBlockedRange = null;
          this.loadBlockedRanges(vehicleId);
        },
        error: (err) => {
          console.error('Error editing blocked range:', err);
          const errorMessage = err.error?.message || 'Failed to update blocked date range';
          Swal.fire('Error!', errorMessage, 'error');
        }
      });
    } else {
      // Add new range
      console.log('Adding blocked range for vehicle:', vehicleId);
      console.log('Start date:', this.blockedRangesStartDate);
      console.log('End date:', this.blockedRangesEndDate);
      console.log('Reason:', this.blockedRangesReason);
      
      this.vehicleService.addBlockedDateRange(vehicleId, this.blockedRangesStartDate, this.blockedRangesEndDate, this.blockedRangesReason).subscribe({
        next: () => {
          Swal.fire('Success', 'Blocked date range added successfully', 'success');
          this.blockedRangesStartDate = '';
          this.blockedRangesEndDate = '';
          this.blockedRangesReason = '';
          this.loadBlockedRanges(vehicleId);
        },
        error: (err) => {
          console.error('Error adding blocked range:', err);
          const errorMessage = err.error?.message || 'Failed to add blocked date range';
          Swal.fire('Error!', errorMessage, 'error');
        }
      });
    }
  }

  editBlockedRange(range: any) {
    this.editingBlockedRange = range;
    this.blockedRangesStartDate = range.startDate;
    this.blockedRangesEndDate = range.endDate;
    this.blockedRangesReason = range.reason || '';
  }

  cancelEditBlockedRange() {
    this.editingBlockedRange = null;
    this.blockedRangesStartDate = '';
    this.blockedRangesEndDate = '';
    this.blockedRangesReason = '';
  }

  showVehicleDetails(vehicle: any) {
    // Use pre-calculated rating from backend if available, otherwise calculate from reviews
    let ratingDisplay = 'No ratings yet';
    
    // Check for pre-calculated rating fields from backend
    const backendRating = vehicle.averageRating || vehicle.AverageRating || vehicle.rating || vehicle.Rating;
    
    if (typeof backendRating === 'number' && backendRating > 0) {
      // Backend provides pre-calculated rating
      const reviewCount = vehicle.reviewCount || vehicle.ReviewCount || vehicle.reviews?.length || vehicle.Reviews?.length || 0;
      ratingDisplay = `${backendRating.toFixed(1)} / 5.0 ⭐${reviewCount > 0 ? ` (${reviewCount} review${reviewCount > 1 ? 's' : ''})` : ''}`;
    } else {
      // Fallback: calculate from reviews array
      const reviews = vehicle.reviews || vehicle.Reviews || [];
      if (reviews.length > 0) {
        const totalRating = reviews.reduce((sum: number, review: any) => sum + (review.rating || 0), 0);
        const averageRating = totalRating / reviews.length;
        ratingDisplay = `${averageRating.toFixed(1)} / 5.0 ⭐ (${reviews.length} review${reviews.length > 1 ? 's' : ''})`;
      }
    }
    
    Swal.fire({
      title: vehicle.ModelName || vehicle.modelName || 'Vehicle Details',
      width: '620px',
      confirmButtonText: 'Close',
      confirmButtonColor: '#0c92f4',
      html: `
        <div class="text-start fs-6 lh-base" style="font-family: sans-serif;">
          <h6 class="text-primary fw-bold mb-1">Basic Information</h6>
          <div class="bg-light p-2 rounded border mb-3">
            <p class="m-0"><strong>Model:</strong> ${vehicle.ModelName || vehicle.modelName || 'N/A'}</p>
            <p class="m-0"><strong>Class:</strong> ${vehicle.VehicleClass || vehicle.vehicleClass || 'N/A'}</p>
            <p class="m-0"><strong>Year:</strong> ${vehicle.YearOfManufacture || vehicle.yearOfManufacture || 'N/A'}</p>
            <p class="m-0"><strong>Registration:</strong> ${vehicle.RegistrationNumber || vehicle.registrationNumber || 'N/A'}</p>
          </div>

          <h6 class="text-primary fw-bold mb-1">Specifications</h6>
          <div class="bg-light p-2 rounded border mb-3">
            <p class="m-0"><strong>Capacity:</strong> ${vehicle.HighestCapacity || vehicle.highestCapacity || vehicle.SeatCount || vehicle.seatCount || 'N/A'} Seats</p>
            <p class="m-0"><strong>Fuel Type:</strong> ${vehicle.FuelType || vehicle.fuelType || 'N/A'}</p>
            <p class="m-0"><strong>Transmission:</strong> ${vehicle.Transmission || vehicle.transmission || 'N/A'}</p>
            <p class="m-0"><strong>Air Conditioning:</strong> ${vehicle.HasAC || vehicle.hasAC || vehicle.isAc ? 'Yes' : 'No'}</p>
          </div>

          <h6 class="text-primary fw-bold mb-1">Pricing & Rating</h6>
          <div class="bg-light p-2 rounded border mb-3">
            <p class="m-0"><strong>Daily Rate:</strong> LKR ${vehicle.StandardDailyRate || vehicle.standardDailyRate || 'N/A'}</p>
            <p class="m-0"><strong>Rating:</strong> ${ratingDisplay}</p>
          </div>
        </div>
      `
    });
  }

  showBookingStatusDetails() {
    const rejectedCount = this.stats.rejectedBookings || 0;
    const canceledCount = this.stats.canceledBookings || 0;
    
    Swal.fire({
      title: 'Booking Status Breakdown',
      width: '500px',
      confirmButtonText: 'Close',
      confirmButtonColor: '#0c92f4',
      html: `
        <div class="text-start fs-6 lh-base" style="font-family: sans-serif;">
          <h6 class="text-primary fw-bold mb-1">Other Bookings</h6>
          <div class="bg-light p-2 rounded border mb-3">
            <p class="m-0"><strong>❌ Rejected:</strong> <span class="badge bg-danger text-white">${rejectedCount}</span></p>
            <p class="m-0"><strong>🚫 Canceled:</strong> <span class="badge bg-secondary text-white">${canceledCount}</span></p>
            <p class="m-0 mt-2"><strong>Total:</strong> <span class="badge bg-dark text-white">${rejectedCount + canceledCount}</span></p>
          </div>
          <p class="m-0 text-muted small">These bookings were either rejected by you or canceled by customers.</p>
        </div>
      `
    });
  }

  deleteBlockedRange(range: any) {
    Swal.fire({
      title: 'Are you sure?',
      text: "Do you want to delete this blocked date range?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it'
    }).then((result) => {
      if (result.isConfirmed) {
        const vehicleId = this.blockedRangesVehicle.id || this.blockedRangesVehicle._id;
        this.vehicleService.deleteBlockedDateRange(vehicleId, range.id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'Blocked date range has been deleted.', 'success');
            this.loadBlockedRanges(vehicleId);
          },
          error: (err) => {
            console.error('Error deleting blocked range:', err);
            Swal.fire('Error!', 'Failed to delete blocked date range', 'error');
          }
        });
      }
    });
  }
}
