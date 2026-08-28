import { useEffect, useState } from "react";
import { ArrowRight, Car, Check, FileText } from "lucide-react";

export function PdfReportMockup() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`relative transition-all duration-700 ${visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"}`}
    >
      <div className="absolute -inset-4 bg-gradient-to-br from-primary/5 to-transparent rounded-[2rem] blur-2xl" />

      <div
        className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col"
        style={{ aspectRatio: "0.7" }}
      >
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Relevé IK</p>
                <p className="text-xs text-gray-500">Décembre 2026</p>
              </div>
            </div>
            <img
              src="/logo-iktracker-250.webp"
              alt="IKtracker"
              width={24}
              height={24}
              className="h-6 w-6 opacity-60"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>

        <div className="p-6 space-y-5 flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Distance totale</p>
              <p className="text-lg font-bold text-gray-900">1 247 km</p>
            </div>
            <div className="bg-primary/5 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Indemnités</p>
              <p className="text-lg font-bold text-primary">687,50 €</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white shadow-xs flex items-center justify-center">
                <Car className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Peugeot 308</p>
                <p className="text-xs text-gray-500">5 CV fiscaux • AB-123-CD</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-1">
              Derniers trajets
            </p>
            {[
              { date: "18 déc", from: "Paris", to: "Lyon", km: "465 km" },
              { date: "15 déc", from: "Lyon", to: "Marseille", km: "315 km" },
              { date: "12 déc", from: "Marseille", to: "Nice", km: "198 km" },
            ].map((trip, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 shadow-xs border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-12">{trip.date}</span>
                  <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <span>{trip.from}</span>
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <span>{trip.to}</span>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900">{trip.km}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Total à déclarer</span>
            <span className="text-xl font-bold text-primary">687,50 €</span>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <img
              src="/logo-iktracker-250.webp"
              alt="IKtracker"
              width={20}
              height={20}
              className="h-5 opacity-50"
              loading="lazy"
              decoding="async"
            />
            <p className="text-xs text-gray-400">
              Simplifiez vos IK • <span className="text-primary">iktracker.fr</span>
            </p>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-3 -right-3 bg-green-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium">
        <Check className="h-4 w-4" />
        Conforme fiscal
      </div>
    </div>
  );
}

export default PdfReportMockup;
