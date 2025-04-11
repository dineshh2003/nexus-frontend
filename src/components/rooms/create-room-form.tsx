"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, Loader2, Variable } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useHotelContext } from "@/providers/hotel-provider"


const roomTypes = [
  { value: "STANDARD", label: "Standard" },
  { value: "DELUXE", label: "Deluxe" },
  { value: "SUITE", label: "Suite" },
  { value: "EXECUTIVE", label: "Executive" },
  { value: "PENTHOUSE", label: "Penthouse" },
]

const bedTypes = [
  { value: "SINGLE", label: "Single" },
  { value: "TWIN", label: "Twin" },
  { value: "DOUBLE", label: "Double" },
  { value: "QUEEN", label: "Queen" },
  { value: "KING", label: "King" },
  { value: "CALIFORNIA_KING", label: "California King" },
]

const amenitiesOptions = [
  { id: "WIFI", label: "WiFi" },
  { id: "TV", label: "TV" },
  { id: "AIR_CONDITIONING", label: "Air Conditioning" },
  { id: "MINIBAR", label: "Minibar" },
  { id: "SAFE", label: "Safe" },
  { id: "OCEAN_VIEW", label: "Ocean View" },
  { id: "CITY_VIEW", label: "City View" },
  { id: "BALCONY", label: "Balcony" },
  { id: "BATHTUB", label: "Bathtub" },
  { id: "SHOWER", label: "Shower" },
  { id: "COFFEE_MAKER", label: "Coffee Maker" },
  { id: "DESK", label: "Desk" },
]

const formSchema = z.object({
  hotelId: z.string().min(1, { message: "Hotel ID is required" }),
  roomNumber: z.string().min(1, { message: "Room number is required" }),
  floor: z.coerce.number().int().min(0, { message: "Floor must be a positive number" }),
  roomType: z.string().min(1, { message: "Room type is required" }),
  pricePerNight: z.coerce.number().positive({ message: "Price must be a positive number" }),
  baseOccupancy: z.coerce.number().int().min(1, { message: "Base occupancy must be at least 1" }),
  maxOccupancy: z.coerce.number().int().min(1, { message: "Max occupancy must be at least 1" }),
  extraBedAllowed: z.boolean().default(false),
  extraBedPrice: z.coerce.number().nonnegative({ message: "Extra bed price must be a non-negative number" }),
  roomSize: z.coerce.number().positive({ message: "Room size must be a positive number" }),
  bedType: z.string().min(1, { message: "Bed type is required" }),
  bedCount: z.coerce.number().int().min(1, { message: "Bed count must be at least 1" }),
  amenities: z.array(z.string()).min(1, { message: "Select at least one amenity" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  isSmoking: z.boolean().default(false),
})

type FormValues = z.infer<typeof formSchema>

type CreateRoomFormProps = {
  onSuccess: () => void
}

export default function CreateRoomForm({ onSuccess }: CreateRoomFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { selectedHotel } = useHotelContext();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hotelId: selectedHotel?.id || "", 
      roomNumber: "",
      floor: 1,
      roomType: "DELUXE",
      pricePerNight: 200,
      baseOccupancy: 2,
      maxOccupancy: 2,
      extraBedAllowed: false,
      extraBedPrice: 0,
      roomSize: 30,
      bedType: "KING",
      bedCount: 1,
      amenities: ["WIFI"],
      description: "",
      isSmoking: false,
    },
  })

  // Update hotelId when selectedHotel changes
  useEffect(() => {
    if (selectedHotel?.id) {
      form.setValue("hotelId", selectedHotel.id);
      console.log("Hotel ID updated to:", selectedHotel.id);
    }
  }, [selectedHotel, form]);

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    setError(null)
  
    try {
      // Ensure we're using the latest hotel ID
      const submissionValues = {
        ...values,
        hotelId: selectedHotel?.id || values.hotelId
      };
      
      console.log("Submitting form with hotel ID:", submissionValues.hotelId);
      
      const response = await fetch("https://nexus-backend-uts0.onrender.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            mutation CreateRoom($roomData: RoomInput!) {
              createRoom(roomData: $roomData) {
                id
                roomNumber
                status
              }
            }
          `,
          variables: {
            roomData: submissionValues,  // Changed from 'input' to 'roomData'
          }
        })
      });
  
      const result = await response.json();
      console.log("GraphQL response:", result);
      
      if (result.errors) {
        throw new Error(result.errors[0].message || "Failed to create room");
      }
  
      onSuccess()
      form.reset({
        ...form.getValues(),
        hotelId: selectedHotel?.id || "",
        roomNumber: "",
        description: ""
      })
    } catch (err) {
      setError("Failed to create room. Please try again.")
      console.error(err)
    } finally {
      setIsSubmitting(false)
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
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="hotelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hotel ID</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly />
                    </FormControl>
                    <FormDescription>
                      This is automatically set based on the selected hotel
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roomNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Number</FormLabel>
                    <FormControl>
                      <Input placeholder="301" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="floor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Floor</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* The rest of your form fields remain the same */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="roomType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select room type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roomTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
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
                name="pricePerNight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price Per Night ($)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roomSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Size (m²)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="baseOccupancy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Occupancy</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxOccupancy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Occupancy</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="extraBedAllowed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Extra Bed Allowed</FormLabel>
                        <FormDescription>Allow an extra bed in this room</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {form.watch("extraBedAllowed") && (
                  <FormField
                    control={form.control}
                    name="extraBedPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Extra Bed Price ($)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="bedType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bed Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bed type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bedTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
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
                name="bedCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bed Count</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Luxury room with ocean view..." className="min-h-[100px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isSmoking"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Smoking Allowed</FormLabel>
                    <FormDescription>Allow smoking in this room</FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amenities"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Room Amenities</FormLabel>
                    <FormDescription>Select all amenities available in this room</FormDescription>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {amenitiesOptions.map((amenity) => (
                      <FormField
                        key={amenity.id}
                        control={form.control}
                        name="amenities"
                        render={({ field }) => {
                          return (
                            <FormItem key={amenity.id} className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(amenity.id)}
                                  onCheckedChange={(checked: boolean) => {
                                    return checked
                                      ? field.onChange([...field.value, amenity.id])
                                      : field.onChange(field.value?.filter((value: string) => value !== amenity.id))
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">{amenity.label}</FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Room...
                  </>
                ) : (
                  "Create Room"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  )
}