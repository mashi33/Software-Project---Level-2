const http = require('http');

const allVehicles = [
    {
      providerId: 'p1', type: 'Luxury', vehicleClass: 'Car', yearOfManufacture: 2022,
      seatCount: 4, isAc: true, transmission: 'Automatic', fuelType: 'Petrol',
      description: 'Mercedes Benz E-Class - Ultimate premium travel experience.',
      standardDailyRate: 25000, freeKMLimit: 100, extraKMRate: 150, driverNightOutFee: 5000,
      providerProfile: { name: 'Rohan Fernando', phone: '+94 77 123 4567', location: 'Colombo' },
      isVerified: true, status: 'Approved', languages: ['English', 'Sinhala', 'German'],
      features: { luggage: 3, safety: true, entertainment: true, wifi: true, airbags: true, tv: true, bluetooth: true, childSeats: true },
      availableDates: [], bookedDates: ['2026-03-29', '2026-03-30'],
      exteriorPhoto: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=1000&auto=format&fit=crop',
      interiorPhoto: 'https://images.unsplash.com/photo-1710083521061-c1b1701c5d95?w=1000&auto=format&fit=crop&q=80',
      reviews: []
    },
    {
      providerId: 'p1', type: 'Budget', vehicleClass: 'Car', yearOfManufacture: 2020,
      seatCount: 4, isAc: true, transmission: 'Automatic', fuelType: 'Hybrid',
      description: 'Toyota Prius Hybrid - Reliable and cost-effective city travel.',
      standardDailyRate: 9500, freeKMLimit: 100, extraKMRate: 55, driverNightOutFee: 2000,
      providerProfile: { name: 'City Rides LK', phone: '+94 71 987 6543', location: 'Kandy' },
      isVerified: true, status: 'Approved', languages: ['Sinhala', 'English', 'Tamil'],
      features: { luggage: 2, safety: true, entertainment: true, wifi: false, airbags: true },
      availableDates: [], bookedDates: [],
      exteriorPhoto: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=1000&auto=format&fit=crop',
      interiorPhoto: 'https://images.unsplash.com/photo-1648799833118-c989da6907d7?w=1000&auto=format&fit=crop&q=80',
      reviews: []
    },
    {
      providerId: 'p3', type: 'Luxury', vehicleClass: 'Car', yearOfManufacture: 2021,
      seatCount: 5, isAc: true, transmission: 'Automatic', fuelType: 'Petrol',
      description: 'BMW 5 Series - Performance meets luxury for your long journeys.',
      standardDailyRate: 28000, freeKMLimit: 100, extraKMRate: 160, driverNightOutFee: 5000,
      providerProfile: { name: 'Elite Travels', phone: '+94 77 555 4444', location: 'Galle' },
      isVerified: true, status: 'Approved', languages: ['English', 'Sinhala'],
      features: { luggage: 3, safety: true, entertainment: true, wifi: true, airbags: true },
      availableDates: [], bookedDates: [],
      exteriorPhoto: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=1000&auto=format&fit=crop',
      interiorPhoto: 'https://images.unsplash.com/photo-1661661125859-ab2eab09de49?w=1000&auto=format&fit=crop&q=80',
      reviews: []
    },
    {
      providerId: 'p1', type: 'Group', vehicleClass: 'Van', yearOfManufacture: 2019,
      seatCount: 12, isAc: true, transmission: 'Manual', fuelType: 'Diesel',
      description: 'Toyota Commuter KDH - Spacious and comfortable for team tours.',
      standardDailyRate: 15000, freeKMLimit: 150, extraKMRate: 80, driverNightOutFee: 3000,
      providerProfile: { name: 'Group Tours LK', phone: '+94 72 456 7890', location: 'Negombo' },
      isVerified: true, status: 'Approved', languages: ['Sinhala', 'Tamil'],
      features: { luggage: 10, safety: true, entertainment: true, wifi: false, airbags: true, tv: true },
      availableDates: [], bookedDates: [],
      exteriorPhoto: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?q=80&w=1000&auto=format&fit=crop',
      interiorPhoto: 'https://images.unsplash.com/photo-1710083521061-c1b1701c5d95?w=1000&auto=format&fit=crop&q=80',
      reviews: []
    },
    {
      providerId: 'p4', type: 'Budget', vehicleClass: 'Car', yearOfManufacture: 2018,
      seatCount: 4, isAc: true, transmission: 'Manual', fuelType: 'Petrol',
      description: 'Suzuki Alto - Most economical option for quick city hops.',
      standardDailyRate: 6500, freeKMLimit: 100, extraKMRate: 40, driverNightOutFee: 1500,
      providerProfile: { name: 'Budget Rent A Car', phone: '+94 77 000 1111', location: 'Colombo' },
      isVerified: true, status: 'Approved', languages: ['Sinhala', 'English'],
      features: { luggage: 1, safety: true, entertainment: false, wifi: false, airbags: false },
      availableDates: [], bookedDates: [],
      exteriorPhoto: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?q=80&w=1000&auto=format&fit=crop',
      interiorPhoto: 'https://images.unsplash.com/photo-1648799833118-c989da6907d7?w=1000&auto=format&fit=crop&q=80',
      reviews: []
    },
    {
      providerId: 'p2', type: 'Luxury', vehicleClass: 'Van', yearOfManufacture: 2021,
      seatCount: 9, isAc: true, transmission: 'Automatic', fuelType: 'Diesel',
      description: 'Toyota KDH Luxury - Premium group travel with reclining seats.',
      standardDailyRate: 18000, freeKMLimit: 150, extraKMRate: 90, driverNightOutFee: 4000,
      providerProfile: { name: 'Premium Shuttles', phone: '+94 77 999 8888', location: 'Colombo' },
      isVerified: true, status: 'Approved', languages: ['English', 'Sinhala', 'Tamil'],
      features: { luggage: 8, safety: true, entertainment: true, wifi: true, airbags: true, tv: true },
      availableDates: [], bookedDates: [],
      exteriorPhoto: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=1000&auto=format&fit=crop',
      interiorPhoto: 'https://images.unsplash.com/photo-1661661125859-ab2eab09de49?w=1000&auto=format&fit=crop&q=80',
      reviews: []
    }
];

const data = JSON.stringify(allVehicles);

const options = {
  hostname: 'localhost',
  port: 5233,
  path: '/api/TransportVehicles/seed',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => process.stdout.write(d));
});

req.on('error', error => console.error(error));

req.write(data);
req.end();
