"use client"

import { useState, useEffect } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns"
import { ChevronLeft, ChevronRight, Calendar, Filter, RefreshCw, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import BookingCalendar from "./booking-calendar"
import BookingDetails from "./booking-details"
import { useHotelContext } from "@/providers/hotel-provider"
import { useSession } from "next-auth/react"
import { generateMockBookings } from "./mock-data"

// Define TypeScript interfaces
export interface Guest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface Payment {
  amount: number;
  status: string;
  __typename: string;
  transactionId: string;
  transactionDate: string;
}

export interface RoomCharge {
  amount: number;
  chargeDate: string;
  chargeType: string;
  description: string;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  guest: Guest;
  checkInDate: string;
  checkOutDate: string;
  roomType: string;
  bookingStatus: string;
  paymentStatus: string;
  totalAmount: number;
  ratePlan?: string;
  payments?: Payment[];
  taxAmount?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  baseAmount?: number;
  roomCharges?: RoomCharge[];
  specialRequests?: string;
  cancellationDate?: string;
  cancellationReason?: string;
  roomId?: string;
  numberOfGuests: number;
  numberOfRooms?: number;
  roomNumber: string;  // Made required
  floor: number;       // Made required
  externalReference?: string;
  children?: number;
  pendingAmount?: number;
  notes?: string;
}

export interface Room {
  id: string;
  hotelId: string;
  roomNumber: string;
  roomType: string;
  bedType?: string;
  pricePerNight: number;
  status: string;
  amenities?: string[];
  isActive: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  __typename?: string;
  lastCleaned?: string;
  maxOccupancy?: number;
  baseOccupancy?: number;
  extraBedPrice?: number;
  lastMaintained?: string;
  extraBedAllowed?: boolean;
  maintenanceNotes?: string;
  floor: number;
  roomSize?: number;
  isPinned?: boolean;
  images?: string[];
}

export interface OccupancyData {
  date: Date;
  percentage: number;
  available: number;
}

export default function BookingAnalytics() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomDetails, setRoomDetails] = useState<Record<string, Room>>({})
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [showBookingDetails, setShowBookingDetails] = useState<boolean>(false)

  // Filter states
  const [selectedFloor, setSelectedFloor] = useState<string>("all")
  const [selectedRoomType, setSelectedRoomType] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  
  // Access hotel context and session
  const { selectedHotel } = useHotelContext()
  const { data: session } = useSession()
  const { toast } = useToast()

  useEffect(() => {
    if (selectedHotel?.id) {
      fetchBookings()
      fetchRooms()
    }
  }, [currentDate, selectedHotel])

  // Fetch detailed room information by ID
  const fetchRoomDetails = async (roomId: string): Promise<Room | null> => {
    try {
      const response = await fetch("https://nexus-backend-uts0.onrender.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(session as any)?.accessToken || ''}`
        },
        body: JSON.stringify({
          query: `
            query {
              room(roomId: "${roomId}") {
                id
                hotelId
                roomNumber
                roomType
                bedType
                pricePerNight
                status
                amenities
                description
                images
                isActive
                createdAt
                updatedAt
                lastCleaned
                maxOccupancy
                baseOccupancy
                extraBedPrice
                lastMaintained
                extraBedAllowed
                maintenanceNotes
                floor
                roomSize
              }
            }
          `
        }),
      })

      const result = await response.json()
      
      if (result.data && result.data.room) {
        return result.data.room as Room
      }
      return null
    } catch (error) {
      console.error(`Error fetching room details for ${roomId}:`, error)
      return null
    }
  }

  // Batch fetch room details for multiple bookings
  const fetchAllRoomDetails = async (bookingsData: Booking[]) => {
    // Get unique room IDs that need to be fetched
    const roomIds = [...new Set(bookingsData
      .filter(booking => booking.roomId && !roomDetails[booking.roomId])
      .map(booking => booking.roomId as string)
    )]

    if (roomIds.length === 0) return

    // Fetch details for each room and update the state
    const newRoomDetails = { ...roomDetails }
    
    await Promise.all(roomIds.map(async (roomId) => {
      const roomDetail = await fetchRoomDetails(roomId)
      if (roomDetail) {
        newRoomDetails[roomId] = roomDetail
      }
    }))

    setRoomDetails(newRoomDetails)
  }

  const fetchBookings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("https://nexus-backend-uts0.onrender.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(session as any)?.accessToken || ''}`
        },
        body: JSON.stringify({
          query: `
            query {
              bookings(
                hotelId: "${selectedHotel?.id}"
              ) {
                id
                bookingNumber
                guest {
                  firstName
                  lastName
                  email
                }
                checkInDate
                checkOutDate
                roomType
                bookingStatus
                paymentStatus
                totalAmount
                ratePlan
                payments {
                  amount
                  status
                  __typename
                  transactionId
                  transactionDate
                }
                taxAmount
                createdAt
                updatedAt
                createdBy
                updatedBy
                baseAmount
                roomCharges {
                  amount
                  chargeDate
                  chargeType
                  description
                }
                specialRequests
                cancellationDate
                cancellationReason
                roomId
                numberOfGuests
                numberOfRooms
                taxAmount
              }
            }
          `
        }),
      })

      const result = await response.json()
      
      if (result.data && result.data.bookings) {
        // Process bookings to include room information
        const bookingsData = result.data.bookings.map((booking: any) => {
          // If we already have room details cached, use them
          const room = booking.roomId && roomDetails[booking.roomId] 
            ? roomDetails[booking.roomId]
            : rooms.find(r => r.id === booking.roomId) || {
                roomNumber: "Unknown",
                floor: 1
              }

          // Ensure all required fields are present
          return {
            ...booking,
            roomNumber: room.roomNumber || "Unknown",
            floor: room.floor || 1,
            checkInDate: booking.checkInDate,
            checkOutDate: booking.checkOutDate,
            // Ensure these fields exist (even with default values) for type compatibility
            paymentStatus: booking.paymentStatus || "PENDING",
            totalAmount: booking.totalAmount || 0,
            numberOfGuests: booking.numberOfGuests || 1
          } as Booking
        })

        setBookings(bookingsData)
        
        // Fetch detailed room information for bookings
        await fetchAllRoomDetails(bookingsData)
      } else {
        console.error("Error fetching bookings: No data in response", result)
        // Fall back to mock data for development/testing
        const mockData = generateMockBookings(currentDate)
        // Ensure mock data includes all required fields
        const enhancedMockData = mockData.map(booking => ({
          ...booking,
          paymentStatus: booking.paymentStatus || "PENDING",
          totalAmount: booking.totalAmount || 0,
          numberOfGuests: booking.numberOfGuests || 1
        })) as Booking[]
        
        setBookings(enhancedMockData)
      }
    } catch (error) {
      console.error("Error fetching bookings:", error)
      toast({
        title: "Error",
        description: "Failed to fetch bookings. Using mock data instead.",
        variant: "destructive"
      })
      
      // Fall back to mock data with proper types
      const mockData = generateMockBookings(currentDate)
      const enhancedMockData = mockData.map(booking => ({
        ...booking,
        paymentStatus: "PENDING",
        totalAmount: booking.totalAmount || 0,
        numberOfGuests: booking.numberOfGuests || 1
      })) as Booking[]
      
      setBookings(enhancedMockData)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRooms = async () => {
    try {
      const response = await fetch("https://nexus-backend-uts0.onrender.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(session as any)?.accessToken || ''}`
        },
        body: JSON.stringify({
          query: `
            query {
              rooms(
                hotelId: "${selectedHotel?.id}"
                limit: 100
                offset: 0
              ) {
                id
                hotelId
                roomNumber
                roomType
                bedType
                pricePerNight
                status
                amenities
                isActive
                createdAt
                updatedAt
                __typename
                lastCleaned
                maxOccupancy
                baseOccupancy
                extraBedPrice
                lastMaintained
                extraBedAllowed
                maintenanceNotes
                floor
                roomSize
              }
            }
          `
        }),
      })

      const result = await response.json()
      
      if (result.data && result.data.rooms) {
        // Ensure all rooms have the required floor property
        const processedRooms = result.data.rooms.map((room: any) => ({
          ...room,
          floor: room.floor || 1
        }))
        setRooms(processedRooms)
        
        // Update booking room information with the latest data
        if (bookings.length > 0) {
          setBookings(bookings.map(booking => {
            if (booking.roomId) {
              const room = processedRooms.find((r: Room) => r.id === booking.roomId)
              if (room) {
                return {
                  ...booking,
                  roomNumber: room.roomNumber,
                  floor: room.floor
                }
              }
            }
            return booking
          }))
        }
      } else {
        console.error("Error fetching rooms: No data in response", result)
      }
    } catch (error) {
      console.error("Error fetching rooms:", error)
      toast({
        title: "Error",
        description: "Failed to fetch room information",
        variant: "destructive"
      })
    }
  }

  const handlePreviousMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() - 1)
    setCurrentDate(newDate)
  }

  const handleNextMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + 1)
    setCurrentDate(newDate)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking)
    setShowBookingDetails(true)
    
    // If the booking has a roomId but detailed info isn't loaded yet, fetch it
    if (booking.roomId && !roomDetails[booking.roomId]) {
      fetchRoomDetails(booking.roomId).then(room => {
        if (room) {
          setRoomDetails(prev => ({
            ...prev,
            [booking.roomId as string]: room
          }))
        }
      })
    }
  }

  const handleCloseDetails = () => {
    setShowBookingDetails(false)
    setSelectedBooking(null)
  }

  const handleRefresh = () => {
    fetchBookings()
    fetchRooms()
  }

  // Calculate days for the current month view
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Filter the bookings based on selected filters
  const filteredBookings = bookings.filter(booking => {
    // Apply floor filter
    if (selectedFloor !== "all") {
      if (booking.floor?.toString() !== selectedFloor) return false
    }
    
    // Apply room type filter
    if (selectedRoomType !== "all" && booking.roomType !== selectedRoomType) {
      return false
    }
    
    // Apply status filter
    if (selectedStatus !== "all" && booking.bookingStatus !== selectedStatus) {
      return false
    }
    
    return true
  })

  // Calculate occupancy percentages for each day
  const occupancyData: OccupancyData[] = daysInMonth.map((day) => {
    const dayBookings = filteredBookings.filter((booking) => {
      const checkIn = new Date(booking.checkInDate)
      const checkOut = new Date(booking.checkOutDate)
      return day >= checkIn && day <= checkOut
    })

    // Get total number of rooms from the API data or fallback to 20
    const totalRooms = rooms.length > 0 ? rooms.length : 20
    const occupiedRooms = dayBookings.length
    const percentage = Math.round((occupiedRooms / totalRooms) * 100)

    return {
      date: day,
      percentage,
      available: totalRooms - occupiedRooms,
    }
  })

  // Generate floors list based on available rooms
  const floors = [...new Set(rooms.map(room => room.floor))].sort((a, b) => a - b)
  
  // Generate room types list based on available rooms
  const roomTypes = [...new Set(rooms.map(room => room.roomType))]

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
          <div className="flex items-center border rounded-md p-1 ml-4">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Calendar className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="mb-8">
        <CardContent className="p-0">
          <div className="flex justify-between items-center p-4 border-b">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{format(currentDate, "MMM yyyy")}</h2>
              <Button variant="ghost" size="sm" onClick={handlePreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleToday}>
                Today
              </Button>
              <Button variant="ghost" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Floors</span>
                <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="All Floors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Floors</SelectItem>
                    {floors.map(floor => (
                      <SelectItem key={floor} value={floor.toString()}>Floor {floor}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Room Type</span>
                <Select value={selectedRoomType} onValueChange={setSelectedRoomType}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Room Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Room Types</SelectItem>
                    {roomTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Booking Status</span>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="CHECKED_IN">Checked In</SelectItem>
                    <SelectItem value="CHECKED_OUT">Checked Out</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <BookingCalendar
            bookings={filteredBookings}
            occupancyData={occupancyData}
            currentDate={currentDate}
            isLoading={isLoading}
            onBookingClick={handleBookingClick}
          />
        </CardContent>
      </Card>

      {showBookingDetails && selectedBooking && (
        <BookingDetails 
          booking={selectedBooking} 
          onClose={handleCloseDetails} 
          roomDetails={selectedBooking.roomId ? roomDetails[selectedBooking.roomId] : undefined}
        />
      )}
    </div>
  )
}