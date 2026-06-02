// RatesX → AI Assistant. Plain-English Q&A over the rates warehouse, answered
// live by a tool-calling agent (no canned responses).

import { Header } from "@/components/Header";
import { RatesAssistant } from "@/components/rates-home/RatesAssistant";

export const dynamic = "force-dynamic";

export default function RatesAssistantPage() {
  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-no-repeat pointer-events-none"
        style={{ backgroundImage: "url(/iox-bg.png)", backgroundSize: "cover", backgroundPosition: "center" }}
      />
      <Header />
      <main className="flex-1 min-h-0 overflow-hidden">
        <RatesAssistant />
      </main>
    </>
  );
}
