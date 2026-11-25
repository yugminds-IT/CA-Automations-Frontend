import { useEffect } from "react"

/** Turns on the logged-in app's larger type scale and font (body.app-ui, see globals.css). */
export function useAppUi() {
  useEffect(() => {
    document.body.classList.add("app-ui")
    return () => document.body.classList.remove("app-ui")
  }, [])
}
