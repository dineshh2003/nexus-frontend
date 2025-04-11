"use client"

import React from "react"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, CalendarIcon, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { format, addDays } from "date-fns"
import { cn } from "@/lib/utils"

// Define the Room type based on the data structure from the GetRooms query
type Room = {
  id: string
  roomNumber: string
  roomType: string
  bedType: string
  pricePerNight: number
  status: string
  amenities: string[]
  floor: number
  baseOccupancy: number
  maxOccupancy: number
  extraBedAllowed: boolean
  extraBedPrice: number
  // Include other properties as needed
}

const bookingSourceOptions = [
  { value: "WEBSITE", label: "Website" },
  { value: "WALK_IN", label: "Walk-in" },
  { value: "PHONE", label: "Phone" },
  { value: "TRAVEL_AGENT", label: "Travel Agent" },
  { value: "CORPORATE", label: "Corporate" },
  { value: "OTA", label: "Online Travel Agency" },
]

const ratePlanOptions = [
  { value: "standard", label: "Standard Rate" },
  { value: "premium", label: "Premium Rate" },
  { value: "corporate", label: "Corporate Rate" },
  { value: "government", label: "Government Rate" },
  { value: "seasonal", label: "Seasonal Special" },
]

// Form schema aligned with the mutation structure
const formSchema = z.object({
  hotelId: z.string().min(1, { message: "Hotel ID is required" }),
  roomId: z.string().min(1, { message: "Room is required" }),
  firstName: z.string().min(1, { message: "First name is required" }),
  lastName: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().min(5, { message: "Phone number is required" }),
  address: z.string().optional(),
  bookingSource: z.string().min(1, { message: "Booking source is required" }),
  checkInDate: z.date({ required_error: "Check-in date is required" }),
  checkOutDate: z.date({ required_error: "Check-out date is required" }),
  numberOfGuests: z.coerce.number().int().min(1, { message: "At least 1 guest is required" }),
  numberOfRooms: z.coerce.number().int().min(1, { message: "Number of rooms is required" }).default(1),
  ratePlan: z.string().min(1, { message: "Rate plan is required" }),
  specialRequests: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

type BookingFormProps = {
  hotelId: string
  hotelName: string
  roomId?: string
  roomNumber?: string
  room?: Room | null
  onSuccess: () => void
}

export default function BookingForm({ hotelId, hotelName, roomId, roomNumber, room, onSuccess }: BookingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date()
  const checkoutDefault = addDays(today, 1)

  // Initialize form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hotelId,
      roomId: roomId || "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      bookingSource: "WALK_IN",
      checkInDate: today,
      checkOutDate: checkoutDefault,
      numberOfGuests: room?.baseOccupancy || 1,
      numberOfRooms: 1,
      ratePlan: "standard",
      specialRequests: "",
    },
  })

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    setError(null)

    try {
      // Prepare mutation variables based on form values
      const mutationVariables = {
        bookingData: {
          hotelId: values.hotelId,
          roomId: values.roomId,
          guest: {
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phone: values.phone,
            address: values.address || "",
          },
          bookingSource: values.bookingSource,
          checkInDate: values.checkInDate.toISOString(),
          checkOutDate: values.checkOutDate.toISOString(),
          numberOfGuests: values.numberOfGuests,
          numberOfRooms: values.numberOfRooms,
          ratePlan: values.ratePlan,
          specialRequests: values.specialRequests || "",
        },
      }

      // This would be your actual GraphQL mutation call
      // Here's a placeholder for the API call
      const response = await fetch('https://nexus-backend-uts0.onrender.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation CreateBooking($bookingData: BookingInput!) {
              createBooking(bookingData: $bookingData) {
                id
                bookingNumber
                hotelId
                roomId
                guest {
                  firstName
                  lastName
                  email
                }
                checkInDate
                checkOutDate
                roomType
                baseAmount
                taxAmount
                totalAmount
                bookingStatus
                paymentStatus
                createdAt
              }
            }
          `,
          variables: mutationVariables,
        }),
      });

      const result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'Failed to create booking');
      }

      console.log("Booking created:", result.data.createBooking);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to create booking. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 pb-4 border-b">
              <h3 className="text-lg font-medium">Booking Details</h3>
              <p className="text-sm text-muted-foreground">Hotel: {hotelName}</p>
              {room && <p className="text-sm text-muted-foreground">Room: {room.roomNumber} - {room.roomType}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="hotelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hotel ID</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room ID</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly={!!roomId} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bookingSource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Booking Source</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select booking source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bookingSourceOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ratePlan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate Plan</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rate plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ratePlanOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 pb-4 border-b">
              <h3 className="text-lg font-medium">Guest Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john.doe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St, Anytown, USA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 pb-4 border-b">
              <h3 className="text-lg font-medium">Stay Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="checkInDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Check-in Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < today}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="checkOutDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Check-out Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => {
                            const checkInDate = form.getValues("checkInDate");
                            return date <= checkInDate;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numberOfGuests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Guests</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        max={room?.maxOccupancy || 4} 
                        {...field} 
                      />
                    </FormControl>
                    {room && (
                      <FormDescription>Max occupancy: {room.maxOccupancy}</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numberOfRooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Rooms</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        {...field} 
                        defaultValue={1} 
                        readOnly={!!roomId} // Make read-only if a specific room is selected
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-6">
              <FormField
                control={form.control}
                name="specialRequests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Requests</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any special requests or requirements..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Optional: Add any special requests for your stay</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 pt-6 flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Booking...
              </>
            ) : (
              "Create Booking"
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}