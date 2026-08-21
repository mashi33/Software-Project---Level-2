import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
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
  
  stats: any = { totalVehicles: 0, totalBookings: 0, rating: 0, totalRevenue: 0, acceptedVehicles: 0, pendingVehicles: 0, pendingBookings: 0, acceptedBookings: 0, completedBookings: 0, rejectedBookings: 0, canceledBookings: 0, pendingComplete: 0 };
  vehicles: any[] = [];
  bookings: Booking[] = [];
  filteredVehicles: any[] = [];
  filteredBookings: Booking[] = [];
  currentBookingsInProgress: any[] = [];
  pendingCompleteBookings: any[] = [];
  providerId: string | null = null;
  userName: string = '';
  targetBookingId: string | null = null;

  // Filter properties
  vehicleSearchTerm: string = '';
  vehicleStatusFilter: string = '';
  bookingSearchTerm: string = '';
  bookingStatusFilter: string = '';
  bookingProximityFilter: string = '';
  showOldBookings: boolean = false;

  // Panel navigation
  activePanel: 'fleet' | 'bookings' = 'fleet';

  // Blocked Date Ranges properties
  showBlockedRangesModal: boolean = false;
  blockedRangesVehicle: any = null;
  blockedRangesStartDate: string = '';
  blockedRangesEndDate: string = '';
  blockedRangesReason: string = '';
  blockedRangesList: any[] = [];
  editingBlockedRange: any = null;
  todayDate: string = '';

  // Cancel Booking Modal properties
  showCancelBookingModal: boolean = false;
  cancelBookingData: any = null;
  cancelReason: string = '';
  cancelBlockStartDate: string = '';
  cancelBlockEndDate: string = '';
  cancelWarningHtml: string = '';
  cancelStep: 'reason' | 'dates' = 'reason';

  private providerCancelledIds = new Set<string>();
  private tempCancelReason: string = '';

  constructor(
    private vehicleService: VehicleService,
    private transportVehicleService: TransportVehicleService,
    private bookingService: TransportBookingService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  switchPanel(panel: 'fleet' | 'bookings') {
    this.activePanel = panel;
  }

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
    const today = new Date();
    this.todayDate = today.toISOString().split('T')[0]; // yyyy-MM-dd
    this.loadAll();

    this.route.queryParams.subscribe(params => {
      if (params['panel'] === 'bookings') {
        this.activePanel = 'bookings';
      }
      if (params['bookingId']) {
        this.activePanel = 'bookings';
        this.targetBookingId = params['bookingId'];
        // Clear filter terms so the requested booking is visible
        this.bookingSearchTerm = '';
        this.bookingStatusFilter = '';
        this.bookingProximityFilter = '';
        this.showOldBookings = true;

        this.filterBookings();

        // Case B: If bookings are already loaded, scroll and clear query params immediately
        if (this.bookings && this.bookings.length > 0) {
          setTimeout(() => {
            const element = document.querySelector(`.booking-highlighted`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              element.classList.add('pulse-highlight');
              setTimeout(() => {
                element.classList.remove('pulse-highlight');
              }, 3000);
            }
            this.router.navigate([], {
              relativeTo: this.route,
              queryParams: { bookingId: null },
              queryParamsHandling: 'merge',
              replaceUrl: true
            });
          }, 300);
        }
      }
    });
  }

    loadAll() {
    // ONE single API call – loads stats + vehicles + bookings with vehicle names already filled
    this.vehicleService.getFullDashboard().subscribe({
      next: (data: any) => {
        // STATS 
        this.stats = data.stats || { totalVehicles: 0, totalBookings: 0 };

        // VEHICLES
        const vehiclesData = data.vehicles || [];
        if (Array.isArray(vehiclesData)) {
          this.stats.acceptedVehicles = vehiclesData.filter((vehicle: any) => {
            const adminStatus = vehicle.adminVerificationStatus || vehicle.AdminVerificationStatus || '';
            return adminStatus === 'Approved' || adminStatus === 'Verified' || adminStatus !== 'Pending';
          }).length;

          this.stats.pendingVehicles = vehiclesData.filter((vehicle: any) => {
            const adminStatus = vehicle.adminVerificationStatus || vehicle.AdminVerificationStatus || '';
            return adminStatus === 'Pending';
          }).length;

          this.vehicles = vehiclesData.map((vehicle: any) => ({
            ...vehicle,
            id: vehicle.id || vehicle._id
          }));
          
          this.calculateProviderAverageRating();
          this.filterVehicles();
        } else {
          this.vehicles = [];
          this.filteredVehicles = [];
          this.stats.acceptedVehicles = 0;
          this.stats.pendingVehicles = 0;
        }

        //  BOOKINGS (vehicleName already populated by backend) 
        const bookingsData = data.bookings || [];
        this.bookings = bookingsData.map((booking: any) => {
          booking.vehicleName = booking.vehicleName || booking.VehicleName || 'Standard Vehicle';
          booking.statusChangedDate = booking.statusChangedDate || booking.StatusChangedDate || null;

          // Calculate durationText
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

          return booking;
        });

        // Calculate booking status counts
        this.stats.totalBookings = this.bookings.length;
        this.stats.pendingBookings = this.bookings.filter((b: any) => b.status === 'Pending').length;
        this.stats.acceptedBookings = this.bookings.filter((b: any) => b.status === 'Confirmed').length;
        this.stats.completedBookings = this.bookings.filter((b: any) => b.status === 'Completed').length;
        this.stats.rejectedBookings = this.bookings.filter((b: any) => b.status === 'Rejected').length;
        this.stats.canceledBookings = this.bookings.filter((b: any) => b.status === 'Cancelled' || b.status === 'Canceled').length;

        // Pending complete
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        this.pendingCompleteBookings = this.bookings.filter((booking: any) => {
          if (booking.status !== 'Confirmed' && booking.status !== 'On-going') return false;
          const endDate = new Date(booking.endDate);
          endDate.setHours(0, 0, 0, 0);
          return today > endDate;
        });
        this.stats.pendingComplete = this.pendingCompleteBookings.length;

        // Current bookings in progress
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

          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          booking.durationText = `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;

          if (today.getTime() === endDate.getTime()) {
            booking.displayStatus = 'Pending Return';
            booking.statusClass = 'badge-pending-return';
          } else {
            booking.displayStatus = 'On-going';
            booking.statusClass = 'badge-ongoing';
          }

          return booking;
        });

        this.filterBookings();

        // Scroll to target booking if needed
        if (this.targetBookingId) {
          setTimeout(() => {
            const element = document.querySelector(`.booking-highlighted`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              element.classList.add('pulse-highlight');
              setTimeout(() => {
                element.classList.remove('pulse-highlight');
              }, 3000);
            }
            this.router.navigate([], {
              relativeTo: this.route,
              queryParams: { bookingId: null },
              queryParamsHandling: 'merge',
              replaceUrl: true
            });
          }, 400);
        }
      },
      error: (err: any) => {
        console.error('Failed to load dashboard data:', err);
        Swal.fire({
          icon: 'error',
          title: 'Load Error',
          text: 'Could not load dashboard data. Please try again.'
        });
      }
    });
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

    const status = (b.status || (b as any).Status || '').toString();
    const isCancelled = status.toLowerCase() === 'cancelled' || status.toLowerCase() === 'canceled';

    // Who cancelled?
    const cancelledByRaw = (
      (b as any).cancelledBy ||
      (b as any).CancelledBy ||
      (b as any).cancellationSource ||
      (b as any).CancellationSource ||
      ''
    ).toString().toLowerCase();

    //  also checks the current session
    const cancelledByProvider = isCancelled && (
      this.providerCancelledIds.has(b.id!) ||          // provider cancelled in this session
      cancelledByRaw === 'provider' ||
      cancelledByRaw === 'you' ||
      cancelledByRaw === 'owner' ||
      (b as any).cancelledByProvider === true
    );

    const formattedStatusDate = b.statusChangedDate
      ? new Date(b.statusChangedDate).toLocaleDateString() + ' ' +
        new Date(b.statusChangedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'Not Updated Yet';

    const s = b.startDate ? new Date(b.startDate).setHours(0, 0, 0, 0) : 0;
    const e = b.endDate ? new Date(b.endDate).setHours(0, 0, 0, 0) : 0;
    const days = (s && e) ? Math.ceil(Math.abs(e - s) / 86400000) + 1 : ((b as any).days || 1);
    const nights = (b as any).nights || (days > 1 ? days - 1 : 0);

    const pr = (b as any).pricingSummary;
    const rate = pr?.dailyRate || 0;
    const rental = pr?.dailyRental || (rate * days);
    const nRate = pr?.nightlyRate || 0;
    const nightFee = pr?.driverNightOut || (nRate * nights);
    const total = b.totalAmount || (rental + nightFee);

    // Status badge text
    let statusDisplay = status;
    let statusBadgeClass = 'bg-warning';

    if (isCancelled) {
      statusDisplay = cancelledByProvider ? 'Cancelled by You' : 'Cancelled by Traveller';
      statusBadgeClass = 'bg-danger';
    } else if (status === 'Confirmed') {
      statusBadgeClass = 'bg-success';
    } else if (status === 'Completed') {
      statusBadgeClass = 'bg-primary';
    } else if (status === 'Rejected') {
      statusBadgeClass = 'bg-danger';
    }

    // Optional notice for cancelled bookings
    const cancelledNotice = isCancelled
      ? `
        <div class="premium-cancelled-notice ${cancelledByProvider ? 'cancelled-by-provider' : 'cancelled-by-traveller'}">
          <div class="notice-badge">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
              <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
            </svg>
          </div>
          <div class="notice-text">
            <div class="notice-title">${cancelledByProvider ? 'Cancelled by You' : 'Cancelled by Traveller'}</div>
            ${formattedStatusDate !== 'Not Updated Yet' ? `<div class="notice-subtitle">On ${formattedStatusDate}</div>` : ''}
          </div>
        </div>
      `
      : '';

    Swal.fire({
      title: 'Booking Request Details',
      width: '480px',
      confirmButtonText: 'Close',
      confirmButtonColor: '#3b82f6',
      customClass: {
        popup: 'swal2-custom-popup',
        title: 'swal2-custom-title',
        htmlContainer: 'swal2-custom-html',
        confirmButton: 'swal2-confirm'
      },
      html: `
        <div class="premium-details-container">
          ${cancelledNotice}

          <!-- Customer Details -->
          <div class="premium-section">
            <div class="premium-section-title">
              <div class="section-icon customer-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              Customer Details
            </div>
            <div class="premium-list">
              <div class="list-item">
                <span class="list-label">Name</span>
                <span class="list-value">${b.userName || 'N/A'}</span>
              </div>
              <div class="list-item">
                <span class="list-label">Phone</span>
                <span class="list-value">${(b as any).contactNumber || 'Not Provided'}</span>
              </div>
              <div class="list-item">
                <span class="list-label">Status</span>
                <span class="list-value">
                  <span class="premium-status-badge ${statusBadgeClass}">${statusDisplay}</span>
                </span>
              </div>
              <div class="list-item">
                <span class="list-label">Last Update</span>
                <span class="list-value">${formattedStatusDate}</span>
              </div>
            </div>
          </div>

          <!-- Trip Itinerary -->
          <div class="premium-section">
            <div class="premium-section-title">
              <div class="section-icon itinerary-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                </svg>
              </div>
              Trip Itinerary
            </div>
            <div class="premium-list">
              <div class="list-item">
                <span class="list-label">Vehicle</span>
                <span class="list-value">${b.vehicleName || 'Standard Car'}</span>
              </div>
              <div class="list-item">
                <span class="list-label">Travel Dates</span>
                <span class="list-value">${new Date(b.startDate).toLocaleDateString()} → ${new Date(b.endDate).toLocaleDateString()} (${days} Days)</span>
              </div>
              <div class="list-item">
                <span class="list-label">Pickup</span>
                <span class="list-value">${(b as any).pickupAddress || 'N/A'}</span>
              </div>
              <div class="list-item">
                <span class="list-label">Destination</span>
                <span class="list-value">${(b as any).destinationAddress || (b as any).pickupAddress || 'N/A'}</span>
              </div>
            </div>
          </div>

          <!-- Pricing Breakdown -->
          <div class="premium-section">
            <div class="premium-section-title">
              <div class="section-icon pricing-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              Pricing Breakdown
            </div>
            <div class="premium-list">
              <div class="list-item">
                <span class="list-label">Daily Rental</span>
                <span class="list-value">LKR ${rate.toLocaleString()} × ${days} Days = LKR ${rental.toLocaleString()}</span>
              </div>
              <div class="list-item">
                <span class="list-label">Driver Night Fee</span>
                <span class="list-value">LKR ${nRate.toLocaleString()} × ${nights} Nights = LKR ${nightFee.toLocaleString()}</span>
              </div>
              <div class="list-item total-item">
                <span class="list-label">Total Earnings</span>
                <span class="list-value">LKR ${total.toLocaleString()}</span>
              </div>
            </div>
            <div class="premium-pricing-note">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Extra KM charges are collected separately based on usage.
            </div>
          </div>
        </div>
      `
    });
  }

  // Blocked Date Ranges Methods

  onBlockedStartDateChange() {
    if (this.blockedRangesStartDate && this.blockedRangesEndDate) {
      if (this.blockedRangesEndDate < this.blockedRangesStartDate) {
        this.blockedRangesEndDate = this.blockedRangesStartDate;
      }
    }
  }

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
      this.vehicleService.editBlockedDateRange(
  vehicleId,
  this.editingBlockedRange.id,
  this.blockedRangesStartDate,
  this.blockedRangesEndDate,
  this.blockedRangesReason
).subscribe({
  next: () => {
    const index = this.blockedRangesList.findIndex(
      r => r.id === this.editingBlockedRange.id
    );
    if (index !== -1) {
      this.blockedRangesList[index] = {
        ...this.blockedRangesList[index],
        startDate: this.blockedRangesStartDate,
        endDate: this.blockedRangesEndDate,
        reason: this.blockedRangesReason
      };
    }

    Swal.fire('Success', 'Blocked date range updated successfully', 'success');
    this.blockedRangesStartDate = '';
    this.blockedRangesEndDate = '';
    this.blockedRangesReason = '';
    this.editingBlockedRange = null;
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
      
      this.vehicleService.addBlockedDateRange(
  vehicleId,
  this.blockedRangesStartDate,
  this.blockedRangesEndDate,
  this.blockedRangesReason
).subscribe({
  next: (res: any) => {
    this.blockedRangesList = [
      ...this.blockedRangesList,
      {
        id: res.id,   
        startDate: this.blockedRangesStartDate,
        endDate: this.blockedRangesEndDate,
        reason: this.blockedRangesReason || ''
      }
    ];

    Swal.fire('Success', 'Blocked date range added successfully', 'success');
    this.blockedRangesStartDate = '';
    this.blockedRangesEndDate = '';
    this.blockedRangesReason = '';
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
      width: '460px',
      confirmButtonText: 'Close',
      confirmButtonColor: '#3b82f6',
      customClass: {
        popup: 'swal2-custom-popup',
        title: 'swal2-custom-title',
        htmlContainer: 'swal2-custom-html',
        confirmButton: 'swal2-confirm'
      },
      html: `
        <div class="premium-details-container">

          <!-- Basic Information -->
          <div class="premium-section">
            <div class="premium-section-title">
              <div class="section-icon basic-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              Basic Information
            </div>
            <div class="premium-list">
              <div class="list-item">
                <span class="list-label">Model</span>
                <span class="list-value">${vehicle.ModelName || vehicle.modelName || 'N/A'}</span>
              </div>
              <div class="list-item">
                <span class="list-label">Class</span>
                <span class="list-value">${vehicle.VehicleClass || vehicle.vehicleClass || 'N/A'}</span>
              </div>
              <div class="list-item">
                <span class="list-label">Year</span>
                <span class="list-value">${vehicle.YearOfManufacture || vehicle.yearOfManufacture || 'N/A'}</span>
              </div>
              <div class="list-item">
                <span class="list-label">Registration</span>
                <span class="list-value">${vehicle.RegistrationNumber || vehicle.registrationNumber || 'N/A'}</span>
              </div>
            </div>
          </div>

          <!-- Specifications -->
          <div class="premium-section">
            <div class="premium-section-title">
              <div class="section-icon spec-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              Specifications
            </div>
            <div class="premium-list">
              <div class="list-item">
                <span class="list-label">Capacity</span>
                <span class="list-value">${vehicle.HighestCapacity || vehicle.highestCapacity || vehicle.SeatCount || vehicle.seatCount || 'N/A'} Seats</span>
              </div>
              <div class="list-item">
                <span class="list-label">Fuel Type</span>
                <span class="list-value">${vehicle.FuelType || vehicle.fuelType || 'N/A'}</span>
              </div>
              <div class="list-item">
                <span class="list-label">Transmission</span>
                <span class="list-value">${vehicle.Transmission || vehicle.transmission || 'N/A'}</span>
              </div>
              <div class="list-item">
                <span class="list-label">Air Conditioning</span>
                <span class="list-value">${vehicle.HasAC || vehicle.hasAC || vehicle.isAc ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          <!-- Pricing & Rating -->
          <div class="premium-section">
            <div class="premium-section-title">
              <div class="section-icon pricing-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              Pricing & Rating
            </div>
            <div class="premium-list">
              <div class="list-item">
                <span class="list-label">Daily Rate</span>
                <span class="list-value">LKR ${vehicle.StandardDailyRate || vehicle.standardDailyRate || 'N/A'}</span>
              </div>
              <div class="list-item">
                <span class="list-label">Rating</span>
                <span class="list-value">${ratingDisplay}</span>
              </div>
            </div>
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
      width: '450px',
      confirmButtonText: 'Close',
      confirmButtonColor: '#0c92f4',
      html: `
        <div class="text-start" style="font-family: sans-serif;">
          <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
              <span style="font-size: 14px; color: #495057; font-weight: 500;">❌Rejected</span>
              <span style="font-size: 16px; color: #212529; font-weight: 700;">${rejectedCount}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
              <span style="font-size: 14px; color: #495057; font-weight: 500;">🚫Canceled</span>
              <span style="font-size: 16px; color: #212529; font-weight: 700;">${canceledCount}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0 0 0;">
              <span style="font-size: 14px; color: #212529; font-weight: 600;">Total</span>
              <span style="font-size: 18px; color: #212529; font-weight: 700;">${rejectedCount + canceledCount}</span>
            </div>
          </div>
          <p style="font-size: 12px; color: #6c757d; margin: 0; line-height: 1.5;">
            These bookings were either rejected by you or canceled by customers.
          </p>
        </div>
      `
    });
  }

  isCancellationBlockedRange(range: any): boolean {
  if (!range || !range.reason) return false;
  const reason = (range.reason || '').toString().toLowerCase();
  return reason.startsWith('cancelled booking');
}

    /* Cancel button only visible when status is Confirmed AND the trip has not started yet */
  canCancelBooking(booking: any): boolean {
    if (!booking || (booking.status !== 'Confirmed' && booking.Status !== 'Confirmed')) {
      return false;
    }
    if (!booking.startDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(booking.startDate);
    start.setHours(0, 0, 0, 0);

    // Trip has already started (or starts today) → hide Cancel
    return today < start;
  }

  cancelBooking(booking: Booking) {
    if (!booking.id || !this.canCancelBooking(booking)) return;

    const now = new Date();
    const startDate = new Date(booking.startDate);
    startDate.setHours(0, 0, 0, 0);
    const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isShortNotice = hoursUntilStart <= 24;

    // Count short-notice cancellations this month
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const shortNoticeCancelsThisMonth = this.bookings.filter((b: any) => {
      const status = (b.status || b.Status || '').toLowerCase();
      if (status !== 'cancelled' && status !== 'canceled') return false;

      const changed = b.statusChangedDate || b.StatusChangedDate;
      if (!changed) return false;

      const changedDate = new Date(changed);
      if (changedDate.getMonth() !== currentMonth || changedDate.getFullYear() !== currentYear) {
        return false;
      }

      const bStart = new Date(b.startDate);
      bStart.setHours(0, 0, 0, 0);
      const hoursDiff = (bStart.getTime() - changedDate.getTime()) / (1000 * 60 * 60);
      return hoursDiff <= 24 && hoursDiff >= -12;
    }).length;

    let warningHtml = '';
if (isShortNotice) {
  warningHtml = `
    <div class="warning-box short-notice">
      <div class="title">Short-notice cancellation</div>
      <div class="text">
        This booking starts within 24 hours. Cancelling now will significantly inconvenience the customer.
      </div>
    </div>`;

  if (shortNoticeCancelsThisMonth >= 3) {
    warningHtml += `
      <div class="warning-box limit-reached">
        <div class="title">Monthly limit reached</div>
        <div class="text">
          You have already made <strong>${shortNoticeCancelsThisMonth}</strong> short-notice cancellation(s) this month.
          Further short-notice cancellations may result in temporary restrictions or forced blocked date ranges.
        </div>
      </div>`;
  } else if (shortNoticeCancelsThisMonth === 2) {
    warningHtml += `
      <div class="warning-box short-notice">
        <div class="text">
          This will be your <strong>3rd</strong> short-notice cancellation this month.
          Exceeding 3 may lead to temporary account restrictions.
        </div>
      </div>`;
  } else {
    warningHtml += `
      <div class="warning-box warning-info">
        <div class="text">
          Short-notice cancellations this month: <strong>${shortNoticeCancelsThisMonth}</strong> / 3 allowed
        </div>
      </div>`;
  }
}

    // Initialize cancel booking modal
    this.cancelBookingData = booking;
    this.cancelReason = this.tempCancelReason || '';
    this.cancelBlockStartDate = new Date(booking.startDate).toISOString().split('T')[0];
    this.cancelBlockEndDate = new Date(booking.endDate).toISOString().split('T')[0];
    this.cancelWarningHtml = warningHtml;
    this.cancelStep = 'reason';
    this.showCancelBookingModal = true;
  }

  closeCancelBookingModal() {
    this.showCancelBookingModal = false;
    this.cancelBookingData = null;
    this.cancelReason = '';
    this.cancelBlockStartDate = '';
    this.cancelBlockEndDate = '';
    this.cancelWarningHtml = '';
    this.cancelStep = 'reason';
  }

  onCancelReasonNext() {
    if (!this.cancelReason || !this.cancelReason.trim()) {
      Swal.fire('Error', 'Please provide a reason for cancellation', 'error');
      return;
    }
    this.cancelStep = 'dates';
  }

  onCancelDatesBack() {
    this.cancelStep = 'reason';
  }

  onCancelDatesConfirm() {
    if (!this.cancelBookingData) return;

    const booking = this.cancelBookingData;
    const cancelReason = this.cancelReason.trim();
    const blockStart = this.cancelBlockStartDate;
    const blockEnd = this.cancelBlockEndDate;

    // Validate dates
    const defaultStart = new Date(booking.startDate).toISOString().split('T')[0];
    const defaultEnd = new Date(booking.endDate).toISOString().split('T')[0];

    if (!blockStart || !blockEnd) {
      Swal.fire('Error', 'Both start and end dates are required', 'error');
      return;
    }
    if (blockEnd < blockStart) {
      Swal.fire('Error', 'End date must be on or after the start date', 'error');
      return;
    }
    if (blockStart < defaultStart || blockEnd > defaultEnd) {
      Swal.fire('Error', 'Dates must be within the original booking period', 'error');
      return;
    }

    // Close modal and proceed with cancellation
    this.closeCancelBookingModal();
    this.tempCancelReason = cancelReason;

    // Cancel the booking  
    this.bookingService.updateBookingStatus(booking.id!, 'Cancelled', 'Provider').subscribe({
      next: () => {
       booking.status = 'Cancelled';
       booking.statusChangedDate = new Date().toISOString();
       (booking as any).CancelledBy = 'Provider';   
       this.providerCancelledIds.add(booking.id!);
       this.tempCancelReason = '';

        // Add blocked range
        const vehicleId = (booking as any).vehicleId || (booking as any).VehicleId;
        if (!vehicleId) {
          Swal.fire({
            icon: 'warning',
            title: 'Booking Cancelled',
            text: 'The booking was cancelled, but the vehicle could not be identified. Please block the dates manually from Fleet Management.',
            confirmButtonColor: '#0c92f4'
          });
          this.loadAll();
          return;
        }

        const blockReason = cancelReason
          ? `Cancelled booking: ${cancelReason}`
          : 'Cancelled booking – provider unavailable';

        this.vehicleService.addBlockedDateRange(vehicleId, blockStart, blockEnd, blockReason).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Booking Cancelled',
              width: '480px',
              confirmButtonText: 'Done',
              confirmButtonColor: '#0c92f4',
              html: `
                <div class="text-start fs-6 lh-base" style="font-family: sans-serif;">
                  <p class="mb-2">The booking has been successfully cancelled.</p>
                  <div class="bg-light p-2 rounded border">
                    <p class="m-0"><strong>Vehicle blocked</strong></p>
                    <p class="m-0">Unavailable from <strong>${blockStart}</strong> to <strong>${blockEnd}</strong>.</p>
                    <p class="m-0 text-muted">All other dates remain available.</p>
                  </div>
                </div>
              `
            });
            this.loadAll();
          },
          error: (err) => {
            console.error('Failed to add blocked range:', err);
            const msg = err.error?.message || 'Booking was cancelled, but the dates could not be blocked automatically. You can still block them manually.';
            Swal.fire({
              icon: 'warning',
              title: 'Partial Success',
              text: msg,
              confirmButtonColor: '#0c92f4'
            });
            this.loadAll();
          }
        });
      },
      error: (err) => {
        console.error('Cancel booking failed:', err);
        Swal.fire({
          icon: 'error',
          title: 'Unable to Cancel',
          text: 'Something went wrong while cancelling the booking. Please try again.',
          confirmButtonColor: '#0c92f4'
        });
      }
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
  this.blockedRangesList = this.blockedRangesList.filter(r => r.id !== range.id);
  Swal.fire('Deleted!', 'Blocked date range has been deleted.', 'success');
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