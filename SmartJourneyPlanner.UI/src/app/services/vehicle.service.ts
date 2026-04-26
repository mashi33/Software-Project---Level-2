import { Injectable } from '@angular/core';
import { Vehicle, VehicleType } from '../models/transport.model';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  private allVehicles: Vehicle[] = [
    {
      id: '1', providerId: 'p1', type: VehicleType.Luxury, vehicleClass: 'Car', modelName: 'Mercedes Benz E-Class', yearOfManufacture: 2022,
      seatCount: 4, isAc: true, transmission: 'Automatic', fuelType: 'Petrol',
      description: 'Mercedes Benz E-Class - Ultimate premium travel experience.',
      standardDailyRate: 25000, freeKMLimit: 100, extraKMRate: 150, driverNightOutFee: 5000,
      providerProfile: { name: 'Rohan Fernando', phone: '+94 77 123 4567', email: 'rohan@example.com', location: 'Colombo' },
      isVerified: true, status: 'Approved', languages: ['English', 'Sinhala', 'German'],
      features: { luggage: 3, safety: true, entertainment: true, wifi: true, airbags: true, tv: true, bluetooth: true, childSeats: true },
      availableDates: [], bookedDates: ['2026-03-29', '2026-03-30'],
      exteriorPhoto: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=1000&auto=format&fit=crop',
      interiorPhoto: 'https://images.unsplash.com/photo-1710083521061-c1b1701c5d95?w=1000&auto=format&fit=crop&q=80',
      reviews: [
        { id: 'r1', userName: 'Asanka Perera', rating: 5, comment: 'Exceptional service and the car was in pristine condition. Highly recommend Rohan!', date: '2 weeks ago' },
        { id: 'r2', userName: 'Sarah Jenkins', rating: 5, comment: 'Absolute luxury. The driver was very professional and punctual.', date: '1 month ago' },
        { id: 'r3', userName: 'Kamal Silva', rating: 4, comment: 'Great experience, though the traffic in Colombo was tough. Car was perfect.', date: '3 weeks ago' }
      ]
    },
    {
      id: '2', providerId: 'p1', type: VehicleType.Budget, vehicleClass: 'Car', modelName: 'Toyota Prius', yearOfManufacture: 2020,
      seatCount: 4, isAc: true, transmission: 'Automatic', fuelType: 'Hybrid',
      description: 'Toyota Prius Hybrid - Reliable and cost-effective city travel.',
      standardDailyRate: 9500, freeKMLimit: 100, extraKMRate: 55, driverNightOutFee: 2000,
      providerProfile: { name: 'City Rides LK', phone: '+94 71 987 6543', email: 'cityrides@example.com', location: 'Kandy' },
      isVerified: true, status: 'Approved', languages: ['Sinhala', 'English', 'Tamil'],
      features: { luggage: 2, safety: true, entertainment: true, wifi: false, airbags: true },
      availableDates: [], bookedDates: [],
      exteriorPhoto: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=1000&auto=format&fit=crop',
      interiorPhoto: 'https://images.unsplash.com/photo-1648799833118-c989da6907d7?w=1000&auto=format&fit=crop&q=80',
      reviews: [
        { id: 'r4', userName: 'Nimal Jayasuriya', rating: 5, comment: 'Very fuel efficient and comfortable for a budget car. Great for city trips.', date: '5 days ago' },
        { id: 'r5', userName: 'Priya Mani', rating: 4, comment: 'Clean car and friendly driver. Value for money.', date: '2 weeks ago' }
      ]
    },
    {
      id: '3', providerId: 'p3', type: VehicleType.Luxury, vehicleClass: 'Car', modelName: 'BMW 5 Series', yearOfManufacture: 2021,
      seatCount: 5, isAc: true, transmission: 'Automatic', fuelType: 'Petrol',
      description: 'BMW 5 Series - Performance meets luxury for your long journeys.',
      standardDailyRate: 28000, freeKMLimit: 100, extraKMRate: 160, driverNightOutFee: 5000,
      providerProfile: { name: 'Elite Travels', phone: '+94 77 555 4444', email: 'elite@example.com', location: 'Galle' },
      isVerified: true, status: 'Approved', languages: ['English', 'Sinhala'],
      features: { luggage: 3, safety: true, entertainment: true, wifi: true, airbags: true },
      availableDates: [], bookedDates: [],
      exteriorPhoto: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=1000&auto=format&fit=crop',
      interiorPhoto: 'https://images.unsplash.com/photo-1661661125859-ab2eab09de49?w=1000&auto=format&fit=crop&q=80',
      reviews: [
        { id: 'r6', userName: 'John Doe', rating: 5, comment: 'The BMW was a dream to drive. Elite Travels provided excellent service.', date: '1 month ago' },
        { id: 'r7', userName: 'Kasun Abeyrathne', rating: 5, comment: 'Perfect for our wedding anniversary trip to Galle.', date: '3 months ago' }
      ]
    },
    {
      id: '4', providerId: 'p1', type: VehicleType.Group, vehicleClass: 'Van', modelName: 'Toyota KDH Commuter', yearOfManufacture: 2019,
      seatCount: 12, isAc: true, transmission: 'Manual', fuelType: 'Diesel',
      description: 'Toyota Commuter KDH - Spacious and comfortable for team tours.',
      standardDailyRate: 15000, freeKMLimit: 150, extraKMRate: 80, driverNightOutFee: 3000,
      providerProfile: { name: 'Group Tours LK', phone: '+94 72 456 7890', email: 'grouptours@example.com', location: 'Negombo' },
      isVerified: true, status: 'Approved', languages: ['Sinhala', 'Tamil'],
      features: { luggage: 10, safety: true, entertainment: true, wifi: false, airbags: true, tv: true },
      availableDates: [], bookedDates: [],
      exteriorPhoto: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?q=80&w=1000&auto=format&fit=crop',
      interiorPhoto: 'https://images.unsplash.com/photo-1710083521061-c1b1701c5d95?w=1000&auto=format&fit=crop&q=80',
      reviews: [
        { id: 'r8', userName: 'Team Alpha', rating: 5, comment: 'Plenty of space for our team of 10. The AC was very powerful.', date: '1 week ago' },
        { id: 'r9', userName: 'Bimal Rathnayake', rating: 4, comment: 'Good van, clean and well-maintained. Driver was helpful with luggage.', date: '4 days ago' }
      ]
    },
    {
      id: '5', providerId: 'p4', type: VehicleType.Budget, vehicleClass: 'Car', modelName: 'Suzuki Alto', yearOfManufacture: 2018,
      seatCount: 4, isAc: true, transmission: 'Manual', fuelType: 'Petrol',
      description: 'Suzuki Alto - Most economical option for quick city hops.',
      standardDailyRate: 6500, freeKMLimit: 100, extraKMRate: 40, driverNightOutFee: 1500,
      providerProfile: { name: 'Budget Rent A Car', phone: '+94 77 000 1111', email: 'budget@example.com', location: 'Colombo' },
      isVerified: true, status: 'Approved', languages: ['Sinhala', 'English'],
      features: { luggage: 1, safety: true, entertainment: false, wifi: false, airbags: false },
      availableDates: [], bookedDates: [],
      exteriorPhoto: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?q=80&w=1000&auto=format&fit=crop',
      interiorPhoto: 'https://images.unsplash.com/photo-1648799833118-c989da6907d7?w=1000&auto=format&fit=crop&q=80',
      reviews: [
        { id: 'r10', userName: 'Sunil Perera', rating: 5, comment: 'Most affordable option. Car was in good shape.', date: '1 month ago' },
        { id: 'r11', userName: 'Ruwan Kumara', rating: 4, comment: 'Reliable service for short trips.', date: '2 weeks ago' }
      ]
    },
    {
      id: '6', providerId: 'p2', type: VehicleType.Luxury, vehicleClass: 'Van', modelName: 'Toyota KDH Luxury', yearOfManufacture: 2021,
      seatCount: 9, isAc: true, transmission: 'Automatic', fuelType: 'Diesel',
      description: 'Toyota KDH Luxury - Premium group travel with reclining seats.',
      standardDailyRate: 18000, freeKMLimit: 150, extraKMRate: 90, driverNightOutFee: 4000,
      providerProfile: { name: 'Premium Shuttles', phone: '+94 77 999 8888', email: 'premium@example.com', location: 'Colombo' },
      isVerified: true, status: 'Approved', languages: ['English', 'Sinhala', 'Tamil'],
      features: { luggage: 8, safety: true, entertainment: true, wifi: true, airbags: true, tv: true },
      availableDates: [], bookedDates: [],
      exteriorPhoto: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=1000&auto=format&fit=crop',
      interiorPhoto: 'https://images.unsplash.com/photo-1661661125859-ab2eab09de49?w=1000&auto=format&fit=crop&q=80',
      reviews: [
        { id: 'r12', userName: 'Travelers LK', rating: 5, comment: 'Spacious and luxury feel. Perfect for long distance group travel.', date: '3 weeks ago' },
        { id: 'r13', userName: 'Dhanushka Perera', rating: 5, comment: 'Highly recommended for corporate outings.', date: '1 month ago' }
      ]
    }
  ];

  constructor() { }

  getVehicles(): Observable<Vehicle[]> {
    return of(this.allVehicles.filter(v => v.status === 'Approved'));
  }

  getProviderVehicles(providerId: string): Observable<Vehicle[]> {
    return of(this.allVehicles.filter(v => v.providerId === providerId));
  }

  getVehicleById(id: string): Observable<Vehicle | undefined> {
    const vehicle = this.allVehicles.find(v => v.id === id);
    return of(vehicle);
  }
}
