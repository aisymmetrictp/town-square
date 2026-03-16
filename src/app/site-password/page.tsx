"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock } from "lucide-react";

function Snowfall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const particles: { x: number; y: number; r: number; speed: number; drift: number; opacity: number }[] = [];

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // Create particles
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2.5 + 0.5,
        speed: Math.random() * 0.6 + 0.2,
        drift: Math.random() * 0.4 - 0.2,
        opacity: Math.random() * 0.5 + 0.15,
      });
    }

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const p of particles) {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx!.fill();

        p.y += p.speed;
        p.x += Math.sin(p.y * 0.01) * 0.3 + p.drift;

        if (p.y > canvas!.height + 5) {
          p.y = -5;
          p.x = Math.random() * canvas!.width;
        }
        if (p.x > canvas!.width + 5) p.x = -5;
        if (p.x < -5) p.x = canvas!.width + 5;
      }
      animationId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}

export default function SitePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/site-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Incorrect password");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6 relative overflow-hidden">
      <Snowfall />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <Image
            src="/tsp-logo.png"
            alt="Town Square Publications"
            width={220}
            height={33}
            className="mx-auto brightness-0 invert mb-4"
          />
          <p className="text-sm text-blue-200/50">Slice &amp; Dice Your Data</p>
        </div>

        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-5 h-5 text-slate-400" />
            <h1 className="text-lg font-semibold text-slate-800">
              Password Required
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter site password"
                autoFocus
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-slate-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {loading ? "Checking..." : "Enter"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-blue-200/30 mt-6">
          Powered by{" "}
          <a
            href="https://aisymmetricsolutions.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-200/50 hover:text-white transition-colors"
          >
            AISymmetric
          </a>
        </p>
      </div>
    </div>
  );
}
