import { useNavigate } from "react-router-dom";
import SearchBar, { SearchParams } from "../components/SearchBar";
import { searchFlights } from "../services/amadeusApi";
import { useState } from "react";

export default function Home() {
  const navigate = useNavigate();
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (params: SearchParams) => {
    setIsSearching(true);
    try {
      const flights = await searchFlights({
        origin: params.origin,
        destination: params.destination,
        departureDate: params.departureDate,
        returnDate: params.returnDate,
        adults: params.adults,
        children: params.children,
        babies: params.babies,
        travelClass: params.travelClass,
        tripType: params.tripType,
        direct: params.direct,
        baggage: params.baggage,
        refundable: params.refundable,
      });

      navigate("/results", {
        state: {
          flights,
          searchParams: params,
        },
      });
    } catch (error) {
      console.error("Erreur lors de la recherche:", error);
      alert(
        "Une erreur est survenue lors de la recherche. Veuillez réessayer."
      );
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white-900 via-white-800 to-orange-900 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "url(https://images.pexels.com/photos/912050/pexels-photo-912050.jpeg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      ></div>

      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-8">
            <img
              src="/image.png"
              alt="Rihla Logo"
              className="h-16 w-16 object-contain rounded-full shadow-md"
            />
            <div>
              <h1 className="text-4xl font-bold text-orange-500">RIHLA</h1>
              <p className="text-xl text-white opacity-90">
                Wake up, <span className="text-orange-400">Travel </span>
              </p>
            </div>
          </div>

          <div className="max-w-5xl mx-auto">
            {isSearching ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50/80">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-20 w-20 border-4 border-orange-500 border-t-transparent mx-auto mb-6"></div>
                  <p className="text-xl font-semibold text-gray-700">
                    Recherche des meilleurs vols...
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Cela peut prendre quelques secondes
                  </p>
                </div>
              </div>
            ) : (
              <SearchBar onSearch={handleSearch} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
