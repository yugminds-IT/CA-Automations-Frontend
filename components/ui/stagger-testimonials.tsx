"use client"

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const SQRT_5000 = Math.sqrt(5000);

const testimonials = [
  {
    tempId: 0,
    testimonial: "Lekvya has transformed how I handle client communication. I used to spend hours sending ITR reminders — now it's all automated.",
    by: "Rajesh Gupta, Chartered Accountant",
    imgSrc: "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=facearea&facepad=2&w=150&h=150&q=80"
  },
  {
    tempId: 1,
    testimonial: "The bulk email scheduler and template library save us at least 15 hours every week. It's a game changer.",
    by: "Priya Sharma, Director at FinServ Solutions",
    imgSrc: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=facearea&facepad=2&w=150&h=150&q=80"
  },
  {
    tempId: 2,
    testimonial: "We tried several platforms before Lekvya. The onboarding system and secure document management set it apart.",
    by: "Amit Patel, Marketing Manager",
    imgSrc: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=facearea&facepad=2&w=150&h=150&q=80"
  },
  {
    tempId: 3,
    testimonial: "I'm confident my clients' financial data is safe with Lekvya's secure portals. Best decision we've made this year.",
    by: "Neha Desai, Wealth Advisor",
    imgSrc: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=facearea&facepad=2&w=150&h=150&q=80"
  },
  {
    tempId: 4,
    testimonial: "Sending weekly market updates to 500+ clients took hours. With Lekvya, it takes exactly 5 minutes.",
    by: "Karan Singh, Financial Analyst",
    imgSrc: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=facearea&facepad=2&w=150&h=150&q=80"
  },
  {
    tempId: 5,
    testimonial: "The pre-built templates library is a lifesaver for our HR team. We got our organization set up in 10 minutes.",
    by: "Sneha Reddy, HR Head",
    imgSrc: "https://images.unsplash.com/photo-1598550874175-4d0ef436c909?auto=format&fit=facearea&facepad=2&w=150&h=150&q=80"
  },
  {
    tempId: 6,
    testimonial: "Seamlessly scaling our real-estate newsletter thanks to Lekvya. The ROI is easily 100x for us.",
    by: "Vikram Malhotra, Real Estate Broker",
    imgSrc: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=150&h=150&q=80"
  },
  {
    tempId: 7,
    testimonial: "I would be lost without Lekvya's in-depth tracking. Seeing exactly who opens our proposals is highly valuable.",
    by: "Ananya Rao, Agency Founder",
    imgSrc: "https://images.unsplash.com/photo-1586297135537-94bc9ba060aa?auto=format&fit=facearea&facepad=2&w=150&h=150&q=80"
  },
  {
    tempId: 8,
    testimonial: "Client document submission used to be a nightmare of scattered emails. Lekvya organized everything perfectly.",
    by: "Rahul Verma, Operations Lead",
    imgSrc: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=facearea&facepad=2&w=150&h=150&q=80"
  },
  {
    tempId: 9,
    testimonial: "Our team loves the collaborative features. We work 5x faster with Lekvya.",
    by: "Meera Nair, Startup COO",
    imgSrc: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=150&h=150&q=80"
  }
];

interface TestimonialCardProps {
  position: number;
  testimonial: typeof testimonials[0];
  handleMove: (steps: number) => void;
  cardSize: number;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({ 
  position, 
  testimonial, 
  handleMove, 
  cardSize 
}) => {
  const isCenter = position === 0;

  return (
    <div
      onClick={() => handleMove(position)}
      className={cn(
        "absolute left-1/2 top-1/2 cursor-pointer border-2 p-8 transition-all duration-500 ease-in-out",
        isCenter 
          ? "z-10 bg-primary text-primary-foreground border-primary" 
          : "z-0 bg-card text-card-foreground border-border hover:border-primary/50"
      )}
      style={{
        width: cardSize,
        height: cardSize,
        clipPath: `polygon(50px 0%, calc(100% - 50px) 0%, 100% 50px, 100% 100%, calc(100% - 50px) 100%, 50px 100%, 0 100%, 0 0)`,
        transform: `
          translate(-50%, -50%) 
          translateX(${(cardSize / 1.5) * position}px)
          translateY(${isCenter ? -65 : position % 2 ? 15 : -15}px)
          rotate(${isCenter ? 0 : position % 2 ? 2.5 : -2.5}deg)
        `,
        boxShadow: isCenter ? "0px 8px 0px 4px var(--border)" : "0px 0px 0px 0px transparent"
      }}
    >
      <span
        className="absolute block origin-top-right rotate-45 bg-border"
        style={{
          right: -2,
          top: 48,
          width: SQRT_5000,
          height: 2
        }}
      />
      <div 
        className={cn(
          "mb-4 h-14 w-14 bg-muted flex items-center justify-center",
          isCenter ? "bg-primary-foreground/10 text-primary-foreground" : "bg-muted text-muted-foreground"
        )}
        style={{
          boxShadow: "3px 3px 0px var(--background)"
        }}
      >
        <User className="w-7 h-7" />
      </div>
      <h3 className={cn(
        "text-base sm:text-xl font-medium",
        isCenter ? "text-primary-foreground" : "text-foreground"
      )}>
        "{testimonial.testimonial}"
      </h3>
      <p className={cn(
        "absolute bottom-8 left-8 right-8 mt-2 text-sm italic",
        isCenter ? "text-primary-foreground/80" : "text-muted-foreground"
      )}>
        - {testimonial.by}
      </p>
    </div>
  );
};

export const StaggerTestimonials: React.FC = () => {
  const [cardSize, setCardSize] = useState(365);
  const [testimonialsList, setTestimonialsList] = useState(testimonials);

  const handleMove = (steps: number) => {
    const newList = [...testimonialsList];
    if (steps > 0) {
      for (let i = steps; i > 0; i--) {
        const item = newList.shift();
        if (!item) return;
        newList.push({ ...item, tempId: Math.random() });
      }
    } else {
      for (let i = steps; i < 0; i++) {
        const item = newList.pop();
        if (!item) return;
        newList.unshift({ ...item, tempId: Math.random() });
      }
    }
    setTestimonialsList(newList);
  };

  useEffect(() => {
    const updateSize = () => {
      const { matches } = window.matchMedia("(min-width: 640px)");
      setCardSize(matches ? 365 : 290);
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden bg-background"
      style={{ height: 600 }}
    >
      {testimonialsList.map((testimonial, index) => {
        const position = testimonialsList.length % 2
          ? index - (testimonialsList.length + 1) / 2
          : index - testimonialsList.length / 2;
        return (
          <TestimonialCard
            key={testimonial.tempId}
            testimonial={testimonial}
            handleMove={handleMove}
            position={position}
            cardSize={cardSize}
          />
        );
      })}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        <button
          onClick={() => handleMove(-1)}
          className={cn(
            "flex h-14 w-14 items-center justify-center text-2xl transition-colors rounded-full",
            "bg-background border-2 border-border hover:bg-primary hover:text-primary-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
          aria-label="Previous testimonial"
        >
          <ChevronLeft />
        </button>
        <button
          onClick={() => handleMove(1)}
          className={cn(
            "flex h-14 w-14 items-center justify-center text-2xl transition-colors rounded-full",
            "bg-background border-2 border-border hover:bg-primary hover:text-primary-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
          aria-label="Next testimonial"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
};
