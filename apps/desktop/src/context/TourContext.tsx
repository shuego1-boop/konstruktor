import { createContext, useContext, useState, type ReactNode } from 'react'

type TourContextType = {
  run: boolean
  startTour: () => void
  stopTour: () => void
}

const TourContext = createContext<TourContextType>({
  run: false,
  startTour: () => {},
  stopTour: () => {},
})

export function TourProvider({ children }: { children: ReactNode }) {
  const [run, setRun] = useState(false)

  return (
    <TourContext.Provider value={{ run, startTour: () => setRun(true), stopTour: () => setRun(false) }}>
      {children}
    </TourContext.Provider>
  )
}

export function useTour() {
  return useContext(TourContext)
}
