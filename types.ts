export interface Prescriber {
  name: string;
  specialty: string;
  address: string;
  phone?: string; // Made optional as it's not available from the API
  score: number;
  focus: string;
  total_claims: number;
  distance_miles: number;
}

export interface ApiPrescriber {
    npi: number;
    name: string;
    specialty: string;
    address: {
        street: string;
        city: string;
        state: string;
        zip: string;
    };
    drug: {
        brand_name: string;
    };
    total_claims: number;
    distance_miles: number;
}

export interface ApiResponse {
    prescribers: ApiPrescriber[];
    results_count: number;
}


export interface ChatMessage {
  author: 'user' | 'ai';
  text: string;
}

export enum ViewState {
  WELCOME,
  LOADING,
  TEASER,
  PAYWALL,
  RESULTS,
}