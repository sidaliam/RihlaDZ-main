import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Plane, Mail, Phone } from 'lucide-react';

export default function Confirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { pnr, flight, passengers, email, phone } = location.state || {};

  if (!pnr) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Aucune réservation trouvée</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retour à la recherche
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Réservation confirmée !
            </h1>
            <p className="text-gray-600">
              Votre réservation a été effectuée avec succès
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">
                Votre numéro de réservation (PNR)
              </div>
              <div className="text-4xl font-bold text-blue-600 tracking-wider">
                {pnr}
              </div>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Plane className="w-5 h-5 text-blue-500" />
                Détails du vol
              </h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Origine</div>
                    <div className="font-semibold">
                      {flight.itineraries[0].segments[0].departure.iataCode}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Destination</div>
                    <div className="font-semibold">
                      {flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.iataCode}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Prix total</div>
                    <div className="font-semibold">
                      {flight.price.total} {flight.price.currency}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Passagers</div>
                    <div className="font-semibold">{passengers.length}</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">Passagers</h2>
              {passengers.map((passenger: any, index: number) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 mb-2">
                  <div className="font-semibold">
                    {passenger.gender} {passenger.firstName} {passenger.lastName}
                  </div>
                  <div className="text-sm text-gray-600">
                    Passeport: {passenger.passportNumber}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">Coordonnées</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">{email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-600" />
                  <span className="text-sm">{phone}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> Un email de confirmation a été envoyé à votre
              adresse email avec tous les détails de votre réservation. Conservez
              votre numéro PNR pour toute référence future.
            </p>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
}
