"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent, useSpring } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Zap } from "lucide-react";

const DASHBOARD_IMG = "/landing-assets/dashboard-screenshot.png";

const RangoliBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    // Optimization: Render once at device pixel ratio for crispness
    // and rely on cheap CSS transforms for rotation rather than CPU recalculations.
    const dpr = window.devicePixelRatio || 1;
    const size = 800;
    cv.width = size * dpr;
    cv.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2, cy = size / 2;

    // Make canvas background transparent instead of black for layering
    ctx.clearRect(0, 0, size, size);

    // outer double border
    [238, 232].forEach((r, i) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r * (size/500), 0, Math.PI*2);
      ctx.strokeStyle = i===0 ? 'rgba(255,140,0,0.85)' : 'rgba(255,140,0,0.4)';
      ctx.lineWidth = i===0 ? 1.8 : 0.8;
      ctx.stroke();
    });

    const scale = size / 500;

    // 20 shell spirals
    function drawShell(angleDeg: number) {
      if (!ctx) return;
      const a = angleDeg * Math.PI / 180;
      const shellCx = cx + (196 * scale) * Math.cos(a);
      const shellCy = cy + (196 * scale) * Math.sin(a);
      for (let i = 9; i >= 1; i--) {
        const rx = i * 2.2 * scale;
        const ry = i * 3.0 * scale;
        ctx.save();
        ctx.translate(shellCx, shellCy);
        ctx.rotate(a + Math.PI/2);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(255,140,0,${0.35 + i*0.07})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
        ctx.restore();
      }
    }
    for (let i = 0; i < 20; i++) drawShell(i * 18);

    // hypotrochoid
    function drawHypo(R: number, r: number, d: number, steps: number, alpha: number, lw: number) {
      if (!ctx) return;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * Math.PI * 2 * r;
        const x = cx + ((R-r)*Math.cos(t) + d*Math.cos((R-r)*t/r)) * scale;
        const y = cy + ((R-r)*Math.sin(t) - d*Math.sin((R-r)*t/r)) * scale;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = `rgba(255,140,0,${alpha})`;
      ctx.lineWidth = lw;
      ctx.stroke();
    }

    drawHypo(155, 10, 118, 12000, 0.75, 0.6);
    drawHypo(155, 13, 115, 12000, 0.55, 0.5);
    drawHypo(150,  8, 118, 12000, 0.45, 0.5);
    drawHypo(105, 10,  80, 10000, 0.65, 0.55);
    drawHypo(105, 13,  78, 10000, 0.45, 0.5);

    // rose centre
    function drawRose(a: number, k: number, steps: number, alpha: number, lw: number) {
      if (!ctx) return;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = (i/steps)*Math.PI*2;
        const radius = a * Math.cos(k*t) * scale;
        const x = cx + radius*Math.cos(t);
        const y = cy + radius*Math.sin(t);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = `rgba(255,140,0,${alpha})`;
      ctx.lineWidth = lw;
      ctx.stroke();
    }

    for (let a = 58; a >= 8; a -= 4)  drawRose(a, 2, 3000, 0.3 + (58-a)*0.012, 0.6);
    for (let a = 55; a >= 10; a -= 6) drawRose(a, 2, 3000, 0.35, 0.5);

    // centre dot
    if (ctx) {
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5 * scale, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,140,0,0.95)';
      ctx.fill();
    }

  }, []);

  return (
    <motion.div
      className="absolute top-[20%] -translate-y-1/2 -left-[350px] w-[800px] h-[800px] opacity-[0.7] pointer-events-none z-0"
      animate={{ rotate: 360 }}
      transition={{ duration: 160, repeat: Infinity, ease: "linear" }}
    >
      <canvas ref={canvasRef} style={{ width: 800, height: 800 }} className="w-full h-full drop-shadow-[0_0_25px_rgba(255,140,0,0.5)]" />
    </motion.div>
  );
};

