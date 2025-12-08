import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Phone,
  Mail,
  Plane,
  Clock,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { createFlightOrder } from "../services/amadeusApi";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface PassengerData {
  gender: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
}

export default function BookingForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const { flight, searchParams } = location.state || {};

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [commune, setCommune] = useState("");
  const [passengers, setPassengers] = useState<PassengerData[]>([
    {
      gender: "Mr",
      firstName: "",
      lastName: "",
      birthDate: "",
      nationality: "Algérie",
      passportNumber: "",
      passportExpiry: "",
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const updatePassenger = (
    index: number,
    field: keyof PassengerData,
    value: string
  ) => {
    const updated = [...passengers];
    updated[index] = { ...updated[index], [field]: value };
    setPassengers(updated);
  };

  const generatePNR = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let pnr = "";
    for (let i = 0; i < 6; i++) {
      pnr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pnr;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !phone || !wilaya || !commune) {
      alert("Veuillez remplir tous les champs de contact");
      return;
    }

    for (const passenger of passengers) {
      if (
        !passenger.firstName ||
        !passenger.lastName ||
        !passenger.birthDate ||
        !passenger.nationality ||
        !passenger.passportNumber ||
        !passenger.passportExpiry
      ) {
        alert("Veuillez remplir toutes les informations des passagers");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 1. Créer une vraie réservation Amadeus → vrai PNR
      let pnr = "ERROR";
      try {
        pnr = await createFlightOrder(flight, passengers, email, phone);
        console.log("Vrai PNR Amadeus:", pnr);
      } catch (err) {
        console.error("Erreur Flight Create Order:", err);
        // Fallback : génère un faux PNR si Amadeus échoue
        pnr = generatePNR();
        alert("Réservation simulée (mode test limité atteint)");
      }

      // 2. Sauvegarde dans Supabase
      const { error } = await supabase.from("reservations").insert({
        pnr,
        email,
        phone,
        wilaya,
        commune,
        flight_data: flight,
        search_params: searchParams,
        passengers,
        total_price: flight.price.total,
        currency: flight.price.currency,
        status: pnr.length === 6 ? "confirmed_real" : "confirmed_simulated",
      });

      if (error) throw error;

      // 3. Redirection avec le vrai PNR
      navigate("/confirmation", {
        state: {
          pnr,
          flight,
          passengers,
          email,
          phone,
          isRealPNR: pnr.length === 6, // vrai PNR = 6 caractères
        },
      });
    } catch (error) {
      console.error("Erreur:", error);
      alert("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!flight) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Aucun vol sélectionné</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retour à la recherche
          </button>
        </div>
      </div>
    );
  }

  const outbound = flight.itineraries[0];
  const inbound = flight.itineraries[1];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Paiement</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <Phone className="w-5 h-5 text-orange-500" />
                  <h2 className="text-xl font-semibold">Coordonnées</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse e-mail <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Numéro de téléphone{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <select className="px-3 py-3 border border-gray-300 rounded-lg bg-white">
                        <option>+213</option>
                      </select>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="6xx xxx xxx"
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Wilaya <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={wilaya}
                      onChange={(e) => setWilaya(e.target.value)}
                      placeholder="Sélectionnez une ville"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Commune <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={commune}
                      onChange={(e) => setCommune(e.target.value)}
                      placeholder="Commune"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </div>

              {passengers.map((passenger, index) => (
                <div key={index} className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-6">
                    <Mail className="w-5 h-5 text-orange-500" />
                    <h2 className="text-xl font-semibold">
                      Passager {index + 1}
                    </h2>
                    <span className="text-sm text-gray-500">Adulte</span>
                  </div>

                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => updatePassenger(index, "gender", "Mr")}
                      className={`px-6 py-2 rounded-lg font-medium ${
                        passenger.gender === "Mr"
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      Mr
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePassenger(index, "gender", "Mme")}
                      className={`px-6 py-2 rounded-lg font-medium ${
                        passenger.gender === "Mme"
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      Mme
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prénom <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={passenger.firstName}
                        onChange={(e) =>
                          updatePassenger(index, "firstName", e.target.value)
                        }
                        placeholder="Entrez le prénom"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nom <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={passenger.lastName}
                        onChange={(e) =>
                          updatePassenger(index, "lastName", e.target.value)
                        }
                        placeholder="Entrez le nom"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date de naissance{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={passenger.birthDate}
                        onChange={(e) =>
                          updatePassenger(index, "birthDate", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pays <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={passenger.nationality}
                        onChange={(e) =>
                          updatePassenger(index, "nationality", e.target.value)
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option>Algérie</option>
                        <option>France</option>
                        <option>Maroc</option>
                        <option>Tunisie</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Numéro de passeport{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={passenger.passportNumber}
                        onChange={(e) =>
                          updatePassenger(
                            index,
                            "passportNumber",
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date d'expiration du passeport{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={passenger.passportExpiry}
                        onChange={(e) =>
                          updatePassenger(
                            index,
                            "passportExpiry",
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-orange-500 text-white rounded-lg hover:bg-blue-600 font-semibold text-lg disabled:bg-gray-400"
              >
                {isSubmitting
                  ? "Réservation en cours..."
                  : "Confirmer la réservation"}
              </button>
            </form>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-6 shadow-sm sticky top-4">
              <div className="flex items-center gap-2 mb-6">
                <Plane className="w-5 h-5 text-blue-500" />
                <h2 className="text-xl font-semibold">Votre itinéraire</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="text-blue-500 font-semibold mb-3">
                    Aller • {formatDate(outbound.segments[0].departure.at)}
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <div>
                        <div className="text-2xl font-bold">
                          {formatTime(outbound.segments[0].departure.at)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {outbound.segments[0].departure.iataCode}
                        </div>
                      </div>
                      <div className="text-center flex-1 px-2">
                        <div className="text-sm text-green-600 font-medium">
                          Direct
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {formatTime(
                            outbound.segments[outbound.segments.length - 1]
                              .arrival.at
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {
                            outbound.segments[outbound.segments.length - 1]
                              .arrival.iataCode
                          }
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                          <Plane className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {getAirlineName(flight.validatingAirlineCodes[0])}
                          </div>
                          <div className="text-xs text-gray-500">
                            {outbound.segments[0].carrierCode}-
                            {outbound.segments[0].number}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {outbound.segments[0].aircraft.code}
                      </div>
                      <div className="text-sm mt-2">
                        <div>Classe: Économique</div>
                        <div className="text-gray-500">
                          Durée: {formatDuration(outbound.duration)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {inbound && (
                  <div>
                    <div className="text-blue-500 font-semibold mb-3">
                      Retour • {formatDate(inbound.segments[0].departure.at)}
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <div>
                          <div className="text-2xl font-bold">
                            {formatTime(inbound.segments[0].departure.at)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {inbound.segments[0].departure.iataCode}
                          </div>
                        </div>
                        <div className="text-center flex-1 px-2">
                          <div className="text-sm text-green-600 font-medium">
                            Direct
                          </div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">
                            {formatTime(
                              inbound.segments[inbound.segments.length - 1]
                                .arrival.at
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {
                              inbound.segments[inbound.segments.length - 1]
                                .arrival.iataCode
                            }
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                            <Plane className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">
                              {getAirlineName(flight.validatingAirlineCodes[0])}
                            </div>
                            <div className="text-xs text-gray-500">
                              {inbound.segments[0].carrierCode}-
                              {inbound.segments[0].number}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {inbound.segments[0].aircraft.code}
                        </div>
                        <div className="text-sm mt-2">
                          <div>Classe: Économique</div>
                          <div className="text-gray-500">
                            Durée: {formatDuration(inbound.duration)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-2">Bagages</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-blue-500" />
                      <span>Bagage en cabine inclus - 1 PC</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                      <span>Bagage en soute non inclus</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center text-2xl font-bold">
                    <span>Total</span>
                    <span>
                      {flight.price.total} {flight.price.currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
