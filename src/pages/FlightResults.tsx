import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plane, Clock, AlertCircle, Briefcase, X } from "lucide-react";

interface FlightOffer {
  id: string;
  price: {
    total: string;
    currency: string;
  };
  itineraries: Array<{
    duration: string;
    segments: Array<{
      departure: {
        iataCode: string;
        at: string;
      };
      arrival: {
        iataCode: string;
        at: string;
      };
      carrierCode: string;
      number: string;
      aircraft: {
        code: string;
      };
      duration: string;
    }>;
  }>;
  travelerPricings: Array<{
    fareDetailsBySegment: Array<{
      cabin: string;
      includedCheckedBags?: {
        quantity: number;
      };
    }>;
  }>;
  validatingAirlineCodes: string[];
  nonRefundable?: boolean;
}

export default function FlightResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { flights, searchParams } = location.state || {
    flights: [],
    searchParams: {},
  };

  const [selectedFlight, setSelectedFlight] = useState<FlightOffer | null>(
    null
  );
  const [showDetails, setShowDetails] = useState(false);

  // Filtres actifs
  const [stopFilter, setStopFilter] = useState<
    "all" | "direct" | "1stop" | "2stops"
  >("all");
  const [baggageFilter, setBaggageFilter] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [sortBy, setSortBy] = useState<"price" | "duration" | "departure">(
    "price"
  );
  const [failedLogos, setFailedLogos] = useState<Set<string>>(new Set());

  // Ajoute ces lignes avec tes autres useState
  const [selectedAirlines, setSelectedAirlines] = useState<Set<string>>(
    new Set()
  );

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getBaggageDetails = (flight: FlightOffer) => {
    const segments = flight.travelerPricings[0]?.fareDetailsBySegment || [];

    // On cherche les infos bagage sur tous les segments (aller + retour)
    const checkedBags = segments
      .map((seg: any) => seg.includedCheckedBags)
      .filter(Boolean);

    if (
      checkedBags.length === 0 ||
      checkedBags.every(
        (b: any) => (b.quantity ?? 0) === 0 && (b.weight ?? 0) === 0
      )
    ) {
      return {
        included: false,
        text: "Bagage en soute non inclus",
        subText: "Bagage à main uniquement (généralement 8-10 kg)",
        icon: "cross",
      };
    }

    const firstBag = checkedBags[0];

    if (firstBag.quantity > 0) {
      const qty = firstBag.quantity;
      return {
        included: true,
        text: `${qty} bagage${qty > 1 ? "s" : ""} en soute inclus`,
        subText: "Généralement 23 kg par bagage",
        icon: "bag",
      };
    }

    if (firstBag.weight > 0) {
      return {
        included: true,
        text: `${firstBag.weight} ${firstBag.weightUnit} en soute inclus`,
        subText: "Poids total autorisé",
        icon: "bag",
      };
    }

    return {
      included: false,
      text: "Bagage en soute non inclus",
      subText: "Bagage à main uniquement",
      icon: "cross",
    };
  };

  const formatDate = (dateTime: string) => {
    return new Date(dateTime).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatDuration = (duration: string) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?/);
    if (!match) return duration;
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    return `${hours}h ${minutes}m`;
  };

  const getAirlineName = (code: string) => {
    const airlines: { [key: string]: string } = {
      AH: "Air Algerie",
      AF: "Air France",
      AZ: "Ita Airways",
      TK: "Turkish Airlines",
      LH: "Lufthansa",
      IB: "Iberia",
      BA: "British Airways",
    };
    return airlines[code] || code;
  };

  const getDurationInMinutes = (duration: string) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?/);
    if (!match) return 0;
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    return hours * 60 + minutes;
  };

  // Ajoute cette fonction juste après getBaggageDetails()
  const getAvailableAirlines = (): { code: string; name: string }[] => {
    const airlines = new Map<string, string>();

    flights.forEach((flight: FlightOffer) => {
      const code = flight.validatingAirlineCodes[0];
      if (code && !airlines.has(code)) {
        airlines.set(code, getAirlineName(code));
      }
    });

    return Array.from(airlines.entries()).map(([code, name]) => ({
      code,
      name,
    }));
  };

  // Fonction de filtrage
  // Remplace toute la fonction filterFlights par ÇA :
  const filterFlights = (flights: FlightOffer[]) => {
    return flights.filter((flight) => {
      const outbound = flight.itineraries[0];
      const stopsCount = outbound.segments.length - 1;
      const price = parseFloat(flight.price.total);
      const baggageInfo = getBaggageDetails(flight);
      const hasBaggage = baggageInfo.included;
      const airlineCode = flight.validatingAirlineCodes[0];

      // Filtre par escales
      if (stopFilter === "direct" && stopsCount !== 0) return false;
      if (stopFilter === "1stop" && stopsCount !== 1) return false;
      if (stopFilter === "2stops" && stopsCount !== 2) return false;

      // Filtre bagages
      if (baggageFilter && !hasBaggage) return false;

      // Filtre par compagnie (seulement si au moins une est sélectionnée)
      if (selectedAirlines.size > 0 && !selectedAirlines.has(airlineCode)) {
        return false;
      }

      // Filtre par prix
      if (price < priceRange[0] || price > priceRange[1]) return false;

      return true;
    });
  };

  // Fonction de tri
  const sortFlights = (flights: FlightOffer[]) => {
    const sorted = [...flights];

    switch (sortBy) {
      case "price":
        return sorted.sort(
          (a, b) => parseFloat(a.price.total) - parseFloat(b.price.total)
        );
      case "duration":
        return sorted.sort(
          (a, b) =>
            getDurationInMinutes(a.itineraries[0].duration) -
            getDurationInMinutes(b.itineraries[0].duration)
        );
      case "departure":
        return sorted.sort(
          (a, b) =>
            new Date(a.itineraries[0].segments[0].departure.at).getTime() -
            new Date(b.itineraries[0].segments[0].departure.at).getTime()
        );
      default:
        return sorted;
    }
  };

  const filteredAndSortedFlights = sortFlights(filterFlights(flights));

  const handleSelectFlight = (flight: FlightOffer) => {
    setSelectedFlight(flight);
    setShowDetails(true);
  };

  const handleReserve = (flight: FlightOffer) => {
    navigate("/booking", {
      state: {
        flight,
        searchParams,
      },
    });
  };

  const resetFilters = () => {
    setStopFilter("all");
    setBaggageFilter(false);
    setPriceRange([0, 100000]);
    setSelectedAirlines(new Set()); // ← AJOUTE CETTE LIGNE !
  };

  console.log("Les vols a afficher : ", flights);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Résultats de recherche
            </h1>
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 text-white bg-orange-500 rounded-lg hover:bg-orange-600"
            >
              Nouvelle recherche
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">
              {searchParams.origin} → {searchParams.destination}
            </span>
            <span>•</span>
            <span>{searchParams.departureDate}</span>
            {searchParams.returnDate && (
              <>
                <span>→</span>
                <span>{searchParams.returnDate}</span>
              </>
            )}
            <span>•</span>
            <span>
              {searchParams.adults +
                (searchParams.children || 0) +
                (searchParams.babies || 0)}{" "}
              passager(s)
            </span>

            {/* Affichage des paramètres de recherche */}
            {searchParams.direct && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                Vol direct
              </span>
            )}
            {searchParams.baggage && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                Avec bagages
              </span>
            )}
            {searchParams.refundable && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                Remboursable
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar avec filtres */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-sm sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Filtres</h3>
                <button
                  onClick={resetFilters}
                  className="text-orange-500 text-sm hover:text-orange-600 font-medium"
                >
                  Réinitialiser
                </button>
              </div>

              {/* Tri */}
              <div className="mb-6">
                <h4 className="font-semibold text-sm mb-3 text-gray-700">
                  Trier par
                </h4>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="price">Prix (croissant)</option>
                  <option value="duration">Durée (court)</option>
                  <option value="departure">Heure de départ</option>
                </select>
              </div>

              {/* Escales */}
              <div className="mb-6">
                <h4 className="font-semibold text-sm mb-3 text-gray-700">
                  Escales
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer group">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        stopFilter === "all"
                          ? "border-orange-500 bg-orange-500"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {stopFilter === "all" && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <input
                      type="radio"
                      name="stops"
                      checked={stopFilter === "all"}
                      onChange={() => setStopFilter("all")}
                      className="sr-only"
                    />
                    <span className="group-hover:text-gray-900">
                      Tous les vols
                    </span>
                  </label>

                  <label className="flex items-center gap-2 text-sm cursor-pointer group">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        stopFilter === "direct"
                          ? "border-orange-500 bg-orange-500"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {stopFilter === "direct" && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <input
                      type="radio"
                      name="stops"
                      checked={stopFilter === "direct"}
                      onChange={() => setStopFilter("direct")}
                      className="sr-only"
                    />
                    <span className="group-hover:text-gray-900">
                      Direct uniquement
                    </span>
                  </label>

                  <label className="flex items-center gap-2 text-sm cursor-pointer group">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        stopFilter === "1stop"
                          ? "border-orange-500 bg-orange-500"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {stopFilter === "1stop" && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <input
                      type="radio"
                      name="stops"
                      checked={stopFilter === "1stop"}
                      onChange={() => setStopFilter("1stop")}
                      className="sr-only"
                    />
                    <span className="group-hover:text-gray-900">1 Escale</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm cursor-pointer group">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        stopFilter === "2stops"
                          ? "border-orange-500 bg-orange-500"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {stopFilter === "2stops" && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <input
                      type="radio"
                      name="stops"
                      checked={stopFilter === "2stops"}
                      onChange={() => setStopFilter("2stops")}
                      className="sr-only"
                    />
                    <span className="group-hover:text-gray-900">2 Escales</span>
                  </label>
                </div>
              </div>

              {/* Bagages */}
              <div className="mb-6">
                <h4 className="font-semibold text-sm mb-3 text-gray-700">
                  Options
                </h4>
                <label className="flex items-center gap-2 text-sm cursor-pointer group">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      baggageFilter
                        ? "border-orange-500 bg-orange-500"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {baggageFilter && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={baggageFilter}
                    onChange={(e) => setBaggageFilter(e.target.checked)}
                    className="sr-only"
                  />
                  <span className="group-hover:text-gray-900">
                    Bagages inclus
                  </span>
                </label>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-sm mb-3 text-gray-700">
                  Compagnies aériennes (
                  {selectedAirlines.size > 0 ? selectedAirlines.size : "Toutes"}
                  )
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {getAvailableAirlines().map(({ code, name }) => (
                    <label
                      key={code}
                      className="flex items-center gap-2 text-sm cursor-pointer group"
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          selectedAirlines.has(code)
                            ? "border-orange-500 bg-orange-500"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {selectedAirlines.has(code) && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedAirlines.has(code)}
                        onChange={(e) => {
                          const newSet = new Set(selectedAirlines);
                          if (e.target.checked) {
                            newSet.add(code);
                          } else {
                            newSet.delete(code);
                          }
                          setSelectedAirlines(newSet);
                        }}
                        className="sr-only"
                      />
                      <span className="group-hover:text-gray-900">
                        {name} ({code})
                      </span>
                    </label>
                  ))}
                </div>
                {selectedAirlines.size > 0 && (
                  <button
                    onClick={() => setSelectedAirlines(new Set())}
                    className="text-xs text-orange-600 hover:text-orange-700 mt-2"
                  >
                    Effacer la sélection
                  </button>
                )}
              </div>

              {/* Résumé des filtres actifs */}
              {(stopFilter !== "all" || baggageFilter) && (
                <div className="pt-4 border-t">
                  <div className="text-xs text-gray-500 mb-2">
                    Filtres actifs:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {stopFilter !== "all" && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium flex items-center gap-1">
                        {stopFilter === "direct"
                          ? "Direct"
                          : stopFilter === "1stop"
                          ? "1 Escale"
                          : "2 Escales"}
                        <button
                          onClick={() => setStopFilter("all")}
                          className="hover:text-orange-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {baggageFilter && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium flex items-center gap-1">
                        Bagages
                        <button
                          onClick={() => setBaggageFilter(false)}
                          className="hover:text-orange-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Liste des vols */}
          <div className="lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">
                  {filteredAndSortedFlights.length}
                </span>{" "}
                vol(s) trouvé(s)
                {filteredAndSortedFlights.length !== flights.length && (
                  <span className="ml-2 text-gray-500">
                    sur {flights.length} total
                  </span>
                )}
              </div>
            </div>

            {filteredAndSortedFlights.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center shadow-sm">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Aucun vol trouvé
                </h3>
                <p className="text-gray-600 mb-4">
                  Essayez de modifier vos filtres de recherche
                </p>
                <button
                  onClick={resetFilters}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAndSortedFlights.map((flight: FlightOffer) => {
                  const outbound = flight.itineraries[0];
                  const inbound = flight.itineraries[1];
                  const firstSegment = outbound.segments[0];
                  const lastSegment =
                    outbound.segments[outbound.segments.length - 1];
                  const hasBaggage =
                    flight.travelerPricings[0]?.fareDetailsBySegment[0]
                      ?.includedCheckedBags?.quantity > 0;

                  return (
                    <div
                      key={flight.id}
                      className="bg-white rounded-5xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-white shadow-sm border border-gray-200 flex items-center justify-center">
                            {failedLogos.has(
                              flight.validatingAirlineCodes[0]
                            ) ? (
                              // Fallback : carré orange avec avion
                              <div className="w-full h-full bg-orange-500 rounded-lg flex items-center justify-center">
                                <Plane className="w-6 h-6 text-white" />
                              </div>
                            ) : (
                              // Vrai logo Airhex
                              <img
                                src={`https://content.airhex.com/content/logos/airlines_${flight.validatingAirlineCodes[0]}_256_256_s.png`}
                                alt={getAirlineName(
                                  flight.validatingAirlineCodes[0]
                                )}
                                className="w-20 h-20 object-contain"
                                loading="lazy"
                                onError={() => {
                                  setFailedLogos(
                                    (prev) =>
                                      new Set([
                                        ...prev,
                                        flight.validatingAirlineCodes[0],
                                      ])
                                  );
                                }}
                              />
                            )}
                          </div>

                          <div>
                            <div className="font-semibold text-gray-900">
                              {getAirlineName(flight.validatingAirlineCodes[0])}
                            </div>
                            <div className="text-sm text-gray-500">
                              {flight.validatingAirlineCodes[0]}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">
                            {flight.price.total}{" "}
                            <span className="text-base font-normal text-gray-600">
                              {flight.price.currency}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* Vol aller */}
                        <div>
                          <div className="flex items-center gap-2 text-orange-500 text-sm font-medium mb-3">
                            <Plane className="w-4 h-4" />
                            Aller • {formatDate(firstSegment.departure.at)}
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-2xl font-bold text-gray-900">
                                {formatTime(firstSegment.departure.at)}
                              </div>
                              <div className="text-sm font-medium text-gray-600">
                                {firstSegment.departure.iataCode}
                              </div>
                            </div>
                            <div className="flex-1 px-6">
                              <div className="flex items-center justify-center gap-2 mb-1">
                                <div
                                  className={`text-sm font-semibold ${
                                    outbound.segments.length === 1
                                      ? "text-green-600"
                                      : "text-orange-600"
                                  }`}
                                >
                                  {outbound.segments.length === 1
                                    ? "✓ Direct"
                                    : `${
                                        outbound.segments.length - 1
                                      } escale(s)`}
                                </div>
                              </div>
                              <div className="h-0.5 bg-gray-200 relative">
                                <div className="absolute -top-1 left-0 w-2 h-2 bg-orange-500 rounded-full"></div>
                                <div className="absolute -top-1 right-0 w-2 h-2 bg-orange-500 rounded-full"></div>
                              </div>
                              <div className="text-xs text-gray-500 text-center mt-1 flex items-center justify-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDuration(outbound.duration)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-gray-900">
                                {formatTime(lastSegment.arrival.at)}
                              </div>
                              <div className="text-sm font-medium text-gray-600">
                                {lastSegment.arrival.iataCode}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Vol retour */}
                        {inbound && (
                          <div className="pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-2 text-orange-500 text-sm font-medium mb-3">
                              <Plane className="w-4 h-4 rotate-180" />
                              Retour •{" "}
                              {formatDate(inbound.segments[0].departure.at)}
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-2xl font-bold text-gray-900">
                                  {formatTime(inbound.segments[0].departure.at)}
                                </div>
                                <div className="text-sm font-medium text-gray-600">
                                  {inbound.segments[0].departure.iataCode}
                                </div>
                              </div>
                              <div className="flex-1 px-6">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                  <div
                                    className={`text-sm font-semibold ${
                                      inbound.segments.length === 1
                                        ? "text-green-600"
                                        : "text-orange-600"
                                    }`}
                                  >
                                    {inbound.segments.length === 1
                                      ? "✓ Direct"
                                      : `${
                                          inbound.segments.length - 1
                                        } escale(s)`}
                                  </div>
                                </div>
                                <div className="h-0.5 bg-gray-200 relative">
                                  <div className="absolute -top-1 left-0 w-2 h-2 bg-orange-500 rounded-full"></div>
                                  <div className="absolute -top-1 right-0 w-2 h-2 bg-orange-500 rounded-full"></div>
                                </div>
                                <div className="text-xs text-gray-500 text-center mt-1 flex items-center justify-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDuration(inbound.duration)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-gray-900">
                                  {formatTime(
                                    inbound.segments[
                                      inbound.segments.length - 1
                                    ].arrival.at
                                  )}
                                </div>
                                <div className="text-sm font-medium text-gray-600">
                                  {
                                    inbound.segments[
                                      inbound.segments.length - 1
                                    ].arrival.iataCode
                                  }
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Informations et actions */}
                        <div className="pt-4 border-t border-gray-100 space-y-4 md:space-y-0">
                          {/* Infos : bagages + remboursable → en colonne sur mobile, en ligne sur md+ */}
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            {/* Bagages + Non remboursable */}
                            <div className="flex flex-col gap-2 text-sm">
                              <span
                                className={`flex items-center gap-1.5 font-medium ${
                                  hasBaggage
                                    ? "text-green-600"
                                    : "text-orange-600"
                                }`}
                              >
                                <Briefcase className="w-4 h-4" />
                                {hasBaggage ? "Bagages inclus" : "Sans bagages"}
                              </span>

                              {flight.nonRefundable !== false && (
                                <span className="flex items-center gap-1.5 text-red-600 font-medium">
                                  <AlertCircle className="w-4 h-4" />
                                  Non remboursable
                                </span>
                              )}

                              <span className="flex items-center gap-1.5 text-black-600 font-medium">
                                <AlertCircle className="w-4 h-4" />
                                Nombre de place restante(s){" "}
                                {flight.numberOfBookableSeats}
                              </span>
                            </div>

                            {/* Boutons : en colonne sur mobile, en ligne sur md+ */}
                            <div className="flex flex-col sm:flex-row gap-2">
                              <button
                                onClick={() => handleSelectFlight(flight)}
                                className="px-5 py-2.5 text-orange-600 border border-orange-600 rounded-lg hover:bg-orange-50 font-medium transition-colors text-center"
                              >
                                Détails
                              </button>
                              <button
                                onClick={() => handleReserve(flight)}
                                className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium transition-colors text-center shadow-sm"
                              >
                                Réserver
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showDetails && selectedFlight && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowDetails(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <Plane className="w-8 h-8 text-blue-500" />
              <h2 className="text-2xl font-bold">Détails du billet</h2>
            </div>

            {selectedFlight.itineraries.map((itinerary, idx) => {
              const isOutbound = idx === 0;
              return (
                <div key={idx} className="mb-8">
                  <h3 className="text-xl font-semibold text-blue-500 mb-4">
                    {isOutbound ? "Aller" : "Retour"}
                  </h3>
                  <div className="space-y-4">
                    {itinerary.segments.map((segment, segIdx) => (
                      <div key={segIdx} className="bg-gray-50 rounded-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="text-3xl font-bold">
                              {formatTime(segment.departure.at)}
                            </div>
                            <div className="text-gray-600">
                              {segment.departure.iataCode}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDate(segment.departure.at)}
                            </div>
                          </div>
                          <div className="text-center flex-1 px-4">
                            <div className="font-medium text-green-600">
                              Direct
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDuration(segment.duration)}
                            </div>
                          </div>
                          <div>
                            <div className="text-3xl font-bold">
                              {formatTime(segment.arrival.at)}
                            </div>
                            <div className="text-gray-600">
                              {segment.arrival.iataCode}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDate(segment.arrival.at)}
                            </div>
                          </div>
                        </div>
                        <div className="border-t pt-4">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                              <Plane className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="font-semibold">
                                {getAirlineName(segment.carrierCode)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {segment.carrierCode}-{segment.number}
                              </div>
                              <div className="text-sm text-gray-500">
                                {segment.aircraft.code}
                              </div>
                            </div>
                          </div>
                          <div className="mt-4">
                            <div className="font-medium">
                              Classe: Économique
                            </div>
                            <div className="text-sm text-gray-500">
                              Durée: {formatDuration(segment.duration)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {(() => {
                    const baggage = getBaggageDetails(selectedFlight);
                    return (
                      <div
                        className={`mt-4 rounded-lg p-4 ${
                          baggage.included ? "bg-green-50" : "bg-orange-50"
                        }`}
                      >
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Briefcase className="w-5 h-5" />
                          Bagages
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div
                            className={`flex items-center gap-2 font-medium ${
                              baggage.included
                                ? "text-green-700"
                                : "text-orange-700"
                            }`}
                          >
                            {baggage.included ? (
                              <svg
                                className="w-5 h-5 text-green-600"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-5 h-5 text-orange-600"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                            {baggage.text}
                          </div>
                          <div className="text-gray-600 ml-7">
                            {baggage.subText}
                          </div>
                          <div className="text-xs text-gray-500 ml-7 mt-2">
                            Bagage cabine inclus (1 pièce, généralement 8-10 kg)
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="mt-4 bg-red-50 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">
                      Conditions tarifaires
                    </h4>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        <span>Non remboursable</span>
                      </div>
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        <span>Non modifiable</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between pt-6 border-t">
              <div className="text-3xl font-bold">
                {selectedFlight.price.total} {selectedFlight.price.currency}
              </div>
              <button
                onClick={() => {
                  setShowDetails(false);
                  handleReserve(selectedFlight);
                }}
                className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
              >
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
