import { SignIn } from "@clerk/nextjs";
import Image from "next/image";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* Floating accent shapes */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-32 left-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <Image
            src="/tsp-logo.png"
            alt="Town Square Publications"
            width={270}
            height={40}
            className="brightness-0 invert mb-4"
          />
          <p className="text-sm text-blue-200/60 tracking-wide">
            townsquarepublications.com
          </p>
        </div>

        <div className="relative z-10 space-y-8">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Slice &amp; Dice
            <br />
            Your Data.
          </h1>
          <p className="text-lg text-blue-100/80 max-w-md leading-relaxed">
            AI-powered aging report analytics built by AISymmetric. See every
            invoice, every rep, every dollar — in real time.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3">
            {[
              "Aging Buckets",
              "Rep Performance",
              "Collection Rates",
              "Excel Export",
              "Snapshot History",
            ].map((feature) => (
              <span
                key={feature}
                className="px-3 py-1.5 text-xs font-medium bg-white/10 border border-white/10 rounded-full backdrop-blur-sm"
              >
                {feature}
              </span>
            ))}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-6 pt-4">
            <div>
              <p className="text-3xl font-bold text-cyan-400">5,200+</p>
              <p className="text-xs text-blue-200/50 mt-1">Invoices Tracked</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-cyan-400">30+</p>
              <p className="text-xs text-blue-200/50 mt-1">Sales Reps</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-cyan-400">Real-time</p>
              <p className="text-xs text-blue-200/50 mt-1">Analytics</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3 text-xs text-blue-200/40">
          <span>Powered by</span>
          <span className="font-semibold text-blue-200/60">
            AISymmetric Solutions
          </span>
          <span className="mx-1">|</span>
          <span>aisymmetricsolutions.com</span>
        </div>
      </div>

      {/* Right panel — sign in */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-8">
        {/* Mobile logo (hidden on lg+) */}
        <div className="lg:hidden mb-8 text-center">
          <Image
            src="/tsp-logo.png"
            alt="Town Square Publications"
            width={270}
            height={40}
            className="mx-auto mb-3"
          />
          <p className="text-sm text-gray-500">
            Slice &amp; Dice Your Data with AISymmetric
          </p>
        </div>

        <SignIn />

        <p className="mt-8 text-xs text-gray-400 text-center max-w-xs">
          Town Square Publications AR Dashboard
          <br />
          Built by AISymmetric Solutions
        </p>
      </div>
    </div>
  );
}
