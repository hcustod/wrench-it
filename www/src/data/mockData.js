export const mockShops = [
  {
    id: 'shop-1',
    name: 'Premium Auto Care',
    rating: 4.8,
    reviewCount: 247,
    location: 'Downtown, Los Angeles',
    address: '123 Main St, Los Angeles, CA 90012',
    phone: '(323) 555-0123',
    description:
      'Family-owned full-service repair shop focused on clear estimates and same-day communication.',
    hours: {
      Monday: '8:00 AM - 6:00 PM',
      Tuesday: '8:00 AM - 6:00 PM',
      Wednesday: '8:00 AM - 6:00 PM',
      Thursday: '8:00 AM - 6:00 PM',
      Friday: '8:00 AM - 6:00 PM',
      Saturday: '9:00 AM - 3:00 PM',
      Sunday: 'Closed',
    },
    priceRange: '$$',
    services: ['Oil Change', 'Brake Repair', 'Engine Diagnostics'],
  },
  {
    id: 'shop-2',
    name: 'Westside Tire & Auto',
    rating: 4.6,
    reviewCount: 198,
    location: 'Santa Monica, Los Angeles',
    address: '744 Ocean Park Blvd, Santa Monica, CA 90405',
    phone: '(310) 555-0190',
    description: 'Trusted neighborhood shop specializing in tires, brakes, and suspension.',
    hours: {
      Monday: '7:30 AM - 6:00 PM',
      Tuesday: '7:30 AM - 6:00 PM',
      Wednesday: '7:30 AM - 6:00 PM',
      Thursday: '7:30 AM - 6:00 PM',
      Friday: '7:30 AM - 6:00 PM',
      Saturday: '8:00 AM - 2:00 PM',
      Sunday: 'Closed',
    },
    priceRange: '$$',
    services: ['Oil Change', 'Tire Service', 'Brake Repair'],
  },
  {
    id: 'shop-3',
    name: 'Metro Garage',
    rating: 4.9,
    reviewCount: 321,
    location: 'Hollywood, Los Angeles',
    address: '2400 Sunset Blvd, Los Angeles, CA 90026',
    phone: '(213) 555-0114',
    description:
      'Advanced diagnostics and electrical troubleshooting for domestic, import, and hybrid vehicles.',
    hours: {
      Monday: '8:00 AM - 7:00 PM',
      Tuesday: '8:00 AM - 7:00 PM',
      Wednesday: '8:00 AM - 7:00 PM',
      Thursday: '8:00 AM - 7:00 PM',
      Friday: '8:00 AM - 7:00 PM',
      Saturday: '9:00 AM - 4:00 PM',
      Sunday: 'Closed',
    },
    priceRange: '$$$',
    services: ['Engine Diagnostics', 'AC Repair', 'Transmission Service'],
  },
  {
    id: 'shop-4',
    name: 'Budget Auto Clinic',
    rating: 4.3,
    reviewCount: 142,
    location: 'Glendale, Los Angeles',
    address: '550 Brand Blvd, Glendale, CA 91203',
    phone: '(818) 555-0138',
    description: 'Value-focused maintenance and repairs with transparent labor pricing.',
    hours: {
      Monday: '8:30 AM - 5:30 PM',
      Tuesday: '8:30 AM - 5:30 PM',
      Wednesday: '8:30 AM - 5:30 PM',
      Thursday: '8:30 AM - 5:30 PM',
      Friday: '8:30 AM - 5:30 PM',
      Saturday: '9:00 AM - 1:00 PM',
      Sunday: 'Closed',
    },
    priceRange: '$',
    services: ['Oil Change', 'Battery Service', 'Brake Repair'],
  },
];

export const mockServices = [
  { id: 'svc-1', shopId: 'shop-1', name: 'Oil Change', price: 89, duration: '45 min', category: 'Maintenance' },
  { id: 'svc-2', shopId: 'shop-2', name: 'Oil Change', price: 75, duration: '40 min', category: 'Maintenance' },
  { id: 'svc-3', shopId: 'shop-3', name: 'Oil Change', price: 95, duration: '50 min', category: 'Maintenance' },
  { id: 'svc-4', shopId: 'shop-4', name: 'Oil Change', price: 69, duration: '40 min', category: 'Maintenance' },
  { id: 'svc-5', shopId: 'shop-1', name: 'Brake Repair', price: 280, duration: '2 hrs', category: 'Repair' },
  { id: 'svc-6', shopId: 'shop-2', name: 'Brake Repair', price: 255, duration: '2 hrs', category: 'Repair' },
  { id: 'svc-7', shopId: 'shop-3', name: 'Engine Diagnostics', price: 120, duration: '1 hr', category: 'Diagnostics' },
  { id: 'svc-8', shopId: 'shop-4', name: 'Battery Service', price: 110, duration: '45 min', category: 'Electrical' },
];

