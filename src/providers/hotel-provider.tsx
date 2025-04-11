"use client"

import React, { createContext, useState, useContext, useEffect } from "react"
import { useSession } from "next-auth/react"

export type Hotel = {
  id: string
  name: string
  description: string
  status: string
  amenities: string[]
  policies: {
    checkInTime: string
    checkOutTime: string
    petPolicy: string
  }
  images: string[]
  createdAt: string
  updatedAt: string
  floorCount: number
	roomCount : number
}

// Define the context type
type HotelContextType = {
  selectedHotel: Hotel | null
  setSelectedHotel: (hotel: Hotel) => void
  userHotels: Hotel[]
  setUserHotels: (hotels: Hotel[]) => void
  isLoading: boolean
  fetchUserHotels: () => Promise<void>
}

// Create the context with default values
const HotelContext = createContext<HotelContextType>({
  selectedHotel: null,
  setSelectedHotel: () => {},
  userHotels: [],
  setUserHotels: () => {},
  isLoading: true,
  fetchUserHotels: async () => {},
})

export function HotelProvider({ children }: { children: React.ReactNode }) {
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null)
  const [userHotels, setUserHotels] = useState<Hotel[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const { data: session, status } = useSession()
  


  // Function to fetch hotels for the current user
  const fetchUserHotels = async () => {
    // Debug information about session
    console.log("Session data:", session)
    console.log("Session status:", status)
    
    // Return early if not authenticated
    if (status !== "authenticated" || !session) {
      console.log("User not authenticated yet")
      setIsLoading(false)
      return
    }

    // Get user ID - check for multiple possible paths
    const userId = session?.user?.id || 
                  (session?.user as any)?.id || 
                  (session as any)?.userId
    
    if (!userId) {
      console.error("User ID not found in session:", session)
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    try {
      console.log("Fetching hotels for user ID:", userId)
      
      const response = await fetch("https://nexus-backend-uts0.onrender.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(session as any)?.accessToken || ''}`
        },
        body: JSON.stringify({
          query: `
            query {
              hotel {
                getHotelsByAdmin(adminId: "${userId}") {
                  id
                  name
                  description
                  status
                  amenities
                  policies {
                    checkInTime
                    checkOutTime
                    petPolicy
                  }
                  images
                  createdAt
                  updatedAt
                  floorCount
			            roomCount
                }
              }
            }
          `
        }),
      })

      const result = await response.json()
      console.log("GraphQL response:", result)
      
      if (result.errors) {
        throw new Error(result.errors[0].message || "Failed to fetch hotels")
      }

      if (!result.data || !result.data.hotel || !result.data.hotel.getHotelsByAdmin) {
        console.error("Unexpected response structure:", result)
        throw new Error("Unexpected API response structure")
      }

      const fetchedHotels = result.data.hotel.getHotelsByAdmin
      setUserHotels(fetchedHotels)

      // If no hotel is selected yet, select the first one
      if (!selectedHotel && fetchedHotels.length > 0) {
        setSelectedHotel(fetchedHotels[0])
      }
    } catch (error) {
      console.error("Error fetching hotels:", error)
      // Consider setting an error state here to show in the UI
    } finally {
      setIsLoading(false)
    }
  }

  // Load hotels when session is available
  useEffect(() => {
    // Only fetch hotels if the session is authenticated
    if (status === "authenticated" && session) {
      fetchUserHotels()
    }
  }, [session, status])

  // Try to load selected hotel from localStorage
  useEffect(() => {
    const storedHotel = localStorage.getItem("selectedHotel")
    if (storedHotel) {
      try {
        setSelectedHotel(JSON.parse(storedHotel))
      } catch (e) {
        console.error("Failed to parse stored hotel", e)
        localStorage.removeItem("selectedHotel")
      }
    }
  }, [])

  // Save selected hotel to localStorage when it changes
  useEffect(() => {
    if (selectedHotel) {
      localStorage.setItem("selectedHotel", JSON.stringify(selectedHotel))
    }
  }, [selectedHotel])

  return (
    <HotelContext.Provider
      value={{
        selectedHotel,
        setSelectedHotel,
        userHotels,
        setUserHotels,
        isLoading,
        fetchUserHotels,
      }}
    >
      {children}
    </HotelContext.Provider>
  )
}

// Custom hook to use the hotel context
export function useHotelContext() {
  const context = useContext(HotelContext)
  if (!context) {
    throw new Error("useHotelContext must be used within a HotelProvider")
  }
  return context
}