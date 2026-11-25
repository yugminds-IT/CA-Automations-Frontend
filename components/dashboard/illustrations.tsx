/**
 * 3D icons for the dashboard, from 3dicons (https://3dicons.co, CC0: free to use, no attribution needed).
 * "color" style, dynamic angle, 200px WebP in public/icons/3d. Decorative only: the text next to them says what they mean.
 */
import Image from "next/image"
import { cn } from "@/lib/utils"

const icon = (name: string) =>
  function Icon3D({ className }: { className?: string }) {
    return <Image src={`/icons/3d/${name}.webp`} alt="" aria-hidden width={200} height={200} className={cn("shrink-0 object-contain", className)} />
  }

export const Mail3D = icon("mail")
export const Calendar3D = icon("calendar")
export const Draft3D = icon("file-text")
export const Person3D = icon("person")
export const Sent3D = icon("forward")
export const Folder3D = icon("folder")
export const Clock3D = icon("clock")
