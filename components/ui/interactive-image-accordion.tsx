"use client";

import React, { useState } from "react";

interface AccordionItemData {
  id: number;
  title: string;
  imageUrl: string;
}

interface AccordionItemProps {
  item: AccordionItemData;
  isActive: boolean;
  onMouseEnter: () => void;
}

const AccordionItem = ({ item, isActive, onMouseEnter }: AccordionItemProps) => {
  return (
    <div
      onMouseEnter={onMouseEnter}
      className={`relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-500 ease-in-out ${
        isActive ? "flex-[4]" : "flex-[0.8]"
      } h-full min-h-[140px]`}
    >
      <img
        src={item.imageUrl}
        alt={item.title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.onerror = null;
          target.src =
            "https://placehold.co/400x450/2d3748/ffffff?text=Image+Error";
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div
        className={`absolute bottom-0 left-0 right-0 p-4 md:p-6 transition-all duration-500 ${
          isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <span className="text-white font-semibold text-sm md:text-lg">
          {item.title}
        </span>
      </div>
    </div>
  );
};

export interface InteractiveImageAccordionProps {
  items: AccordionItemData[];
  defaultActiveIndex?: number;
}

export function InteractiveImageAccordion({
  items,
  defaultActiveIndex = 0,
}: InteractiveImageAccordionProps) {
  const [activeIndex, setActiveIndex] = useState(defaultActiveIndex);

  return (
    <div className="flex gap-2 md:gap-3 w-full h-full">
      {items.map((item, index) => (
        <AccordionItem
          key={item.id}
          item={item}
          isActive={activeIndex === index}
          onMouseEnter={() => setActiveIndex(index)}
        />
      ))}
    </div>
  );
}

export default InteractiveImageAccordion;
