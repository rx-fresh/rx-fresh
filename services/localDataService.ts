import type { ApiPrescriber } from '../types';

// Cache for loaded prescriber data
let prescribersData: any[] | null = null;

// Load prescriber data from optimized JSON file
async function loadPrescribersData(): Promise<any[]> {
  if (!prescribersData) {
    try {
      // Try to load optimized data first
      let response = await fetch('/data/prescribers-optimized.json');
      if (!response.ok) {
        // Fallback to regular prescribers file
        response = await fetch('/data/prescribers.json');
      }
      
      if (!response.ok) {
        throw new Error(`Failed to load prescribers data: ${response.status}`);
      }
      
      prescribersData = await response.json();
      console.log(`✅ Loaded ${prescribersData.length} prescribers from database`);
    } catch (error) {
      console.error('Failed to load prescribers data:', error);
      prescribersData = [];
    }
  }
  return prescribersData;
}

// Calculate simple distance between zip codes (simplified calculation)
function calculateDistance(zip1: string, zip2: string): number {
  // This is a very simplified distance calculation
  // In a real app, you'd use proper geocoding and distance calculation
  const zipMap: { [key: string]: { lat: number; lng: number } } = {
    '19033': { lat: 39.9496, lng: -75.2899 }, // Drexel Hill
    '19026': { lat: 39.9496, lng: -75.2899 }, // Drexel Hill
    '19082': { lat: 39.9565, lng: -75.2699 }, // Upper Darby
    '19063': { lat: 39.9177, lng: -75.3877 }, // Media
    '19064': { lat: 39.9100, lng: -75.3500 }, // Springfield
    '19013': { lat: 39.8498, lng: -75.3557 }, // Chester
  };

  const coord1 = zipMap[zip1];
  const coord2 = zipMap[zip2];

  if (!coord1 || !coord2) return 999; // Unknown distance

  // Simple distance calculation (haversine would be more accurate)
  const latDiff = coord1.lat - coord2.lat;
  const lngDiff = coord1.lng - coord2.lng;
  const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 69; // Rough miles conversion

  return Math.round(distance * 10) / 10; // Round to 1 decimal
}

export async function findPrescribersFromDatabase(drug: string, zip: string, radius: number = 25): Promise<ApiPrescriber[]> {
  const allPrescribers = await loadPrescribersData();

  // Filter prescribers based on drug and location
  const matchingPrescribers = allPrescribers
    .filter(prescriber => {
      // Check if prescriber has the requested drug
      const hasDrug = prescriber.drugs?.some((d: string) => 
        d.toLowerCase().includes(drug.toLowerCase())
      ) || prescriber.name.toLowerCase().includes(drug.toLowerCase());
      
      if (!hasDrug) return false;

      // Calculate distance
      const distance = calculateDistance(zip, prescriber.address.zip);
      prescriber.distance_miles = distance;
      
      return distance <= radius;
    })
    .map(prescriber => ({
      npi: prescriber.npi,
      name: prescriber.name,
      specialty: prescriber.specialty,
      address: {
        street: prescriber.address.street,
        city: prescriber.address.city,
        state: prescriber.address.state,
        zip: prescriber.address.zip
      },
      drug: {
        brand_name: prescriber.drug.brand_name
      },
      total_claims: prescriber.total_claims,
      distance_miles: prescriber.distance_miles
    }));

  // Deduplicate and merge doctors with multiple locations
  const doctorGroups = new Map<string, ApiPrescriber[]>();
  
  matchingPrescribers.forEach(prescriber => {
    const key = `${prescriber.name}-${prescriber.specialty}`;
    if (!doctorGroups.has(key)) {
      doctorGroups.set(key, []);
    }
    doctorGroups.get(key)!.push(prescriber);
  });

  // Merge multiple locations for the same doctor
  const mergedPrescribers = Array.from(doctorGroups.values()).map(group => {
    if (group.length === 1) {
      return group[0];
    }

    // Merge multiple locations
    const primary = group[0];
    const totalClaims = group.reduce((sum, p) => sum + p.total_claims, 0);
    const avgDistance = group.reduce((sum, p) => sum + p.distance_miles, 0) / group.length;
    
    // Find the best location (closest or highest claims)
    const bestLocation = group.reduce((best, current) => {
      if (current.distance_miles < best.distance_miles) return current;
      if (current.total_claims > best.total_claims) return current;
      return best;
    });

    return {
      ...primary,
      total_claims: totalClaims,
      distance_miles: Math.round(avgDistance * 10) / 10,
      address: bestLocation.address, // Use best location's address
      // Add a locations array for UI to show multiple locations if needed
      locations: group.map(p => ({
        address: p.address,
        claims: p.total_claims,
        distance: p.distance_miles
      }))
    };
  });

  // Sort by total claims descending
  return mergedPrescribers.sort((a, b) => b.total_claims - a.total_claims);
}
