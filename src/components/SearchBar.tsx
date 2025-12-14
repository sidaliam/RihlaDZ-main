import { useState, useEffect, useRef } from "react";
import {
  Plane,
  Users,
  Calendar,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  TicketPlus,
} from "lucide-react";
import { searchCities } from "../services/amadeusApi";

interface City {
  id: string;
  iataCode: string;
  address: {
    cityName: string;
  };
  name: string;
}

interface SearchBarProps {
  onSearch: (params: SearchParams) => void;
  initialParams?: Partial<SearchParams>; // NOUVEAU
}

export interface SearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  babies: number;
  travelClass: string;
  tripType: "oneway" | "return";
  direct: boolean;
  baggage: boolean;
  refundable: boolean;
}

const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

const DAYS_FR = ["lu", "ma", "me", "je", "ve", "sa", "di"];

export default function SearchBar({ onSearch, initialParams }: SearchBarProps) {
  const [tripType, setTripType] = useState<"oneway" | "return" | "multi">(
    initialParams?.tripType || "return"
  );
  const [origin, setOrigin] = useState(initialParams?.origin || "");
  const [destination, setDestination] = useState(
    initialParams?.destination || ""
  );
  const [originInput, setOriginInput] = useState("");
  const [destInput, setDestInput] = useState("");
  const [originDisplay, setOriginDisplay] = useState("");
  const [destDisplay, setDestDisplay] = useState("");
  const [originResults, setOriginResults] = useState<City[]>([]);
  const [destResults, setDestResults] = useState<City[]>([]);
  const [departureDate, setDepartureDate] = useState<Date | null>(
    initialParams?.departureDate ? new Date(initialParams.departureDate) : null
  );
  const [returnDate, setReturnDate] = useState<Date | null>(
    initialParams?.returnDate ? new Date(initialParams.returnDate) : null
  );
  const [adults, setAdults] = useState(initialParams?.adults || 1);
  const [children, setChildren] = useState(initialParams?.children || 0);
  const [babies, setBabies] = useState(initialParams?.babies || 0);
  const [travelClass, setTravelClass] = useState("ECONOMY");
  const [showPassengerDropdown, setShowPassengerDropdown] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [direct, setDirect] = useState(initialParams?.direct || false);
  const [baggage, setBaggage] = useState(initialParams?.baggage ?? true);
  const [refundable, setRefundable] = useState(
    initialParams?.refundable || false
  );
  const [isLoading, setIsLoading] = useState(false);
  const [selectingDateType, setSelectingDateType] = useState<
    "departure" | "return"
  >("departure");

  const calendarRef = useRef<HTMLDivElement>(null);
  const passengerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
      }
      if (
        passengerRef.current &&
        !passengerRef.current.contains(event.target as Node)
      ) {
        setShowPassengerDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // useEffect(() => {
  //   if (originInput) {
  //     const fetchOrigins = async () => {
  //       const results = await searchCities(originInput);
  //       setOriginResults(results);
  //     };
  //     fetchOrigins();
  //   } else {
  //     setOriginResults([]);
  //   }
  // }, [originInput]);

  // useEffect(() => {
  //   if (destInput) {
  //     const fetchDests = async () => {
  //       const results = await searchCities(destInput);
  //       setDestResults(results);
  //     };
  //     fetchDests();
  //   } else {
  //     setDestResults([]);
  //   }
  // }, [destInput]);


  // Pour l'origine
useEffect(() => {
  const timer = setTimeout(() => {
    if (originInput.length >= 3) { // On cherche seulement à partir de 3 lettres
      const fetchOrigins = async () => {
        const results = await searchCities(originInput);
        setOriginResults(results);
      };
      fetchOrigins();
    } else {
      setOriginResults([]);
    }
  }, 500); // Attends 500ms après que l'utilisateur arrête de taper

  return () => clearTimeout(timer);
}, [originInput]);

// Même chose pour la destination
useEffect(() => {
  const timer = setTimeout(() => {
    if (destInput.length >= 3) {
      const fetchDests = async () => {
        const results = await searchCities(destInput);
        setDestResults(results);
      };
      fetchDests();
    } else {
      setDestResults([]);
    }
  }, 500);

  return () => clearTimeout(timer);
}, [destInput]);

  const handleSwap = () => {
    const tempOrigin = origin;
    const tempOriginDisplay = originDisplay;
    setOrigin(destination);
    setOriginDisplay(destDisplay);
    setDestination(tempOrigin);
    setDestDisplay(tempOriginDisplay);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

    return { daysInMonth, startingDayOfWeek };
  };

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return "";
    return `${date.getDate()} ${MONTHS_FR[date.getMonth()].slice(0, 3)}`;
  };

  const formatFullDateDisplay = () => {
    if (!departureDate) return "Sélectionner les dates";
    if (tripType === "return" && returnDate) {
      return `${formatDateDisplay(departureDate)} - ${formatDateDisplay(
        returnDate
      )}`;
    }
    return formatDateDisplay(departureDate);
  };

  const isDateInRange = (date: Date) => {
    if (!departureDate || !returnDate) return false;
    return date >= departureDate && date <= returnDate;
  };

  const isSameDay = (date1: Date | null, date2: Date) => {
    if (!date1) return false;
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  // Remplace ta fonction handleDateClick par ÇA :
  const handleDateClick = (day: number, monthOffset: number = 0) => {
    // CRUCIAL : on utilise UTC pour éviter le décalage horaire
    const selectedDate = new Date(
      Date.UTC(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + monthOffset,
        day
      )
    );

    if (selectingDateType === "departure" || tripType === "oneway") {
      setDepartureDate(selectedDate);
      if (tripType === "return") {
        setSelectingDateType("return");
        if (returnDate && returnDate < selectedDate) {
          setReturnDate(null);
        }
      } else {
        setShowCalendar(false);
      }
    } else {
      if (departureDate && selectedDate >= departureDate) {
        setReturnDate(selectedDate);
        setShowCalendar(false);
        setSelectingDateType("departure");
      }
    }
  };

  const renderCalendarMonth = (monthOffset: number = 0) => {
    const displayMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + monthOffset,
      1
    );
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(displayMonth);
    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-10" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(
        displayMonth.getFullYear(),
        displayMonth.getMonth(),
        day
      );
      const isToday = isSameDay(new Date(), currentDate);
      const isDeparture = isSameDay(departureDate, currentDate);
      const isReturn = isSameDay(returnDate, currentDate);
      const inRange = isDateInRange(currentDate);
      const isPast = currentDate < new Date(new Date().setHours(0, 0, 0, 0));
      const isDisabled =
        isPast ||
        (selectingDateType === "return" &&
          departureDate &&
          currentDate < departureDate);

      days.push(
        <button
          key={day}
          onClick={() => !isDisabled && handleDateClick(day, monthOffset)}
          disabled={isDisabled}
          className={`h-10 flex items-center justify-center rounded-lg text-sm transition-all
            ${
              isDisabled
                ? "text-gray-300 cursor-not-allowed"
                : "hover:bg-orange-50 cursor-pointer"
            }
            ${
              isDeparture || isReturn
                ? "bg-orange-500 text-white font-semibold hover:bg-orange-600"
                : ""
            }
            ${
              inRange && !isDeparture && !isReturn
                ? "bg-orange-100 text-orange-900"
                : ""
            }
            ${
              isToday && !isDeparture && !isReturn
                ? "border-2 border-orange-500"
                : ""
            }
          `}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const handleSearch = () => {
    if (!origin || !destination || !departureDate) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (tripType === "return" && !returnDate) {
      alert("Veuillez sélectionner une date de retour");
      return;
    }

    setIsLoading(true);

    const params = {
      origin,
      destination,
      departureDate: departureDate
        ? departureDate.toISOString().split("T")[0]
        : "",
      returnDate: returnDate
        ? returnDate.toISOString().split("T")[0]
        : undefined,
      adults,
      children,
      babies,
      travelClass,
      tripType,
      direct,
      baggage,
      refundable,
    };

    onSearch(params);

    setTimeout(() => setIsLoading(false), 1000);
  };

  useEffect(() => {
    if (initialParams?.origin && initialParams?.destination) {
      // Affiche correctement : "ALG → PAR" et non "PAR → ALG"
      setOriginDisplay(`${initialParams.origin}  (${initialParams.origin})`);
      setDestDisplay(
        `${initialParams.destination} (${initialParams.destination})`
      );
    }
  }, [initialParams]);

  return (
    <div className="w-full max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl p-4 md:p-8">
      {/* Trip Type Selection */}
      <div className="flex gap-2 mb-6">
        <button
          className={`flex-1 min-w-[120px] px-4 md:px-6 py-2.5 rounded-xl font-medium transition-all ${
            tripType === "oneway"
              ? "bg-orange-500 text-white shadow-md"
              : "bg-gray-100 text-gray-700"
          }`}
          onClick={() => setTripType("oneway")}
        >
          Aller simple
        </button>
        <button
          className={`flex-1 min-w-[120px] px-4 md:px-6 py-2.5 rounded-xl font-medium transition-all ${
            tripType === "return"
              ? "bg-orange-500 text-white shadow-md"
              : "bg-gray-100 text-gray-700"
          }`}
          onClick={() => setTripType("return")}
        >
          Aller-retour
        </button>
        <button
          className={`flex-1 min-w-[80px] px-4 md:px-6 py-2.5 rounded-xl font-medium transition-all ${
            tripType === "multi"
              ? "bg-orange-500 text-white shadow-md"
              : "bg-gray-100 text-gray-700"
          }`}
          onClick={() => setTripType("multi")}
        >
          Multi
        </button>
      </div>

      {/* Search Fields Container */}
      <div className="bg-gray-50 rounded-2xl p-3 md:p-6 mb-4">
        <div className="grid grid-cols-1 gap-3 mb-4">
          {/* Origin and Destination Row on Mobile, Grid on Desktop */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Origin */}
            <div className="relative md:col-span-5 bg-white rounded-xl">
              <div className="p-3 md:p-4">
                <label className="block text-xs text-gray-500 mb-1">
                  D'où partez-vous ?
                </label>
                <div className="relative">
                  <Plane className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-orange-500" />
                  <input
                    type="text"
                    placeholder="Alger (ALG)"
                    value={originInput || originDisplay}
                    onChange={(e) => {
                      setOriginInput(e.target.value);
                      setOriginDisplay("");
                    }}
                    className="w-full pl-6 md:pl-7 font-semibold text-sm md:text-base text-gray-900 bg-transparent outline-none"
                  />
                </div>
              </div>
              {originResults.length > 0 && (
                <ul className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl mt-1 max-h-48 md:max-h-60 overflow-auto shadow-xl">
                  {originResults.map((city) => (
                    <li
                      key={city.id}
                      onClick={() => {
                        setOrigin(city.iataCode);
                        setOriginDisplay(
                          `${city.address.cityName} (${city.iataCode})`
                        );
                        setOriginInput("");
                        setOriginResults([]);
                      }}
                      className="px-3 md:px-4 py-2 md:py-3 hover:bg-orange-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <TicketPlus className="w-4 h-4 md:w-5 md:h-5 text-orange-500 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-sm md:text-base text-gray-900">
                            {city.iataCode}
                          </div>
                          <div className="text-xs md:text-sm text-gray-600">
                            {city.name}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Swap Button */}
            <div className="flex items-center justify-center md:col-span-2">
              <button
                onClick={handleSwap}
                className="p-2 md:p-3 rounded-full bg-white hover:bg-gray-100 transition-colors shadow-sm"
              >
                <ArrowLeftRight className="w-5 h-5 text-orange-600" />
              </button>
            </div>

            {/* Destination */}
            <div className="relative md:col-span-5 bg-white rounded-xl">
              <div className="p-3 md:p-4">
                <label className="block text-xs text-gray-500 mb-1">
                  Où allez-vous ?
                </label>
                <div className="relative">
                  <Plane className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-orange-500" />
                  <input
                    type="text"
                    placeholder="Istanbul (IST)"
                    value={destInput || destDisplay}
                    onChange={(e) => {
                      setDestInput(e.target.value);
                      setDestDisplay("");
                    }}
                    className="w-full pl-6 md:pl-7 font-semibold text-sm md:text-base text-gray-900 bg-transparent outline-none"
                  />
                </div>
              </div>
              {destResults.length > 0 && (
                <ul className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl mt-1 max-h-48 md:max-h-60 overflow-auto shadow-xl">
                  {destResults.map((city) => (
                    <li
                      key={city.id}
                      onClick={() => {
                        setDestination(city.iataCode);
                        setDestDisplay(
                          `${city.address.cityName} (${city.iataCode})`
                        );
                        setDestInput("");
                        setDestResults([]);
                      }}
                      className="px-3 md:px-4 py-2 md:py-3 hover:bg-orange-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <TicketPlus className="w-4 h-4 md:w-5 md:h-5 text-orange-500 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-sm md:text-base text-gray-900">
                            {city.iataCode}
                          </div>
                          <div className="text-xs md:text-sm text-gray-600">
                            {city.name}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Date, Passengers, and Class Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Date Picker */}
            <div
              className="relative md:col-span-4 bg-white rounded-xl"
              ref={calendarRef}
            >
              <div
                className="p-3 md:p-4 cursor-pointer"
                onClick={() => {
                  setShowCalendar(!showCalendar);
                  setSelectingDateType("departure");
                }}
              >
                <label className="block text-xs text-gray-500 mb-1">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-orange-500" />
                  <div className="pl-6 md:pl-7 font-semibold text-sm md:text-base text-gray-900">
                    {formatFullDateDisplay()}
                  </div>
                </div>
              </div>

              {/* Calendar Dropdown */}
              {showCalendar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20">
                  {/* Fond sombre semi-transparent */}
                  <div
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto overflow-hidden"
                    onClick={(e) => e.stopPropagation()} // Empêche la fermeture au clic sur le calendrier
                  >
                    {/* En-tête avec titre et flèches */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                      <button
                        onClick={() =>
                          setCurrentMonth(
                            new Date(
                              currentMonth.getFullYear(),
                              currentMonth.getMonth() - 1
                            )
                          )
                        }
                        className="p-2 hover:bg-gray-100 rounded-full transition"
                      >
                        <ChevronLeft className="w-6 h-6 text-orange-600" />
                      </button>

                      <h3 className="text-xl font-bold text-gray-900">
                        {MONTHS_FR[currentMonth.getMonth()]}{" "}
                        {currentMonth.getFullYear()}
                      </h3>

                      <button
                        onClick={() =>
                          setCurrentMonth(
                            new Date(
                              currentMonth.getFullYear(),
                              currentMonth.getMonth() + 1
                            )
                          )
                        }
                        className="p-2 hover:bg-gray-100 rounded-full transition"
                      >
                        <ChevronRight className="w-6 h-6 text-orange-600" />
                      </button>
                    </div>

                    {/* Corps du calendrier */}
                    <div className="p-4">
                      {/* Jours de la semaine */}
                      <div className="grid grid-cols-7 gap-1 mb-3">
                        {DAYS_FR.map((day) => (
                          <div
                            key={day}
                            className="h-10 flex items-center justify-center text-xs font-semibold text-gray-600 uppercase tracking-wider"
                          >
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Jours du mois */}
                      <div className="grid grid-cols-7 gap-1">
                        {renderCalendarMonth(0)}
                      </div>
                    </div>

                    {/* Bouton Fermer (mobile + desktop) */}
                    <div className="p-4 border-t border-gray-100">
                      <button
                        onClick={() => setShowCalendar(false)}
                        className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Passengers */}
            <div
              className="relative md:col-span-4 bg-white rounded-xl"
              ref={passengerRef}
            >
              <div
                className="p-3 md:p-4 cursor-pointer"
                onClick={() => setShowPassengerDropdown(!showPassengerDropdown)}
              >
                <label className="block text-xs text-gray-500 mb-1">
                  Passagers
                </label>
                <div className="relative">
                  <Users className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-orange-500" />
                  <div className="pl-6 md:pl-7 font-semibold text-sm md:text-base text-gray-900">
                    {adults + children + babies} Passager
                    {adults + children + babies > 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              {showPassengerDropdown && (
                <div className="absolute z-20 w-full md:w-64 left-0 md:left-auto top-full mt-2 bg-white border border-gray-200 rounded-xl p-4 shadow-xl">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Adultes</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAdults(Math.max(1, adults - 1));
                          }}
                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-semibold"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-semibold">
                          {adults}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAdults(adults + 1);
                          }}
                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-semibold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Enfants</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setChildren(Math.max(0, children - 1));
                          }}
                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-semibold"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-semibold">
                          {children}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setChildren(children + 1);
                          }}
                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-semibold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Bébés</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBabies(Math.max(0, babies - 1));
                          }}
                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-semibold"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-semibold">
                          {babies}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBabies(babies + 1);
                          }}
                          className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-semibold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Class */}
            <div className="md:col-span-4 bg-white rounded-xl">
              <div className="p-3 md:p-4">
                <label className="block text-xs text-gray-500 mb-1">
                  Classe
                </label>
                <select
                  value={travelClass}
                  onChange={(e) => setTravelClass(e.target.value)}
                  className="w-full font-semibold text-sm md:text-base text-gray-900 bg-transparent outline-none cursor-pointer"
                >
                  <option value="ECONOMY">Économique</option>
                  <option value="PREMIUM_ECONOMY">Premium</option>
                  <option value="BUSINESS">Affaires</option>
                  <option value="FIRST">Première</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Flight Options */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer group">
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                direct
                  ? "border-orange-500 bg-orange-500"
                  : "border-gray-300 bg-white"
              }`}
            >
              {direct && (
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
              checked={direct}
              onChange={(e) => setDirect(e.target.checked)}
              className="sr-only"
            />
            <span className="text-gray-700 group-hover:text-gray-900">
              Vol direct
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm cursor-pointer group">
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                baggage
                  ? "border-orange-500 bg-orange-500"
                  : "border-gray-300 bg-white"
              }`}
            >
              {baggage && (
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
              checked={baggage}
              onChange={(e) => setBaggage(e.target.checked)}
              className="sr-only"
            />
            <span className="text-gray-700 group-hover:text-gray-900">
              Avec bagages
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm cursor-not-allowed opacity-50">
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white flex items-center justify-center">
              {refundable && (
                <svg
                  className="w-3 h-3 text-gray-400"
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
              checked={refundable}
              onChange={(e) => setRefundable(e.target.checked)}
              disabled
              className="sr-only"
            />
            <span className="text-gray-500">Remboursable</span>
          </label>
        </div>
      </div>

      {/* Search Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="px-10 py-3.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all disabled:bg-gray-400 font-semibold text-lg shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          {isLoading ? "Recherche..." : "Rechercher"}
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
