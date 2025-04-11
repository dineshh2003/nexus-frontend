"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { Calendar, Printer, Search, RefreshCw, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { useHotelContext } from "@/providers/hotel-provider"


interface BookingsSectionProps {
  title: string
  subtitle: string
  bookings: Booking[]
  onSelectBooking: (bookingId: string) => void
  showDownload?: boolean
  onDownload?: () => void
  calculateNights: (checkInDate: string, checkOutDate: string) => number
  formatDateRange: (checkIn: string, checkOut: string) => string
}


interface Booking {
  id: string
  bookingNumber: string
  guest: {
    firstName: string
    lastName: string
    email: string
  }
  checkInDate: string
  checkOutDate: string
  numberOfRooms: number
  numberOfGuests: number
  roomType: string
  bookingStatus: string
  paymentStatus: string
  totalAmount: number
  createdAt: string
}

interface BookingsListProps {
  onSelectBooking: (bookingId: string) => void
}

type BookingCategory = 'upcoming' | 'inhouse' | 'completed';

export function BookingsList({ onSelectBooking }: BookingsListProps) {
  const [activeTab, setActiveTab] = useState<BookingCategory>("upcoming")
  const [bookings, setBookings] = useState<{
    upcoming: Booking[];
    inhouse: Booking[];
    completed: Booking[];
  }>({
    upcoming: [],
    inhouse: [],
    completed: []
  })
  const [loading, setLoading] = useState(true)
  const [emailSearch, setEmailSearch] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const { toast } = useToast()
  const {selectedHotel} = useHotelContext()
  // GraphQL endpoint



  const endpoint = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'https://nexus-backend-uts0.onrender.com/graphql'
  
  const handleTabChange = (value: string) => {
    setActiveTab(value as BookingCategory);
  };


  // const calculateNights = (checkInDate: string, checkOutDate: string): number => {
  //   if (!checkInDate || !checkOutDate) return 1
    
  //   const checkIn = new Date(checkInDate)
  //   const checkOut = new Date(checkOutDate)
    
  //   const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime())
  //   const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
  //   return diffDays || 1
  // }

  useEffect(() => {
    fetchBookings()
  }, [activeTab])
  
  const fetchBookings = async () => {
    setLoading(true)
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            query GetBookings($hotelId: String!, $limit: Int) {
              bookings(hotelId: $hotelId, limit: $limit) {
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
                numberOfRooms
                numberOfGuests
                createdAt
              }
            }
          `,
          variables: { 
            hotelId: `${selectedHotel?.id}`, 
            limit: 100
          }
        }),
      })
      
      const result = await response.json()
      
      if (result.errors) {
        throw new Error(result.errors[0].message)
      }
      
      const allBookings = result.data.bookings || []
      
      // Current date for comparison
      const now = new Date()
      
      // Filter bookings by status
      const categorizedBookings = {
        upcoming: allBookings.filter((booking: Booking) => {
          const checkInDate = new Date(booking.checkInDate)
          return checkInDate > now && booking.bookingStatus !== "CANCELLED" && booking.bookingStatus !== "NO_SHOW"
        }),
        inhouse: allBookings.filter((booking: Booking) => 
          booking.bookingStatus === "CHECKED_IN"
        ),
        completed: allBookings.filter((booking: Booking) => 
          booking.bookingStatus === "CHECKED_OUT" || booking.bookingStatus === "CANCELLED" || booking.bookingStatus === "NO_SHOW"
        )
      }
      
      setBookings(categorizedBookings)
    } catch (error) {
      console.error("Error fetching bookings:", error)
      toast({
        title: "Error",
        description: "Failed to load bookings. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }
  
  

  const handleSearch = async () => {
    if (!emailSearch.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email to search",
        variant: "destructive"
      })
      return
    }
    
    setIsSearching(true)
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            query GetBookingsByGuest($guestEmail: String!, $limit: Int, $offset: Int) {
              bookingsByGuest(
                guestEmail: $guestEmail,
                limit: $limit,
                offset: $offset
              ) {
                id
                bookingNumber
                hotelId
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
                numberOfRooms
                numberOfGuests
                createdAt
              }
            }
          `,
          variables: {
            guestEmail: emailSearch,
            limit: 10,
            offset: 0
          }
        }),
      })
      
      const result = await response.json()
      
      if (result.errors) {
        throw new Error(result.errors[0].message)
      }
      
      const searchResults = result.data.getBookingsByGuest || []

    
      // Current date for comparison
      const now = new Date()
      
      // Categorize search results
      const categorizedResults = {
        upcoming: searchResults.filter((booking: Booking) => {
          const checkInDate = new Date(booking.checkInDate)
          return checkInDate > now && booking.bookingStatus !== "CANCELLED" && booking.bookingStatus !== "NO_SHOW"
        }),
        inhouse: searchResults.filter((booking: Booking) => 
          booking.bookingStatus === "CHECKED_IN"
        ),
        completed: searchResults.filter((booking: Booking) => 
          booking.bookingStatus === "CHECKED_OUT" || booking.bookingStatus === "CANCELLED" || booking.bookingStatus === "NO_SHOW"
        )
      }
      
      setBookings(categorizedResults)
      
      toast({
        title: "Search Results",
        description: `Found ${searchResults.length} bookings for ${emailSearch}`,
      })
    } catch (error) {
      console.error("Error searching bookings:", error)
      toast({
        title: "Error",
        description: "Failed to search bookings. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSearching(false)
    }
  }
  
  const handleClearSearch = () => {
    setEmailSearch("")
    fetchBookings()
  }
  
  // Get today's and previous bookings for display
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  
  const todayBookings = bookings[activeTab].filter((booking: Booking) => {
    const checkInDateStr = booking.checkInDate.split('T')[0]
    return checkInDateStr === todayStr
  })
  
  const previousBookings = bookings[activeTab].filter((booking: Booking) => {
    const checkInDateStr = booking.checkInDate.split('T')[0]
    return checkInDateStr < todayStr
  })
  
  const upcomingBookings = bookings[activeTab].filter((booking: Booking) => {
    const checkInDateStr = booking.checkInDate.split('T')[0]
    return checkInDateStr > todayStr
  })
  
  // Calculate room counts
  const calculateRooms = (bookingsList: Booking[]) => {
    return bookingsList.reduce((total, booking) => total + (booking.numberOfRooms || 1), 0)
  }
  
  const todayRoomCount = calculateRooms(todayBookings)
  const previousRoomCount = calculateRooms(previousBookings)
  const upcomingRoomCount = calculateRooms(upcomingBookings)
  
  const calculateNights = (checkInDate: string, checkOutDate: string): number => {
    if (!checkInDate || !checkOutDate) return 1
    
    const checkIn = new Date(checkInDate)
    const checkOut = new Date(checkOutDate)
    
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays || 1
  }
  
  // Function to format the date range for display
  const formatDateRange = (checkIn: string, checkOut: string): string => {
    try {
      const checkInDate = new Date(checkIn)
      const checkOutDate = new Date(checkOut)
      return `${format(checkInDate, 'dd MMM')} - ${format(checkOutDate, 'dd MMM')}`
    } catch (e) {
      return "Invalid dates"
    }
  }
  
 

  // Handle download
  const handleDownloadTodaysArrivals = () => {
    const headers = ["Booking ID", "Guest Name", "Email", "Dates", "Rooms", "Nights", "Payment", "Amount", "Status"]
    
    const csvData = todayBookings.map((booking : any) => [
      booking.bookingNumber,
      `${booking.guest.firstName} ${booking.guest.lastName}`,
      booking.guest.email,
      formatDateRange(booking.checkInDate, booking.checkOutDate),
      `${booking.numberOfRooms || 1} ${booking.numberOfRooms === 1 ? 'Room' : 'Rooms'}`,
      `${calculateNights(booking.checkInDate, booking.checkOutDate)} ${calculateNights(booking.checkInDate, booking.checkOutDate) === 1 ? 'Night' : 'Nights'}`,
      booking.paymentStatus === "PAID" ? "Paid" : "Pay at Hotel",
      `$${Number(booking.totalAmount).toLocaleString()}`,
      booking.bookingStatus
    ])
    
    const csvContent = [
      headers.join(','),
      ...csvData.map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('hidden', '')
    a.setAttribute('href', url)
    a.setAttribute('download', `todays_arrivals_${format(today, 'yyyy-MM-dd')}.csv`)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
  
  // Helper function to calculate nights between dates
 

  return (
    <div className="container mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bookings</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search by email"
              className="w-64"
              value={emailSearch}
              onChange={(e) => setEmailSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-0 top-0" 
              onClick={emailSearch ? handleClearSearch : handleSearch}
              disabled={isSearching}
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : emailSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          <Button variant="outline" size="icon" onClick={fetchBookings}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Calendar className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="upcoming" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
            Upcoming ({bookings.upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="inhouse" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
            In House ({bookings.inhouse.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Completed ({bookings.completed.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : (
        <>
          {upcomingBookings.length > 0 && (
            <BookingsSection
              title="Upcoming"
              subtitle={`${upcomingBookings.length} ${upcomingBookings.length === 1 ? 'Booking' : 'Bookings'} - ${upcomingRoomCount} ${upcomingRoomCount === 1 ? 'Room' : 'Rooms'}`}
              bookings={upcomingBookings}
              onSelectBooking={onSelectBooking}
              calculateNights={calculateNights}
              formatDateRange={formatDateRange}
            />
          )}

          {todayBookings.length > 0 && (
            <BookingsSection
              title="Today"
              subtitle={`${todayBookings.length} ${todayBookings.length === 1 ? 'Booking' : 'Bookings'} - ${todayRoomCount} ${todayRoomCount === 1 ? 'Room' : 'Rooms'}`}
              bookings={todayBookings}
              onSelectBooking={onSelectBooking}
              showDownload
              onDownload={handleDownloadTodaysArrivals}
              calculateNights={calculateNights}
              formatDateRange={formatDateRange}
            />
          )}

          {previousBookings.length > 0 && (
            <BookingsSection
              title="Previous"
              subtitle={`${previousBookings.length} ${previousBookings.length === 1 ? 'Booking' : 'Bookings'} - ${previousRoomCount} ${previousRoomCount === 1 ? 'Room' : 'Rooms'}`}
              bookings={previousBookings}
              onSelectBooking={onSelectBooking}
              calculateNights={calculateNights}
              formatDateRange={formatDateRange}
            />
          )}

          {bookings[activeTab].length === 0 && (
            <div className="text-center p-12 border rounded-lg bg-gray-50">
              <h3 className="text-lg font-medium text-gray-700">No bookings found</h3>
              <p className="text-gray-500 mt-2">There are no {activeTab} bookings to display.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function BookingsSection({ 
  title, 
  subtitle, 
  bookings, 
  onSelectBooking, 
  showDownload = false,
  onDownload,
  calculateNights,
  formatDateRange
}: BookingsSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-8"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        {showDownload && (
          <Button variant="ghost" className="text-red-500 hover:text-red-600" onClick={onDownload}>
            <Printer className="mr-2 h-4 w-4" />
            Download Today's Arrival
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        <div className="grid grid-cols-5 gap-4 border-b bg-gray-50 p-4 text-sm font-medium text-gray-500">
          <div>NAME</div>
          <div>BOOKING ID</div>
          <div>ROOM NIGHTS</div>
          <div>PAYMENTS</div>
          <div>BOOKING INFO</div>
        </div>

        {bookings.map((booking) => {
          // Calculate nights using the passed function
          const nights = calculateNights(booking.checkInDate, booking.checkOutDate)
          
          // Determine status color
          const getStatusColor = (status: string) => {
            switch(status) {
              case "CONFIRMED": return "text-green-500"
              case "CHECKED_IN": return "text-blue-500"
              case "CHECKED_OUT": return "text-purple-500"
              case "CANCELLED": return "text-red-500"
              case "NO_SHOW": return "text-yellow-500"
              default: return "text-gray-500"
            }
          }
          
          return (
            <motion.div
              key={booking.id}
              whileHover={{ backgroundColor: "rgba(0,0,0,0.01)" }}
              className="grid cursor-pointer grid-cols-5 gap-4 p-4 border-b last:border-b-0"
              onClick={() => onSelectBooking(booking.id)}
            >
              <div>
                <div className="font-medium">{booking.guest.firstName} {booking.guest.lastName}</div>
                <div className="text-sm text-gray-500">{booking.numberOfGuests || 1} Guests</div>
              </div>
              <div>
                <div className="font-medium">{booking.bookingNumber}</div>
                <div className="text-sm text-gray-500">
                  {formatDateRange(booking.checkInDate, booking.checkOutDate)}
                </div>
              </div>
              <div>
                <div>{booking.numberOfRooms || 1} {booking.numberOfRooms === 1 ? 'Room' : 'Rooms'}</div>
                <div className="text-sm text-gray-500">{nights} {nights === 1 ? 'Night' : 'Nights'}</div>
              </div>
              <div>
                <div>{booking.paymentStatus === "PAID" ? "Paid" : "Pay at Hotel"}</div>
                <div className="text-sm text-gray-500">${Number(booking.totalAmount).toLocaleString()}</div>
              </div>
              <div className="flex items-center justify-between">
                <span className={getStatusColor(booking.bookingStatus)}>
                  {booking.bookingStatus.replace("_", " ")}
                </span>
                <Button variant="ghost" size="icon" onClick={(e) => {
                  e.stopPropagation()
                  printBookingDetails(booking, calculateNights)
                }}>
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}


function printBookingDetails(booking: Booking, calculateNights: (checkIn: string, checkOut: string) => number) {
  const printContent = `
    <html>
      <head>
        <title>Booking ${booking.bookingNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 30px; }
          h1 { font-size: 24px; margin-bottom: 20px; }
          .info { margin-bottom: 20px; }
          .info-row { display: flex; margin-bottom: 10px; }
          .label { font-weight: bold; width: 200px; }
          .value { flex: 1; }
          .total { margin-top: 20px; font-weight: bold; font-size: 18px; }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <h1>Booking Confirmation: ${booking.bookingNumber}</h1>
        
        <div class="info">
          <div class="info-row">
            <div class="label">Guest:</div>
            <div class="value">${booking.guest.firstName} ${booking.guest.lastName}</div>
          </div>
          <div class="info-row">
            <div class="label">Email:</div>
            <div class="value">${booking.guest.email}</div>
          </div>
          <div class="info-row">
            <div class="label">Check-in Date:</div>
            <div class="value">${new Date(booking.checkInDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
          <div class="info-row">
            <div class="label">Check-out Date:</div>
            <div class="value">${new Date(booking.checkOutDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
          <div class="info-row">
            <div class="label">Room Type:</div>
            <div class="value">${booking.roomType}</div>
          </div>
          <div class="info-row">
            <div class="label">Number of Rooms:</div>
            <div class="value">${booking.numberOfRooms || 1}</div>
          </div>
          <div class="info-row">
            <div class="label">Number of Guests:</div>
            <div class="value">${booking.numberOfGuests || 1}</div>
          </div>
          <div class="info-row">
            <div class="label">Number of Nights:</div>
            <div class="value">${calculateNights(booking.checkInDate, booking.checkOutDate)}</div>
          </div>
          <div class="info-row">
            <div class="label">Booking Status:</div>
            <div class="value">${booking.bookingStatus.replace("_", " ")}</div>
          </div>
          <div class="info-row">
            <div class="label">Payment Status:</div>
            <div class="value">${booking.paymentStatus || "Pending"}</div>
          </div>
        </div>
        
        <div class="total">Total Amount: $${Number(booking.totalAmount).toLocaleString()}</div>
        
        <p style="margin-top: 50px; font-size: 14px; color: #666;">
          This is a computer-generated document. No signature is required.
        </p>
      </body>
    </html>
  `
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.print()
  }
}