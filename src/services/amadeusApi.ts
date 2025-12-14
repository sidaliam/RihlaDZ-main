interface AmadeusTokenResponse {
  access_token: string;
  expires_in: number;
}

interface City {
  id: string;
  iataCode: string;
  address: {
    cityName: string;
  };
  name: string;
}

let accessToken: string = "";
let tokenExpiry: number = 0;

export const getAccessToken = async (): Promise<string> => {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const clientId = import.meta.env.VITE_AMADEUS_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_AMADEUS_CLIENT_SECRET;

  const response = await fetch(
    "https://test.api.amadeus.com/v1/security/oauth2/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    }
  );

  const data: AmadeusTokenResponse = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;

  return accessToken;
};

// src/services/amadeusApi.ts (partie corrigée)

export const createFlightOrder = async (
  flightOffer: any,
  passengers: PassengerData[],
  email: string,
  phone: string
) => {
  const accessToken = await getAccessToken();

  const travelers = passengers.map((p, i) => ({
    id: (i + 1).toString(),
    dateOfBirth: p.birthDate,
    gender: p.gender === "Mr" ? "MALE" : "FEMALE",
    name: {
      firstName: p.firstName.trim(),
      lastName: p.lastName.trim(),
    },
    contact: {
      emailAddress: email,
      phones: [
        {
          deviceType: "MOBILE", // ← OBLIGATOIRE et en MAJUSCULES
          countryCallingCode: "213",
          number: phone.replace(/\s/g, ""), // ex: 698123456
        },
      ],
    },
    documents: [
      {
        documentType: "PASSPORT",
        number: p.passportNumber,
        expiryDate: p.passportExpiry,
        issuanceCountry: "DZ",
        validityCountry: "DZ",
        nationality: "DZ",
        holder: true,
      },
    ],
  }));

  const payload = {
    data: {
      type: "flight-order",
      flightOffers: [flightOffer],
      travelers,
    },
  };

  const response = await fetch(
    "https://test.api.amadeus.com/v1/booking/flight-orders",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Amadeus error:", errorData);
    throw new Error(
      errorData.errors?.[0]?.detail ||
        "Erreur lors de la création de la réservation"
    );
  }

  const result = await response.json();
  return result.data.associatedRecords[0].reference; // ← Le vrai PNR !
};

export const searchCities = async (keyword: string): Promise<City[]> => {
  if (!keyword) return [];

  const fallbackCities: City[] = [
    {
      id: "CDG",
      iataCode: "CDG",
      address: { cityName: "Paris" },
      name: "Paris Charles de Gaulle",
    },
    {
      id: "ORY",
      iataCode: "ORY",
      address: { cityName: "Paris" },
      name: "Paris Orly",
    },
    {
      id: "ALG",
      iataCode: "ALG",
      address: { cityName: "Alger" },
      name: "Alger Houari Boumédiène",
    },
  ];

  try {
    const token = await getAccessToken();
    const response = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY,AIRPORT&keyword=${keyword}&page[limit]=5`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    return data?.data?.length > 0
      ? data.data
      : fallbackCities.filter((c) =>
          c.address.cityName.toLowerCase().includes(keyword.toLowerCase())
        );
  } catch (error) {
    console.error("Error searching cities:", error);
    return fallbackCities.filter((c) =>
      c.address.cityName.toLowerCase().includes(keyword.toLowerCase())
    );
  }
};

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  babies?: number;
  travelClass: string;
  tripType: "oneway" | "return";
  direct?: boolean;
  baggage?: boolean;
  refundable?: boolean;
}

export const searchFlights = async (params: FlightSearchParams) => {
  const token = await getAccessToken();

  let url =
    `https://test.api.amadeus.com/v2/shopping/flight-offers?` +
    `originLocationCode=${params.origin}` +
    `&destinationLocationCode=${params.destination}` +
    `&departureDate=${params.departureDate}` +
    `&adults=${params.adults}` +
    `&travelClass=${params.travelClass}` +
    `&currencyCode=DZD` +
    `&max=20`;

  if (params.tripType === "return" && params.returnDate) {
    url += `&returnDate=${params.returnDate}`;
  }

  if (params.children && params.children > 0) {
    url += `&children=${params.children}`;
  }

  if (params.babies && params.babies > 0) {
    url += `&infants=${params.babies}`;
  }

  if (params.direct) {
    url += `&nonStop=true`;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  return data.data || [];
};
