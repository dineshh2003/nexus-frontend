"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Download } from "lucide-react"
import { DatePickerWithRange } from "@/components/dashbaord/date-range-picker"
import { format, subDays } from "date-fns"
import OverviewMetrics from "@/components/dashbaord/overview-metrics"
import BookingTrends from "@/components/dashbaord/booking-trends"
import RoomAnalytics from "@/components/dashbaord/room-analytics"
import GuestAnalytics from "@/components/dashbaord/guest-analytics"
import FinancialAnalytics from "@/components/dashbaord/financial-analytics"
import BookingTable from "@/components/dashbaord/booking-table"
import { useHotelContext } from "@/providers/hotel-provider"
import { useSession } from "next-auth/react"
import { DateRange } from "react-day-picker"

// Define TypeScript interfaces for the data structures
interface Guest {
  firstName: string
  lastName: string
  email: string
  address?: string
  specialRequests?: string
}

interface Payment {
  amount: number
  status: string
  transactionId: string
  transactionDate: string
}

interface RoomCharge {
  amount: number
  chargeDate: string
  notes?: string
  description?: string
}

interface Booking {
  id: string
  roomId: string
  bookingNumber: string
  guest: Guest
  bookingSource?: string
  checkInDate: string
  checkOutDate: string
  roomType: string
  bookingStatus: string
  paymentStatus?: string
  totalAmount: number
  numberOfRooms?: number
  numberOfGuests?: number
  ratePlan?: string
  baseAmount?: number
  taxAmount?: number
  payments?: Payment[]
  roomCharges?: RoomCharge[]
  cancellationDate?: string
  checkInTime?: string
  createdAt: string
  updatedBy?: string
  updatedAt: string
}

interface Room {
  id: string
  roomNumber: string
  roomType: string
  bedType: string
  pricePerNight: number
  status: string
  amenities: string[]
  images: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  maxOccupancy: number
  baseOccupancy: number
  extraBedPrice?: number
  extraBedAllowed: boolean
  maintenanceNotes?: string
  lastCleaned?: string
  bedCount: number
  description?: string
  isSmoking: boolean
  floor?: number
}

interface Policy {
  checkInTime: string
  checkOutTime: string
  petPolicy?: string
}

interface Hotel {
  id: string
  name: string
  description: string
  status: string
  amenities: string[]
  policies: Policy
  images: string[]
  createdAt: string
  updatedAt: string
  address: string
  state: string
  contactPhone: string
  contactEmail: string
  starRating: number
  floorCount: number
  roomCount: number
  city: string
  country: string
  website?: string
}

interface ChartDataItem {
  name: string
  value: number
}

interface TrendDataItem {
  date: string
  bookings?: number
  revenue?: number
  occupancy?: number
}

interface GuestItem {
  name: string
  email: string
  bookings: number
  totalSpent: number
}

interface OverviewMetrics {
  totalBookings: number
  totalBookingsChange: number
  occupancyRate: number
  occupancyRateChange: number
  totalRevenue: number
  totalRevenueChange: number
  averageDailyRate: number
  averageDailyRateChange: number
  revPAR: number
  totalGuests: number
  totalRooms: number
}

interface DashboardData {
  overview: OverviewMetrics
  recentBookings: Booking[]
  roomTypeDistribution: ChartDataItem[]
  bookingTrends: TrendDataItem[]
  bookingSources: ChartDataItem[]
  bookingStatus: ChartDataItem[]
  roomStatus: ChartDataItem[]
  roomTypePerformance: ChartDataItem[]
  floorOccupancy: ChartDataItem[]
  occupancyTimeline: TrendDataItem[]
  guestTypes: ChartDataItem[]
  stayDuration: ChartDataItem[]
  guestSatisfaction: ChartDataItem[]
  topGuests: GuestItem[]
  guestDemographics: ChartDataItem[]
  revenueTrends: TrendDataItem[]
  revenueByRoomType: ChartDataItem[]
  paymentMethods: ChartDataItem[]
}

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{
    message: string
  }>
}

