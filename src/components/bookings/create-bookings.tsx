"use client"

import { useState } from "react"
import { format } from "date-fns"
import { CalendarIcon, Plus, Minus, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { Spinner } from "@/components/ui/spinner"

interface Room {
  id: number
  type: string
  adults: number
  children: number
  price: number
}



export default function CreateBooking() {
  const [rooms, setRooms] = useState<Room[]>([
    { id: 1, type: "Executive Suite", adults: 1, children: 0, price: 5288 }
  ])
  const [date, setDate] = useState<{ from: Date; to: Date | undefined }>({
    from: new Date(),
    to: undefined
  })
  const [guestDetails, setGuestDetails] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneCode: "+91",
    phone: "",
    profileType: "personal",
    companyName: ""
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // GraphQL endpoint
  const endpoint = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'https://nexus-backend-uts0.onrender.com/graphql'

  const totalCharges = rooms.reduce((sum, room) => sum + room.price, 0)

  const addRoom = () => {
    setRooms([...rooms, { 
      id: rooms.length + 1, 
      type: "Executive Suite", 
      adults: 1, 
      children: 0, 
      price: 5288 
    }])
  }

  const updateRoomType = (index: number, type: string) => {
    const newRooms = [...rooms]
    newRooms[index].type = type
    
    // Update price based on room type
    switch(type) {
      case "Executive Suite":
        newRooms[index].price = 5288
        break
      case "Superior Double":
        newRooms[index].price = 4500
        break
      case "Premiere Deluxe":
        newRooms[index].price = 6200
        break
      default:
        newRooms[index].price = 5000
    }
    
    setRooms(newRooms)
  }

  const handleCreateBooking = async () => {
    // Validation
    if (!guestDetails.firstName || !guestDetails.email || !guestDetails.phone) {
      toast({
        title: "Error",
        description: "Please fill in all required guest details",
        variant: "destructive"
      })
      return
    }
    
    if (!date.from || !date.to) {
      toast({
        title: "Error",
        description: "Please select check-in and check-out dates",
        variant: "destructive"
      })
      return
    }
    
    setLoading(true)
    try {
      // Calculate total nights
      const nights = Math.ceil((date.to.getTime() - date.from.getTime()) / (1000 * 60 * 60 * 24))
      
      // Calculate total guests
      const totalGuests = rooms.reduce((sum, room) => sum + room.adults + room.children, 0)
      
      // Calculate base amount (without taxes)
      const baseAmount = rooms.reduce((sum, room) => sum + room.price, 0) * nights
      
      // Calculate tax (assume 18% GST)
      const taxAmount = baseAmount * 0.18
      
      // Total amount
      const totalAmount = baseAmount + taxAmount
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            mutation CreateBooking($bookingInput: BookingInput!) {
              createBooking(bookingInput: $bookingInput) {
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
            bookingInput: {
              hotelId: "67f64e258319b4c5b57b3246", // Replace with actual hotel ID from context
              guest: {
                firstName: guestDetails.firstName,
                lastName: guestDetails.lastName,
                email: guestDetails.email,
                phoneNumber: `${guestDetails.phoneCode}${guestDetails.phone}`,
                ...(guestDetails.profileType === "business" && { companyName: guestDetails.companyName })
              },
              checkInDate: date.from.toISOString(),
              checkOutDate: date.to.toISOString(),
              roomType: rooms[0].type, // Use first room's type as primary
              numberOfGuests: totalGuests,
              numberOfRooms: rooms.length,
              baseAmount: baseAmount,
              taxAmount: taxAmount,
              totalAmount: totalAmount,
              bookingStatus: "CONFIRMED",
              bookingSource: "DIRECT",
              specialRequests: "",
              ratePlan: "STANDARD"
            }
          }
        }),
      })
      
      const result = await response.json()
      
      if (result.errors) {
        throw new Error(result.errors[0].message)
      }
      
      const newBooking = result.data.createBooking
      
      toast({
        title: "Success!",
        description: `Booking #${newBooking.bookingNumber} created successfully.`,
      })
      
      // Reset form or redirect to the new booking
      window.location.href = `/bookings/${newBooking.id}`
    } catch (error) {
      console.error("Error creating booking:", error)
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const removeRoom = (index: number) => {
    if (rooms.length === 1) {
      toast({
        title: "Error",
        description: "At least one room is required",
        variant: "destructive"
      })
      return
    }
    
    const newRooms = rooms.filter((_, i) => i !== index)
    setRooms(newRooms)
  }

  return (
    <div className="container mx-auto p-6">
      <div className="sticky top-0 z-10 -mx-6 -mt-6 bg-white px-6 py-4 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Create Booking</h1>
            <p className="text-sm text-gray-500">
              {rooms.reduce((sum, room) => sum + room.adults + room.children, 0)} Guest
              {rooms.reduce((sum, room) => sum + room.adults + room.children, 0) !== 1 ? 's' : ''}, 
              {rooms.length} Room
              {rooms.length !== 1 ? 's' : ''}, 
              {date.to ? Math.ceil((date.to.getTime() - date.from.getTime()) / (1000 * 60 * 60 * 24)) : 1} Night
              {date.to && Math.ceil((date.to.getTime() - date.from.getTime()) / (1000 * 60 * 60 * 24)) !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-500">Total Charges</div>
              <div className="text-xl font-bold">₹ {totalCharges.toLocaleString()}</div>
            </div>
            <Button 
              className="bg-green-500 hover:bg-green-600"
              onClick={handleCreateBooking}
              disabled={loading}
            >
              {loading && <Spinner className="mr-2 h-4 w-4" />}
              Create Booking
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        <section className="rounded-lg border bg-white p-6">
          <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-500">
              1
            </span>
            Contact Details
          </h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Mobile Number</Label>
              <div className="flex">
                <Select 
                  defaultValue="+91"
                  onValueChange={(value) => setGuestDetails({...guestDetails, phoneCode: value})}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Code" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+91">+91</SelectItem>
                    <SelectItem value="+1">+1</SelectItem>
                    <SelectItem value="+44">+44</SelectItem>
                  </SelectContent>
                </Select>
                <Input 
                  className="flex-1" 
                  placeholder="Enter Mobile Number" 
                  value={guestDetails.phone}
                  onChange={(e) => setGuestDetails({...guestDetails, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                placeholder="Enter Name" 
                value={guestDetails.firstName}
                onChange={(e) => setGuestDetails({...guestDetails, firstName: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input 
                placeholder="Enter Last Name" 
                value={guestDetails.lastName}
                onChange={(e) => setGuestDetails({...guestDetails, lastName: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input 
                type="email" 
                placeholder="Enter Email Address" 
                value={guestDetails.email}
                onChange={(e) => setGuestDetails({...guestDetails, email: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Type of Profile</Label>
              <Select 
                value={guestDetails.profileType}
                onValueChange={(value) => setGuestDetails({...guestDetails, profileType: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Profile Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Company/Business Name</Label>
              <Input 
                placeholder="Enter Company Name" 
                disabled={guestDetails.profileType !== "business"}
                value={guestDetails.companyName}
                onChange={(e) => setGuestDetails({...guestDetails, companyName: e.target.value})}
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border bg-white p-6">
          <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-500">
              2
            </span>
            Stay Details
          </h2>

          <div className="mb-6 flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label>Check-in Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !date.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date.from ? format(date.from, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date.from}
                    selected={{from: date.from, to: date.to}}
                    onSelect={(range: any) => setDate(range)}
                    numberOfMonths={2}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Check-out Date</Label>
              <Button
                variant="outline"
                className="w-[240px] justify-start text-left font-normal"
                onClick={() => {
                  const popoverTrigger = document.querySelector("[aria-expanded='false']")
                  if (popoverTrigger instanceof HTMLElement) {
                    popoverTrigger.click()
                  }
                }}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date.to ? format(date.to, "PPP") : "Pick a date"}
              </Button>
            </div>

            {date.from && date.to && (
              <Button variant="link" className="mt-8 text-red-500" onClick={() => {
                // Calculate price breakdown
                const nights = Math.ceil((date.to!.getTime() - date.from.getTime()) / (1000 * 60 * 60 * 24))
                
                toast({
                  title: "Price Details",
                  description: `
                    Base Rate: ₹${rooms.reduce((sum, room) => sum + room.price, 0).toLocaleString()} per night
                    Total Nights: ${nights}
                    Subtotal: ₹${(rooms.reduce((sum, room) => sum + room.price, 0) * nights).toLocaleString()}
                    Taxes (18%): ₹${(rooms.reduce((sum, room) => sum + room.price, 0) * nights * 0.18).toFixed(2)}
                    Total: ₹${(rooms.reduce((sum, room) => sum + room.price, 0) * nights * 1.18).toFixed(2)}
                  `
                })
              }}>
                View Price Details
              </Button>
            )}
          </div>

          {rooms.map((room, index) => (
            <div
              key={room.id}
              className="mb-4 rounded-lg border p-4 relative"
            >
              {rooms.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 text-gray-400 hover:text-red-500"
                  onClick={() => removeRoom(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-medium">Room {index + 1}</h3>
                <div className="text-right">
                  <div className="font-medium">₹ {room.price}</div>
                  <div className="text-sm text-gray-500">
                    Min ₹ 0 · Max ₹ 10,564
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Room Type</Label>
                  <Select 
                    defaultValue={room.type}
                    onValueChange={(value) => updateRoomType(index, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Executive Suite">Executive Suite</SelectItem>
                      <SelectItem value="Superior Double">Superior Double</SelectItem>
                      <SelectItem value="Premiere Deluxe">Premiere Deluxe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Rooms</Label>
                  <Select defaultValue="1">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Adults (5+ Years)</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const newRooms = [...rooms]
                        if (newRooms[index].adults > 1) {
                          newRooms[index].adults--
                          setRooms(newRooms)
                        }
                      }}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center">{room.adults}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const newRooms = [...rooms]
                        newRooms[index].adults++
                        setRooms(newRooms)
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Children (0-5 years)</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const newRooms = [...rooms]
                        if (newRooms[index].children > 0) {
                          newRooms[index].children--
                          setRooms(newRooms)
                        }
                      }}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center">{room.children}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const newRooms = [...rooms]
                        newRooms[index].children++
                        setRooms(newRooms)
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            className="w-full"
            onClick={addRoom}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Room
          </Button>
        </section>
      </div>
    </div>
  )
}