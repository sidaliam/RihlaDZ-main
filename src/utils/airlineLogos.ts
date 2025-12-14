

import airAlgerieLogo from "../images/air-algerie.png";
import airFranceLogo from "../images/air-france.png";
import turkishLogo from "../images/Turkish-Airlines.png";
import itaAirwaysLogo from "../images/ITA-Airways.png";
import lufthansaLogo from "../images/lufthansa.png";
import qatarLogo from "../images/Qatar-Airways.png";
import emiratesLogo from "../images/Emirates.png";
import vuelingLogo from "../images/Vueling-Airlines-Logo.png";
import malaysiaLogo from "../images/malaysia airlines.png";
import aslairlines from "../images/logo_asl.png"

const airlineLogosMap: { [key: string]: string } = {
  AH: airAlgerieLogo,
  AF: airFranceLogo,
  TK: turkishLogo,
  AZ: itaAirwaysLogo,
  LH: lufthansaLogo,
  QR: qatarLogo,
  EK: emiratesLogo,
  VY: vuelingLogo,
  MH: malaysiaLogo,
  "5O": aslairlines,
  // IB: iberiaLogo,
  // U2: easyjetLogo,
};

export const getAirlineLogo = (iataCode: string): string => {
  return airlineLogosMap[iataCode.toUpperCase()] || "";
};