export default function HeroSection() {
  const router = useRouter();
  const goToContact = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isScrolledLayout, setIsScrolledLayout] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Track scroll progress within the high container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Switch alignment from Center to Left dynamically when scroll engages
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest > 0.05 && !isScrolledLayout) setIsScrolledLayout(true);
    if (latest <= 0.05 && isScrolledLayout) setIsScrolledLayout(false);
  });

  
  const alignStyles = isTablet
    ? "items-center text-left"
    : isScrolledLayout
      ? "items-start text-left"
      : "items-center text-center";
  const justifyStyles = isTablet ? "justify-center" : isScrolledLayout ? "justify-start" : "justify-center";

  const textX = useTransform(
    scrollYProgress,
    [0, 0.15, 0.35, 0.7],
    isMobile
      ? ["0%", "-10vw", "-40vw", "-120vw"]
      : isTablet
        ? ["0%", "-10vw", "-30vw", "-80vw"]
        : ["0%", "-20vw", "-60vw", "-120vw"]
  );
  const smoothTextX = useSpring(textX, {
    stiffness: 80,
    damping: 20,
    mass: 0.5,
  });
  const textY = useTransform(
    scrollYProgress,
    [0, 0.15, 0.35, 0.7],
    isMobile ? ["0vh", "0vh", "0vh", "-50vh"] : ["0vh", "0vh", "0vh", "0vh"]
  );
  const textOpacity = useTransform(scrollYProgress, [0, 0.15, 0.35, 0.6], [1, 1, 1, 0]);

  const scrollImageX = [0, 0.15, 0.35, 0.5, 0.65, 0.8] as const;
  const desktopImageX = ["-15%", "-15%", "-15%", "-28%", "-38%", "-50%"];
  const tabletImageX = ["-50%", "-50%", "-50%", "-50%", "-50%", "-50%"];
  const mobileImageX = ["-50%", "-50%", "-50%", "-50%", "-50%", "-50%"];

  const imageX = useTransform(
    scrollYProgress,
    [...scrollImageX],
    isMobile ? [...mobileImageX] : isTablet ? [...tabletImageX] : [...desktopImageX]
  );
  const imageY = useTransform(
    scrollYProgress,
    [0, 0.8],
    isMobile ? ["10vh", "10vh"] : isTablet ? ["-10%", "-10%"] : ["-50%", "-50%"]
  );

  const imageScale = useTransform(
    scrollYProgress,
    [0, 0.15, 0.35, 0.8],
    [
      0,
      isMobile ? 0.9 : isTablet ? 0.8 : 0.65,
      isMobile ? 0.9 : isTablet ? 0.8 : 0.65,
      1.05,
    ]
  );
  const imageOpacity = useTransform(scrollYProgress, [0, 0.1, 0.15], [0, 1, 1]);

  // Stack of background cards fade out seamlessly right before it expands
  const stackOpacity = useTransform(scrollYProgress, [0.4, 0.6], [1, 0]);

  // Static tilt that neutralizes as you scroll down
  const rotateX = useTransform(() => {
    const scroll = scrollYProgress.get();
    const scrollFactor = Math.max(0, 1 - scroll * 2.5);
    return 15 * scrollFactor;
  });

  const rotateY = useTransform(() => {
    const scroll = scrollYProgress.get();
    const scrollFactor = Math.max(0, 1 - scroll * 2.5);
    return -15 * scrollFactor;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }
    }
  };

  const wordVariants = {
    hidden: (i: number) => ({
      y: -80,
      opacity: 0,
      rotate: [-45, 60, -30, 50, -70, 20][i % 6], // Deterministic pseudo-random rotation
    }),
    visible: {
      y: 0,
      opacity: 1,
      rotate: 0,
      transition: {
        duration: 0.8,
        ease: [0.34, 1.3, 0.64, 1] as [number, number, number, number]
      }
    }
  };

  return (
    <section ref={containerRef} className="bg-[#fcfbfc] relative h-[250vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center pt-16">

        <RangoliBackground />

        <div
          className="w-full h-full max-w-[1500px] mx-auto flex flex-col md:flex-row items-start md:items-center pt-24 md:pt-8 lg:pt-0 relative px-4 md:px-8 lg:px-12"
          style={{ perspective: "1500px" }}
        >
          {/* Text Content */}
          <motion.div
            style={{ opacity: textOpacity, x: smoothTextX, y: textY }}
            className={`w-full mx-auto ${isTablet ? "md:max-w-2xl" : "md:w-[58%] lg:w-[48%]"} relative z-20`}
          >
            <motion.div
              layout
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className={`w-full flex flex-col gap-6 transition-all duration-[800ms] ease-out ${alignStyles}`}
            >
            <motion.div
              layout
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100 text-sm font-semibold w-fit shadow-sm"
            >
              <Zap className="w-4 h-4 fill-orange-500 stroke-none" /> Now with 7-day Free Trial
            </motion.div>

            <motion.h1 layout className={`text-5xl md:text-6xl lg:text-[5.5rem] font-extrabold tracking-tight text-foreground leading-[1.05] flex flex-col gap-y-1 transition-all duration-[800ms] ease-out ${alignStyles}`}>
              <motion.div layout className={`flex flex-wrap gap-x-4 transition-all duration-[800ms] ease-out w-full ${justifyStyles}`}>
                 <motion.span custom={0} variants={wordVariants} className="inline-block origin-center">Automate</motion.span>
                 <motion.span custom={1} variants={wordVariants} className="inline-block origin-center">Your</motion.span>
              </motion.div>
              <motion.div layout className={`flex flex-wrap gap-x-4 transition-all duration-[800ms] ease-out w-full ${justifyStyles}`}>
                 <motion.span custom={2} variants={wordVariants} className="inline-block origin-center">Client</motion.span>
              </motion.div>
              <motion.div
                layout
                custom={3}
                variants={wordVariants}
                className="inline-block origin-center text-orange-500 w-full"
              >
                Communication
              </motion.div>
            </motion.h1>

            <motion.p
              layout
              variants={itemVariants}
              className="text-lg md:text-xl text-muted-foreground w-full max-w-xl leading-relaxed mt-2"
            >
              AI-powered workflows for CAs, financial firms, and marketing teams. Save hours every week with smart email scheduling, client management, and document handling.
            </motion.p>

            <motion.div
              layout
              variants={itemVariants}
              className={`flex flex-col sm:flex-row gap-4 mt-6 transition-all w-full duration-[800ms] ease-out ${justifyStyles}`}
            >
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white gap-2 text-base px-8 h-14 shadow-lg rounded-xl transition-transform hover:scale-105" onClick={() => router.push("/login")}>
                Start Free Trial <ArrowRight className="w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" className="gap-2 text-base px-8 h-14 rounded-xl border border-zinc-200 bg-white transition-all hover:bg-muted" onClick={goToContact}>
                <Play className="w-5 h-5"/> Book a Demo
              </Button>
            </motion.div>
          </motion.div>
          </motion.div>

          {/* Dashboard Image Stack */}
          <motion.div
            style={{
              x: imageX,
              y: imageY,
              scale: imageScale,
              opacity: imageOpacity
            }}
            className="absolute top-1/2 left-1/2 origin-center z-10 w-full max-w-[90vw] sm:max-w-[70vw] md:max-w-[75vw] lg:max-w-6xl pointer-events-none"
          >
            {/* Transform wrapper */}
            <motion.div
              style={{
                rotateX,
                rotateY: isMobile ? 0 : rotateY,
              }}
              className="relative w-full h-full"
            >

              {/* Background Card 2 (Bottom layer) - fanned out wide right */}
              <motion.div
                style={{ opacity: stackOpacity }}
                className="absolute inset-0 z-0 origin-bottom-right"
                initial={{ rotate: 12, x: 45, y: 45, scale: 0.85 }}
                animate={{ rotate: 12, x: 45, y: 45, scale: 0.85 }}
              >
                <div className="rounded-[20px] md:rounded-[30px] border-2 border-border/50 bg-card p-2 md:p-4 shadow-xl h-full w-full">
                  <div className="overflow-hidden rounded-xl md:rounded-2xl h-full w-full">
                    <img src={DASHBOARD_IMG} alt="" className="w-full h-full object-cover object-left-top" />
                  </div>
                </div>
              </motion.div>

              {/* Background Card 1 (Middle layer) - fanned out wide left */}
              <motion.div
                style={{ opacity: stackOpacity }}
                className="absolute inset-0 z-10 origin-bottom-left"
                initial={{ rotate: -8, x: -35, y: 30, scale: 0.9 }}
                animate={{ rotate: -8, x: -35, y: 30, scale: 0.9 }}
              >
                <div className="rounded-[20px] md:rounded-[30px] border-2 border-border/60 bg-card p-2 md:p-4 shadow-xl h-full w-full">
                  <div className="overflow-hidden rounded-xl md:rounded-2xl h-full w-full">
                    <img src={DASHBOARD_IMG} alt="" className="w-full h-full object-cover object-left-top" />
                  </div>
                </div>
              </motion.div>

              {/* Main Dashboard Card (Top layer) */}
              <div className="relative z-20 w-full h-full rounded-[20px] md:rounded-[30px] border-4 border-border bg-card p-2 md:p-4 shadow-2xl dark:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.6)]">
                <div className="overflow-hidden rounded-xl md:rounded-2xl bg-muted h-full w-full pointer-events-none z-30 relative">
                  <img
                    src={DASHBOARD_IMG}
                    alt="Lekvya AI Automation Dashboard"
                    className="w-full h-full object-cover object-left-top"
                  />
                </div>
              </div>

            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
