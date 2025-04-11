"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle } from "lucide-react"
import RoomGrid from "./room-grid"
import BookingForm from "./booking-form"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useHotelContext } from "@/providers/hotel-provider"

type Room = {
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
  maintenanceNotes: string
  extraBedAllowed: boolean
  lastMaintained: string
  extraBedPrice: number
  baseOccupancy: number
  maxOccupancy: number
  lastCleaned: string
  floor: number
  hotelId: string
  roomSize: number
  bedCount: number
  isAvailable?: boolean
}


export default function CreateBooking() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const { selectedHotel } = useHotelContext();
  
  // Add refreshTrigger state
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  const [hotelData, setHotelData] = useState({
    id: "",
    name: "",
    floorCount: 0,
  });

  // Update hotelData when selectedHotel changes
  useEffect(() => {
    if (selectedHotel) {
      setHotelData({
        id: selectedHotel?.id,
        name: selectedHotel?.name,
        floorCount: selectedHotel?.floorCount,
      });
    }
  }, [selectedHotel]);

  const handleCreateBooking = (room: Room) => {
    setSelectedRoom(room)
    setIsFormOpen(true)
  }
  
  // Function to handle successful booking creation
  const handleBookingSuccess = () => {
    setIsFormOpen(false)
    // Trigger a refresh of the room grid
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Booking Management</h1>
          <p className="text-muted-foreground mt-1">Manage room bookings and availability</p>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader className="bg-muted/50">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">{hotelData.name}</CardTitle>
              <CardDescription>Hotel ID: {hotelData.id}</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-green-500"></div>
                <span className="text-sm">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-red-500"></div>
                <span className="text-sm">Booked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-red-600"></div>
                <span className="text-sm">Occupied</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-amber-500"></div>
                <span className="text-sm">Cleaning</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-blue-500"></div>
                <span className="text-sm">Maintenance</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {hotelData.id && (
            <RoomGrid
              hotelId={hotelData.id}
              floorCount={hotelData.floorCount}
              onCreateBooking={handleCreateBooking}
              refreshTrigger={refreshTrigger} // Pass the refresh trigger
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRoom ? `Create Booking for Room ${selectedRoom.roomNumber}` : "Create New Booking"}
            </DialogTitle>
            <DialogDescription>Fill in the details below to create a new booking</DialogDescription>
          </DialogHeader>
          <BookingForm
            hotelId={hotelData.id}
            hotelName={hotelData.name}
            roomId={selectedRoom?.id}
            roomNumber={selectedRoom?.roomNumber}
            room={selectedRoom}
            onSuccess={handleBookingSuccess} // Use the new handler
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}