export const mockReviews = [
  {
    id: 'rev-1',
    shopId: 'shop-1',
    reviewerName: 'Avery M.',
    rating: 5,
    reviewText: 'Quick turnaround and honest recommendations. No pressure upsells.',
    isVerified: true,
    isMechanicReview: false,
    date: '2026-01-14',
  },
  {
    id: 'rev-2',
    shopId: 'shop-1',
    reviewerName: 'Jordan R.',
    rating: 4,
    reviewText: 'Good communication and accurate estimate.',
    isVerified: true,
    isMechanicReview: false,
    date: '2026-01-03',
  },
  {
    id: 'rev-3',
    shopId: 'shop-1',
    reviewerName: 'Mechanic Audit Team',
    rating: 5,
    reviewText: 'Inspection records and parts documentation verified.',
    isVerified: true,
    isMechanicReview: true,
    date: '2025-12-19',
  },
  {
    id: 'rev-4',
    shopId: 'shop-2',
    reviewerName: 'Kai T.',
    rating: 4,
    reviewText: 'Fair price on brakes and alignment.',
    isVerified: true,
    isMechanicReview: false,
    date: '2026-01-08',
  },
  {
    id: 'rev-5',
    shopId: 'shop-3',
    reviewerName: 'Noah B.',
    rating: 5,
    reviewText: 'Solved an intermittent electrical issue no other shop could identify.',
    isVerified: true,
    isMechanicReview: false,
    date: '2026-01-11',
  },
];

export const mockUserReviews = [
  {
    id: 'my-rev-1',
    shopName: 'Premium Auto Care',
    service: 'Oil Change',
    date: '2026-01-14',
    status: 'verified',
    rating: 5,
    reviewText: 'On-time, transparent, and professional service.',
  },
  {
    id: 'my-rev-2',
    shopName: 'Westside Tire & Auto',
    service: 'Brake Repair',
    date: '2025-12-22',
    status: 'pending',
    rating: 4,
    reviewText: 'Work quality was solid and the team explained everything clearly.',
  },
];

export const mockBookings = [
  {
    id: 'bk-1',
    shopName: 'Premium Auto Care',
    service: 'Engine Diagnostics',
    date: '2026-03-04',
    time: '10:30 AM',
    status: 'upcoming',
  },
  {
    id: 'bk-2',
    shopName: 'Budget Auto Clinic',
    service: 'Battery Service',
    date: '2026-03-11',
    time: '2:00 PM',
    status: 'upcoming',
  },
  {
    id: 'bk-3',
    shopName: 'Westside Tire & Auto',
    service: 'Tire Rotation',
    date: '2026-01-09',
    time: '9:00 AM',
    status: 'completed',
  },
];

export const mockSavedShops = mockShops.slice(0, 3).map((shop) => ({
  id: shop.id,
  name: shop.name,
  rating: shop.rating,
  reviewCount: shop.reviewCount,
  location: shop.location,
}));

export const mockRecentReviews = [
  {
    id: 'owner-rev-1',
    customerName: 'Avery M.',
    service: 'Oil Change',
    date: '2026-01-14',
    rating: 5,
    reviewText: 'Fast service and clear pricing.',
  },
  {
    id: 'owner-rev-2',
    customerName: 'Jordan R.',
    service: 'Brake Repair',
    date: '2026-01-06',
    rating: 4,
    reviewText: 'Great communication from intake to pickup.',
  },
  {
    id: 'owner-rev-3',
    customerName: 'Kai T.',
    service: 'Tire Service',
    date: '2025-12-30',
    rating: 5,
    reviewText: 'Alignment and balancing solved highway vibration.',
  },
];

export const mockPendingVerifications = [
  {
    id: 'verify-1',
    shopName: 'Premium Auto Care',
    customerName: 'Avery M.',
    service: 'Oil Change',
    date: '2026-02-19',
    hasReceipt: true,
  },
  {
    id: 'verify-2',
    shopName: 'Metro Garage',
    customerName: 'Noah B.',
    service: 'Engine Diagnostics',
    date: '2026-02-21',
    hasReceipt: false,
  },
];

export const mockRecentVerified = [
  {
    id: 'verified-1',
    shopName: 'Westside Tire & Auto',
    customerName: 'Jordan R.',
    service: 'Brake Repair',
    date: '2026-02-17',
    action: 'Approved',
  },
  {
    id: 'verified-2',
    shopName: 'Budget Auto Clinic',
    customerName: 'Riley S.',
    service: 'Battery Service',
    date: '2026-02-15',
    action: 'Requested details',
  },
];

export const mockAdminUsers = [
  {
    id: 'admin-user-1',
    name: 'Maria Lopez',
    email: 'maria.lopez@example.com',
    type: 'Driver',
    joined: '2026-02-01',
  },
  {
    id: 'admin-user-2',
    name: 'David Kim',
    email: 'david.kim@example.com',
    type: 'Mechanic',
    joined: '2026-01-28',
  },
  {
    id: 'admin-user-3',
    name: 'Sofia Patel',
    email: 'sofia.patel@example.com',
    type: 'Shop Owner',
    joined: '2026-01-25',
  },
];

export const mockFlaggedReviews = [
  {
    id: 'flag-1',
    shopName: 'Metro Garage',
    reviewer: 'Anonymous',
    date: '2026-02-20',
    reason: 'Potential duplicate submission from same account.',
  },
  {
    id: 'flag-2',
    shopName: 'Budget Auto Clinic',
    reviewer: 'Sam C.',
    date: '2026-02-18',
    reason: 'Missing proof for claimed warranty repair.',
  },
];

export const mockPendingShops = [
  {
    id: 'pending-shop-1',
    name: 'Sunset Auto Works',
    owner: 'Liam Brooks',
    location: 'Echo Park, Los Angeles',
    status: 'Pending',
  },
  {
    id: 'pending-shop-2',
    name: 'Valley Drive Garage',
    owner: 'Mia Collins',
    location: 'North Hollywood, Los Angeles',
    status: 'Pending',
  },
  {
    id: 'pending-shop-3',
    name: 'Rapid Car Lab',
    owner: 'Ethan Chen',
    location: 'Pasadena, Los Angeles',
    status: 'Pending',
  },
];
