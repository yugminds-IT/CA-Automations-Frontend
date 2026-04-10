"use client";
import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Testimonial {
  quote: string;
  name: string;
  designation: string;
  src: string;
}
interface Colors {
  name?: string;
  designation?: string;
  testimony?: string;
  arrowBackground?: string;
  arrowForeground?: string;
  arrowHoverBackground?: string;
}
interface FontSizes {
  name?: string;
  designation?: string;
  quote?: string;
}
interface CircularTestimonialsProps {
  testimonials: Testimonial[];
  autoplay?: boolean;
  colors?: Colors;
  fontSizes?: FontSizes;
}

function calculateGap(width: number) {
  const minWidth = 1024;
  const maxWidth = 1456;
  const minGap = 60;
  const maxGap = 86;
  if (width <= minWidth) return minGap;
  if (width >= maxWidth)
    return Math.max(minGap, maxGap + 0.06018 * (width - maxWidth));
  return minGap + (maxGap - minGap) * ((width - minWidth) / (maxWidth - minWidth));
}

export const CircularTestimonials = ({
  testimonials,
  autoplay = true,
  colors = {},
  fontSizes = {},
}: CircularTestimonialsProps) => {
  const colorName = colors.name ?? "var(--foreground)";
  const colorDesignation = colors.designation ?? "var(--muted-foreground)";
  const colorTestimony = colors.testimony ?? "var(--muted-foreground)";
  const colorArrowBg = colors.arrowBackground ?? "var(--primary)";
  const colorArrowFg = colors.arrowForeground ?? "var(--primary-foreground)";
  const colorArrowHoverBg =
    colors.arrowHoverBackground ?? "color-mix(in srgb, var(--primary) 80%, transparent)";
  const fontSizeName = fontSizes.name ?? "1.5rem";
  const fontSizeDesignation = fontSizes.designation ?? "0.925rem";
  const fontSizeQuote = fontSizes.quote ?? "1.125rem";

  const [activeIndex, setActiveIndex] = useState(0);
  const [hoverPrev, setHoverPrev] = useState(false);
  const [hoverNext, setHoverNext] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const autoplayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const testimonialsLength = useMemo(() => testimonials.length, [testimonials]);
  const activeTestimonial = useMemo(
    () => testimonials[activeIndex],
    [activeIndex, testimonials]
  );

  useEffect(() => {
    function handleResize() {
      if (imageContainerRef.current) {
        setContainerWidth(imageContainerRef.current.offsetWidth);
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (autoplay) {
      autoplayIntervalRef.current = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % testimonialsLength);
      }, 5000);
    }
    return () => {
      if (autoplayIntervalRef.current) clearInterval(autoplayIntervalRef.current);
    };
  }, [autoplay, testimonialsLength]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line
  }, [activeIndex, testimonialsLength]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % testimonialsLength);
    if (autoplayIntervalRef.current) clearInterval(autoplayIntervalRef.current);
  }, [testimonialsLength]);
  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + testimonialsLength) % testimonialsLength);
    if (autoplayIntervalRef.current) clearInterval(autoplayIntervalRef.current);
  }, [testimonialsLength]);

  function getImageStyle(index: number): React.CSSProperties {
    const gap = calculateGap(containerWidth);
    const maxStickUp = gap * 0.8;
    const isActive = index === activeIndex;
    const isLeft = (activeIndex - 1 + testimonialsLength) % testimonialsLength === index;
    const isRight = (activeIndex + 1) % testimonialsLength === index;
    if (isActive) {
      return {
        zIndex: 3,
        opacity: 1,
        pointerEvents: "auto",
        transform: `translateX(0px) translateY(0px) scale(1) rotateY(0deg)`,
        transition: "all 0.8s cubic-bezier(.4,2,.3,1)",
      };
    }
    if (isLeft) {
      return {
        zIndex: 2,
        opacity: 1,
        pointerEvents: "auto",
        transform: `translateX(-${gap}px) translateY(-${maxStickUp}px) scale(0.85) rotateY(15deg)`,
        transition: "all 0.8s cubic-bezier(.4,2,.3,1)",
      };
    }
    if (isRight) {
      return {
        zIndex: 2,
        opacity: 1,
        pointerEvents: "auto",
        transform: `translateX(${gap}px) translateY(-${maxStickUp}px) scale(0.85) rotateY(-15deg)`,
        transition: "all 0.8s cubic-bezier(.4,2,.3,1)",
      };
    }
    return {
      zIndex: 1,
      opacity: 0,
      pointerEvents: "none",
      transition: "all 0.8s cubic-bezier(.4,2,.3,1)",
    };
  }

  const quoteVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <div style={{ width: "100%", maxWidth: 1200, margin: "0 auto", padding: "0 1rem" }}>
      <div
        className="testimonial-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          alignItems: "center",
          gap: "2rem",
        }}
      >
        {/* Images */}
        <div
          ref={imageContainerRef}
          style={{
            position: "relative",
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            minHeight: 380,
            perspective: 1000,
          }}
        >
          {testimonials.map((testimonial, index) => (
            <img
              key={testimonial.src + index}
              src={testimonial.src}
              alt={testimonial.name}
              draggable={false}
              style={{
                position: index === activeIndex ? "relative" : "absolute",
                width: 320,
                height: 320,
                borderRadius: "1.5rem",
                objectFit: "cover",
                border: "4px solid var(--border)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
                ...getImageStyle(index),
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              variants={quoteVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={{ textAlign: "center" }}
            >
              <h3
                style={{
                  fontSize: fontSizeName,
                  fontWeight: 700,
                  color: colorName,
                  marginBottom: "0.25rem",
                }}
              >
                {activeTestimonial.name}
              </h3>
              <p
                style={{
                  fontSize: fontSizeDesignation,
                  color: colorDesignation,
                  marginBottom: "1rem",
                }}
              >
                {activeTestimonial.designation}
              </p>
              <p style={{ fontSize: fontSizeQuote, color: colorTestimony, lineHeight: 1.7 }}>
                {activeTestimonial.quote.split(" ").map((word, i) => (
                  <motion.span
                    key={i}
                    initial={{ filter: "blur(8px)", opacity: 0, y: 5 }}
                    animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut", delay: 0.02 * i }}
                    style={{ display: "inline-block", marginRight: "0.25em" }}
                  >
                    {word}{" "}
                  </motion.span>
                ))}
              </p>
            </motion.div>
          </AnimatePresence>
          <div
            className="arrow-buttons"
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "center",
              paddingTop: "0.5rem",
            }}
          >
            <button
              onClick={handlePrev}
              style={{
                width: 40,
                height: 40,
                borderRadius: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                cursor: "pointer",
                background: hoverPrev ? colorArrowHoverBg : colorArrowBg,
                color: colorArrowFg,
                transition: "all 0.2s",
              }}
              onMouseEnter={() => setHoverPrev(true)}
              onMouseLeave={() => setHoverPrev(false)}
              aria-label="Previous testimonial"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              onClick={handleNext}
              style={{
                width: 40,
                height: 40,
                borderRadius: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                cursor: "pointer",
                background: hoverNext ? colorArrowHoverBg : colorArrowBg,
                color: colorArrowFg,
                transition: "all 0.2s",
              }}
              onMouseEnter={() => setHoverNext(true)}
              onMouseLeave={() => setHoverNext(false)}
              aria-label="Next testimonial"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .testimonial-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .arrow-buttons {
            padding-top: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CircularTestimonials;