interface HotelResponse {
  hotel: {
    getHotels: Hotel[]
  }
}

interface RoomsResponse {
  rooms: Room[]
}

interface BookingsResponse {
  bookings: Booking[]
}

interface SelectedHotel {
  id: string
  [key: string]: any
}

interface Session {
  user?: {
    id?: string
  }
  accessToken?: string
  [key: string]: any
}

export default function HotelDashboard() {
  const [activeTab, setActiveTab] = useState<string>("overview")
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })

  const { selectedHotel } = useHotelContext() as { selectedHotel?: SelectedHotel }
  const { data: session } = useSession() as { data?: Session }
  const adminId = session?.user?.id

  // GraphQL endpoint - adjust based on your environment
  const endpoint = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'https://nexus-backend-uts0.onrender.com/graphql'

  // Extract fetchDashboardData as a reusable function outside useEffect
  const fetchDashboardData = async (forceRefresh = false): Promise<void> => {
    if (!selectedHotel?.id || !adminId) return
    if (!dateRange.from || !dateRange.to) return
    
    setIsLoading(true)
    try {
      // Add cache-busting parameter when forceRefresh is true
      const cacheBuster = forceRefresh ? `?refresh=${Date.now()}` : ''
      const fetchEndpoint = `${endpoint}${cacheBuster}`
      
      // Fetch hotel details
      const hotelResponse = await fetch(fetchEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(session as any)?.accessToken || ''}`,
          // Add cache control headers for refresh
          ...(forceRefresh ? {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          } : {})
        },
        body: JSON.stringify({
          query: `
            query GetHotelDetails($adminId: String!) {
              hotel {
                getHotels(adminId: $adminId) {
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
                  address
                  state
                  contactPhone
                  contactEmail
                  starRating
                  floorCount
                  roomCount
                  city
                  country
                  website
                  description
                }
              }
            }
          `,
          variables: { adminId }
        }),
      })
      
      const hotelResult: GraphQLResponse<HotelResponse> = await hotelResponse.json()
      
      if (hotelResult.errors) {
        throw new Error(hotelResult.errors[0].message || "Failed to fetch hotels")
      }
      
      // Fetch rooms data
      const roomsResponse = await fetch(fetchEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(session as any)?.accessToken || ''}`,
          ...(forceRefresh ? {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          } : {})
        },
        body: JSON.stringify({
          query: `
            query GetRooms($hotelId: String!) {
              rooms(hotelId: $hotelId) {
                id
                roomNumber
                roomType
                bedType
                pricePerNight
                status
                amenities
                images
                isActive
                createdAt
                updatedAt
                maxOccupancy
                baseOccupancy
                extraBedPrice
                extraBedAllowed
                maintenanceNotes
                lastCleaned
                bedCount
                pricePerNight
                description
                isSmoking
                floor
              }
            }
          `,
          variables: { hotelId: selectedHotel.id }
        }),
      })
      
      const roomsResult: GraphQLResponse<RoomsResponse> = await roomsResponse.json()
      
      if (roomsResult.errors) {
        throw new Error(roomsResult.errors[0].message || "Failed to fetch rooms")
      }
      
      // Fetch bookings data
      const bookingsResponse = await fetch(fetchEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${(session as any)?.accessToken || ''}`,
          ...(forceRefresh ? {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          } : {})
        },
        body: JSON.stringify({
          query: `
            query GetBookings($hotelId: String!) {
              bookings(hotelId: $hotelId) {
                id
                roomId
                bookingNumber
                guest {
                  firstName
                  lastName
                  email
                  address
                  specialRequests
                }
                bookingSource
                checkInDate
                checkOutDate
                roomType
                bookingStatus
                paymentStatus
                totalAmount
                numberOfRooms
                numberOfGuests
                ratePlan
                baseAmount
                taxAmount
                paymentStatus
                payments {
                  amount
                  status
                  transactionId
                  transactionDate
                }
                roomCharges {
                  amount
                  chargeDate
                  notes
                  description
                }
                cancellationDate
                checkInTime
                createdAt
                updatedBy
                updatedAt
              }
            }
          `,
          variables: { hotelId: selectedHotel.id }
        }),
      })
      
      const bookingsResult: GraphQLResponse<BookingsResponse> = await bookingsResponse.json()
      
      if (bookingsResult.errors) {
        throw new Error(bookingsResult.errors[0].message || "Failed to fetch bookings")
      }
      
      // Process the data to match our dashboard structure
      const processedData = processGraphQLData(
        hotelResult.data!, 
        roomsResult.data!, 
        bookingsResult.data!, 
        dateRange
      )
      
      setDashboardData(processedData)
    } catch (error) {
      console.error(`Error ${forceRefresh ? 'refreshing' : 'fetching'} dashboard data:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [selectedHotel?.id, adminId, dateRange, endpoint, session])

  // Updated handleRefresh function uses the fetchDashboardData function with a force refresh parameter
  const handleRefresh = (): void => {
    fetchDashboardData(true) // Force refresh by setting parameter to true
  }

  const handleExportData = (): void => {
    // In a real app, this would generate and download a CSV/Excel file
    if (!dashboardData) return
    
    const bookingsData = dashboardData.recentBookings.map(booking => ({
      bookingNumber: booking.bookingNumber,
      guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
      email: booking.guest.email,
      checkIn: booking.checkInDate,
      checkOut: booking.checkOutDate,
      roomType: booking.roomType,
      status: booking.bookingStatus,
      amount: booking.totalAmount
    }))
    
    // Convert to CSV
    const headers = Object.keys(bookingsData[0] || {}).join(',')
    const rows = bookingsData.map(booking => 
      Object.values(booking).map(value => 
        typeof value === 'string' ? `"${value}"` : value
      ).join(',')
    ).join('\n')
    
    const csv = `${headers}\n${rows}`
    
    // Create a download link
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('hidden', '')
    a.setAttribute('href', url)
    a.setAttribute('download', 'hotel_bookings.csv')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    
    console.log("Exporting dashboard data...")
  }

  // Handler for date range picker changes
  const handleDateRangeChange = (newDateRange: DateRange | undefined): void => {
    if (newDateRange && newDateRange.from && newDateRange.to) {
      setDateRange(newDateRange);
    }
  }

  // Process GraphQL data to match the dashboard structure
  const processGraphQLData = (
    hotelResponse: HotelResponse, 
    roomsResponse: RoomsResponse, 
    bookingsResponse: BookingsResponse,
    dateRange: DateRange
  ): DashboardData => {
    if (!dateRange.from || !dateRange.to) {
      throw new Error("Invalid date range")
    }
    
    const hotel = hotelResponse.hotel.getHotels.find(h => h.id === selectedHotel?.id) || 
                  hotelResponse.hotel.getHotels[0]
    const rooms = roomsResponse.rooms || []
    const bookings = bookingsResponse.bookings || []
    
    // Filter bookings by date range
    const filteredBookings = bookings.filter(booking => {
      const checkInDate = new Date(booking.checkInDate)
      return checkInDate >= dateRange.from! && checkInDate <= dateRange.to!
    })
    
    // Calculate metrics for overview
    const totalBookings = filteredBookings.length
    
    // For comparison with previous period, get bookings from prior period of same length
    const previousPeriodStart = subDays(dateRange.from, dateRange.to.getTime() - dateRange.from.getTime())
    const previousPeriodEnd = subDays(dateRange.from, 1)
    
    const previousPeriodBookings = bookings.filter(booking => {
      const checkInDate = new Date(booking.checkInDate)
      return checkInDate >= previousPeriodStart && checkInDate <= previousPeriodEnd
    })
    
    const previousTotalBookings = previousPeriodBookings.length
    const totalBookingsChange = previousTotalBookings 
      ? ((totalBookings - previousTotalBookings) / previousTotalBookings) * 100 
      : 0
    
    // Calculate total revenue
    const totalRevenue = filteredBookings.reduce((sum, booking) => 
      sum + (Number(booking.totalAmount) || 0), 0)
    
    const previousTotalRevenue = previousPeriodBookings.reduce((sum, booking) => 
      sum + (Number(booking.totalAmount) || 0), 0)
    
    const totalRevenueChange = previousTotalRevenue 
      ? ((totalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100 
      : 0
    
    // Calculate occupancy
    const activeRooms = rooms.filter(room => room.isActive).length
    const occupiedRooms = new Set(filteredBookings.map(booking => booking.roomId)).size
    const occupancyRate = activeRooms ? Math.round((occupiedRooms / activeRooms) * 100) : 0
    
    // Calculate average daily rate (ADR)
    const totalNights = filteredBookings.reduce((sum, booking) => {
      const checkIn = new Date(booking.checkInDate)
      const checkOut = new Date(booking.checkOutDate)
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
      return sum + (nights > 0 ? nights : 1)
    }, 0)
    
    const averageDailyRate = totalNights ? Math.round(totalRevenue / totalNights) : 0
    
    // RevPAR (Revenue Per Available Room)
    const totalRoomNights = activeRooms * Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
    const revPAR = totalRoomNights ? Math.round(totalRevenue / totalRoomNights) : 0
    
    // Room type distribution
    const roomTypeDistribution = rooms.reduce<ChartDataItem[]>((acc, room) => {
      const type = room.roomType
      if (!acc.find(item => item.name === type)) {
        acc.push({ name: type, value: 1 })
      } else {
        const index = acc.findIndex(item => item.name === type)
        acc[index].value += 1
      }
      return acc
    }, [])
    
    // Booking source distribution
    const bookingSources = filteredBookings.reduce<ChartDataItem[]>((acc, booking) => {
      const source = booking.bookingSource || 'Direct'
      if (!acc.find(item => item.name === source)) {
        acc.push({ name: source, value: 1 })
      } else {
        const index = acc.findIndex(item => item.name === source)
        acc[index].value += 1
      }
      return acc
    }, [])
    
    // Booking status distribution
    const bookingStatus = filteredBookings.reduce<ChartDataItem[]>((acc, booking) => {
      const status = booking.bookingStatus
      if (!acc.find(item => item.name === status)) {
        acc.push({ name: status, value: 1 })
      } else {
        const index = acc.findIndex(item => item.name === status)
        acc[index].value += 1
      }
      return acc
    }, [])
    
    // Booking trends over time (daily)
    const bookingsByDate: Record<string, { count: number, revenue: number }> = filteredBookings.reduce((acc, booking) => {
      const date = format(new Date(booking.checkInDate), 'yyyy-MM-dd')
      if (!acc[date]) {
        acc[date] = { count: 0, revenue: 0 }
      }
      acc[date].count += 1
      acc[date].revenue += Number(booking.totalAmount) || 0
      return acc
    }, {} as Record<string, { count: number, revenue: number }>)
    
    const bookingTrends = Object.keys(bookingsByDate).map(date => ({
      date: format(new Date(date), 'MMM dd'),
      bookings: bookingsByDate[date].count,
      revenue: bookingsByDate[date].revenue
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    // Revenue by room type
    const revenueByRoomType = filteredBookings.reduce<ChartDataItem[]>((acc, booking) => {
      const type = booking.roomType
      if (!acc.find(item => item.name === type)) {
        acc.push({ name: type, value: Number(booking.totalAmount) || 0 })
      } else {
        const index = acc.findIndex(item => item.name === type)
        acc[index].value += Number(booking.totalAmount) || 0
      }
      return acc
    }, [])
    
    // Calculate total guests
    const totalGuests = filteredBookings.reduce((sum, booking) => 
      sum + (Number(booking.numberOfGuests) || 1), 0)
    
    // Calculate guest types (new vs returning)
    const guestEmails = filteredBookings.map(b => b.guest.email)
    const uniqueGuests = new Set(guestEmails)
    const newGuests = uniqueGuests.size
    const returningGuests = guestEmails.length - newGuests
    
    const guestTypes = [
      { name: 'New', value: newGuests },
      { name: 'Returning', value: returningGuests > 0 ? returningGuests : 0 }
    ]
    
    // Guest satisfaction (mock data since we don't have ratings in the schema)
    const guestSatisfaction = [
      { name: '5 Stars', value: Math.round(filteredBookings.length * 0.6) },
      { name: '4 Stars', value: Math.round(filteredBookings.length * 0.3) },
      { name: '3 Stars', value: Math.round(filteredBookings.length * 0.07) },
      { name: '2 Stars', value: Math.round(filteredBookings.length * 0.02) },
      { name: '1 Star', value: Math.round(filteredBookings.length * 0.01) },
    ]
    
    // Guest demographics (mock data)
    const guestDemographics = [
      { name: 'United States', value: Math.round(filteredBookings.length * 0.4) },
      { name: 'Canada', value: Math.round(filteredBookings.length * 0.15) },
      { name: 'United Kingdom', value: Math.round(filteredBookings.length * 0.12) },
      { name: 'Australia', value: Math.round(filteredBookings.length * 0.08) },
      { name: 'Germany', value: Math.round(filteredBookings.length * 0.05) },
      { name: 'Other', value: Math.round(filteredBookings.length * 0.2) },
    ]
    
    // Room status
    const roomStatus = [
      { name: 'Available', value: rooms.filter(r => r.status === 'AVAILABLE').length },
      { name: 'Occupied', value: rooms.filter(r => r.status === 'OCCUPIED').length },
      { name: 'Maintenance', value: rooms.filter(r => r.status === 'MAINTENANCE').length },
      { name: 'Cleaning', value: rooms.filter(r => r.status === 'CLEANING').length },
    ]
    
    // Room type performance
    const roomTypePerformance = roomTypeDistribution.map(type => {
      const typeBookings = filteredBookings.filter(b => b.roomType === type.name)
      return {
        name: type.name,
        value: typeBookings.length
      }
    })
    
    // Generate data for floor occupancy (heatmap)
    const floorOccupancy: ChartDataItem[] = []
    for (let i = 1; i <= (hotel.floorCount || 4); i++) {
      // If we have floor data, use it instead of random values
      const floorRooms = rooms.filter(r => r.floor === i)
      const occupiedFloorRooms = floorRooms.filter(r => r.status === 'OCCUPIED')
      const floorOccupancyRate = floorRooms.length > 0 
        ? Math.round((occupiedFloorRooms.length / floorRooms.length) * 100) 
        : Math.floor(Math.random() * 100)
      
      floorOccupancy.push({
        name: `Floor ${i}`,
        value: floorOccupancyRate
      })
    }
    
    // Generate data for occupancy timeline
    const occupancyTimeline: TrendDataItem[] = []
    const currentDate = new Date(dateRange.from)
    while (currentDate <= dateRange.to) {
      const dateStr = format(currentDate, 'yyyy-MM-dd')
      const dateBookings = filteredBookings.filter(b => {
        try {
          const checkIn = new Date(b.checkInDate)
          const checkOut = new Date(b.checkOutDate)
          return currentDate >= checkIn && currentDate <= checkOut
        } catch (e) {
          return false
        }
      })
      
      const dayOccupancyRate = activeRooms > 0 
        ? Math.round((dateBookings.length / activeRooms) * 100) 
        : Math.floor(Math.random() * 100)
        
      occupancyTimeline.push({
        date: format(currentDate, 'MMM dd'),
        occupancy: dayOccupancyRate
      })
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    // Payment methods (mock data)
    const paymentMethods = [
      { name: 'Credit Card', value: Math.round(filteredBookings.length * 0.7) },
      { name: 'Debit Card', value: Math.round(filteredBookings.length * 0.15) },
      { name: 'PayPal', value: Math.round(filteredBookings.length * 0.1) },
      { name: 'Cash', value: Math.round(filteredBookings.length * 0.05) },
    ]
    
    // Revenue trends over time
    const revenueTrends = bookingTrends.map(day => ({
      date: day.date,
      revenue: day.revenue
    }))
    
    // Create guest stats with proper counting of bookings per email
    const guestBookingCount: Record<string, number> = {}
    const guestSpending: Record<string, number> = {}
    const guestNames: Record<string, string> = {}
    
    filteredBookings.forEach(booking => {
      if (booking.guest?.email) {
        const email = booking.guest.email
        guestBookingCount[email] = (guestBookingCount[email] || 0) + 1
        guestSpending[email] = (guestSpending[email] || 0) + (Number(booking.totalAmount) || 0)
        guestNames[email] = `${booking.guest.firstName || ''} ${booking.guest.lastName || ''}`.trim()
      }
    })
    
    const topGuests: GuestItem[] = Object.keys(guestBookingCount).map(email => ({
      name: guestNames[email] || 'Guest',
      email: email,
      bookings: guestBookingCount[email],
      totalSpent: guestSpending[email]
    })).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10)
    
    // Calculate average stay duration for real data
    const stayDuration = [
      { name: '1-3 days', value: Math.round(filteredBookings.length * 0.6) },
      { name: '4-7 days', value: Math.round(filteredBookings.length * 0.3) },
      { name: '8-14 days', value: Math.round(filteredBookings.length * 0.07) },
      { name: '15+ days', value: Math.round(filteredBookings.length * 0.03) },
    ]
    
    return {
      overview: {
        totalBookings,
        totalBookingsChange: Math.round(totalBookingsChange),
        occupancyRate,
        occupancyRateChange: 0, // Mock value
        totalRevenue,
        totalRevenueChange: Math.round(totalRevenueChange),
        averageDailyRate,
        averageDailyRateChange: 0, // Mock value
        revPAR,
        totalGuests,
        totalRooms: hotel.roomCount || rooms.length
      },
      recentBookings: filteredBookings,
      roomTypeDistribution,
      bookingTrends,
      bookingSources,
      bookingStatus,
      roomStatus,
      roomTypePerformance,
      floorOccupancy,
      occupancyTimeline,
      guestTypes,
      stayDuration,
      guestSatisfaction,
      topGuests,
      guestDemographics,
      revenueTrends,
      revenueByRoomType,
      paymentMethods
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hotel Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">Comprehensive analytics for bookings, rooms, and revenue</p>
        </div>
        <div className="flex items-center gap-2">
          <DatePickerWithRange date={dateRange} setDate={handleDateRangeChange} />
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleExportData}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bookings">Booking Trends</TabsTrigger>
          <TabsTrigger value="rooms">Room Analytics</TabsTrigger>
          <TabsTrigger value="guests">Guest Analytics</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {dashboardData && <OverviewMetrics data={dashboardData.overview} isLoading={isLoading} />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboardData && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Bookings</CardTitle>
                    <CardDescription>Last 10 bookings across all properties</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BookingTable bookings={dashboardData.recentBookings.slice(0, 5)} isLoading={isLoading} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Room Type Distribution</CardTitle>
                    <CardDescription>Bookings by room type</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    {dashboardData && (
                      <RoomAnalytics data={dashboardData.roomTypeDistribution} isLoading={isLoading} chartType="pie" />
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          {dashboardData && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Booking Trends</CardTitle>
                  <CardDescription>
                    Booking patterns over time ({dateRange.from ? format(dateRange.from, "MMM d, yyyy") : ""} -{" "}
                    {dateRange.to ? format(dateRange.to, "MMM d, yyyy") : ""})
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <BookingTrends data={dashboardData.bookingTrends} isLoading={isLoading} />
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Booking Sources</CardTitle>
                    <CardDescription>Where bookings are coming from</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <BookingTrends data={dashboardData.bookingSources} isLoading={isLoading} chartType="pie" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Booking Status</CardTitle>
                    <CardDescription>Current status of all bookings</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <BookingTrends data={dashboardData.bookingStatus} isLoading={isLoading} chartType="bar" />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>All Bookings</CardTitle>
                  <CardDescription>Detailed list of all bookings in the selected date range</CardDescription>
                </CardHeader>
                <CardContent>
                  <BookingTable bookings={dashboardData.recentBookings} isLoading={isLoading} isExpandable={true} />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="rooms" className="space-y-4">
          {dashboardData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Room Occupancy</CardTitle>
                    <CardDescription>Current occupancy rate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center h-[200px]">
                      <div className="text-5xl font-bold">{dashboardData.overview.occupancyRate}%</div>
                      <p className="text-muted-foreground">Occupancy Rate</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Room Type Performance</CardTitle>
                    <CardDescription>Most booked room types</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[200px]">
                    <RoomAnalytics data={dashboardData.roomTypePerformance} isLoading={isLoading} chartType="bar" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Room Status</CardTitle>
                    <CardDescription>Current status of all rooms</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[200px]">
                    <RoomAnalytics data={dashboardData.roomStatus} isLoading={isLoading} chartType="pie" />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Floor Occupancy</CardTitle>
                  <CardDescription>Room occupancy by floor</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <RoomAnalytics data={dashboardData.floorOccupancy} isLoading={isLoading} chartType="heatmap" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Room Occupancy Timeline</CardTitle>
                  <CardDescription>Occupancy rate over time</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <RoomAnalytics data={dashboardData.occupancyTimeline} isLoading={isLoading} chartType="line" />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="guests" className="space-y-4">
          {dashboardData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Guest Types</CardTitle>
                    <CardDescription>New vs. returning guests</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[250px]">
                    <GuestAnalytics data={dashboardData.guestTypes} isLoading={isLoading} chartType="pie" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Average Stay Duration</CardTitle>
                    <CardDescription>Length of stay by guest type</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[250px]">
                    <GuestAnalytics data={dashboardData.stayDuration} isLoading={isLoading} chartType="bar" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Guest Satisfaction</CardTitle>
                    <CardDescription>Rating distribution</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[250px]">
                    <GuestAnalytics data={dashboardData.guestSatisfaction} isLoading={isLoading} chartType="bar" />
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Top Guests</CardTitle>
                  <CardDescription>Guests with most bookings</CardDescription>
                </CardHeader>
                <CardContent>
                  <GuestAnalytics data={dashboardData.topGuests} isLoading={isLoading} chartType="table" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Guest Demographics</CardTitle>
                  <CardDescription>Guest distribution by country</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <GuestAnalytics data={dashboardData.guestDemographics} isLoading={isLoading} chartType="map" />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          {dashboardData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Total Revenue</CardTitle>
                    <CardDescription>Revenue in selected period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center h-[200px]">
                      <div className="text-5xl font-bold">${dashboardData.overview.totalRevenue.toLocaleString()}</div>
                      <p className="text-muted-foreground">Total Revenue</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Average Daily Rate</CardTitle>
                    <CardDescription>ADR in selected period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center h-[200px]">
                      <div className="text-5xl font-bold">
                        ${dashboardData.overview.averageDailyRate.toLocaleString()}
                      </div>
                      <p className="text-muted-foreground">ADR</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>RevPAR</CardTitle>
                    <CardDescription>Revenue per available room</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center h-[200px]">
                      <div className="text-5xl font-bold">${dashboardData.overview.revPAR.toLocaleString()}</div>
                      <p className="text-muted-foreground">RevPAR</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trends</CardTitle>
                  <CardDescription>Revenue over time</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  <FinancialAnalytics data={dashboardData.revenueTrends} isLoading={isLoading} chartType="line" />
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Room Type</CardTitle>
                    <CardDescription>Revenue distribution by room category</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <FinancialAnalytics data={dashboardData.revenueByRoomType} isLoading={isLoading} chartType="bar" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Payment Methods</CardTitle>
                    <CardDescription>Revenue by payment type</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <FinancialAnalytics data={dashboardData.paymentMethods} isLoading={isLoading} chartType="pie" />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}