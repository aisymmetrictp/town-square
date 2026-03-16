import { SignUp } from "@clerk/nextjs";
import Image from "next/image";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white flex-col justify-between p-12 relative overflow-hidden">
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

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Get Started
            <br />
            in Seconds.
          </h1>
          <p className="text-lg text-blue-100/80 max-w-md leading-relaxed">
            Join your team on the AISymmetric-powered AR dashboard. Track
            collections, monitor aging, and close the gap — faster.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 text-xs text-blue-200/40">
          <span>Powered by</span>
          <a
            href="https://aisymmetricsolutions.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-blue-200/60 hover:text-white transition-colors"
          >
            AISymmetric Solutions
          </a>
          <span className="mx-1">|</span>
          <a
            href="https://aisymmetricsolutions.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            aisymmetricsolutions.com
          </a>
        </div>
      </div>

      {/* Right panel — sign up */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-8">
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

        <SignUp />

        <p className="mt-8 text-xs text-gray-400 text-center max-w-xs">
          Town Square Publications AR Dashboard
          <br />
          Built by{" "}
          <a
            href="https://aisymmetricsolutions.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-700 underline"
          >
            AISymmetric Solutions
          </a>
        </p>
      </div>
    </div>
  );
}
