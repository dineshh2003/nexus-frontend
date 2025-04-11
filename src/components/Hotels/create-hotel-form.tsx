"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useSession } from "next-auth/react"

const amenitiesOptions = [
  { id: "POOL", label: "Swimming Pool" },
  { id: "SPA", label: "Spa" },
  { id: "RESTAURANT", label: "Restaurant" },
  { id: "GYM", label: "Fitness Center/Gym" },
  { id: "WIFI", label: "Free WiFi" },
  { id: "PARKING", label: "Parking" },
  { id: "ROOM_SERVICE", label: "Room Service" },
  { id: "BAR", label: "Bar/Lounge" },
]

const paymentMethods = [
  { id: "CREDIT_CARD", label: "Credit Card" },
  { id: "DEBIT_CARD", label: "Debit Card" },
  { id: "CASH", label: "Cash" },
  { id: "CRYPTO", label: "Cryptocurrency" },
]

const petPolicyOptions = [
  { value: "ALLOWED", label: "Pets Allowed" },
  { value: "ALLOWED_WITH_FEE", label: "Pets Allowed with Fee" },
  { value: "ALLOWED_WITH_RESTRICTIONS", label: "Pets Allowed with Restrictions" },
  { value: "NOT_ALLOWED", label: "Pets Not Allowed" },
]

const formSchema = z.object({
  // Basic Info
  name: z.string().min(2, { message: "Hotel name must be at least 2 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  contactPhone: z.string().min(5, { message: "Phone number is required." }),
  contactEmail: z.string().email({ message: "Please enter a valid email address." }),
  website: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal("")),
  floorCount: z.coerce.number().int().positive({ message: "Floor count must be a positive number." }),
  starRating: z.coerce.number().min(1).max(5, { message: "Star rating must be between 1 and 5." }),

  // Location
  address: z.string().min(3, { message: "Address must be at least 3 characters." }),
  city: z.string().min(2, { message: "City is required." }),
  state: z.string().min(1, { message: "State/Province is required." }),
  country: z.string().min(2, { message: "Country is required." }),
  zipcode: z.string().min(1, { message: "Postal/Zip code is required." }),
  latitude: z.coerce.number().min(-90).max(90, { message: "Latitude must be between -90 and 90." }),
  longitude: z.coerce.number().min(-180).max(180, { message: "Longitude must be between -180 and 180." }),

  // Policies
  checkInTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Please enter a valid time in 24-hour format (HH:MM).",
  }),
  checkOutTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Please enter a valid time in 24-hour format (HH:MM).",
  }),
  cancellationHours: z.coerce.number().int().min(0, {
    message: "Cancellation hours must be a positive number.",
  }),
  paymentMethods: z.array(z.string()).min(1, {
    message: "Select at least one payment method.",
  }),
  petPolicy: z.string(),

  // Amenities
  amenities: z.array(z.string()),

  // Admin
  adminId: z.string().min(1, { message: "Admin ID is required." }),
})

type FormValues = z.infer<typeof formSchema>

type CreateHotelFormProps = {
  onSuccess: (hotelId: string) => void
}

export default function CreateHotelForm({ onSuccess }: CreateHotelFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("basic-info")
  const { data: session } = useSession()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      contactPhone: "",
      contactEmail: "",
      website: "",
      floorCount: 1,
      starRating: 3,
      address: "",
      city: "",
      state: "",
      country: "",
      zipcode: "",
      latitude: 0,
      longitude: 0,
      checkInTime: "14:00",
      checkOutTime: "11:00",
      cancellationHours: 24,
      paymentMethods: ["CREDIT_CARD"],
      petPolicy: "ALLOWED",
      amenities: [],
      adminId: session?.user.id, 
    },
  })

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    setError(null)
  
    try {
      // Make the actual GraphQL mutation call
      const response = await fetch("https://nexus-backend-uts0.onrender.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            mutation CreateHotel($hotelData: HotelInput!) {
              createHotel(hotelData: $hotelData) {
                id
                name
                status
                starRating
                policies {
                  checkInTime
                  checkOutTime
                  petPolicy
                }
              }
            }
          `,
          variables: {
            hotelData: {
              name: values.name,
              description: values.description,
              address: values.address,
              city: values.city,
              state: values.state,
              country: values.country,
              zipcode: values.zipcode,
              latitude: values.latitude,
              longitude: values.longitude,
              contactPhone: values.contactPhone,
              contactEmail: values.contactEmail,
              website: values.website,
              adminId: values.adminId,
              floorCount: values.floorCount,
              starRating: values.starRating,
              amenities: values.amenities,
              policies: {
                checkInTime: values.checkInTime,
                checkOutTime: values.checkOutTime,
                cancellationHours: values.cancellationHours,
                paymentMethods: values.paymentMethods,
                petPolicy: values.petPolicy,
              }
            }
          }
        }),
      });
  
      const result = await response.json();
      
      if (result.errors) {
        throw new Error(result.errors[0].message || "An error occurred");
      }
      
      // Extract the hotel ID from the response
      const newHotelId = result.data.createHotel.id;
      onSuccess(newHotelId);
    } catch (err) {
      setError("Failed to create hotel. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  const nextTab = () => {
    if (activeTab === "basic-info") setActiveTab("location")
    else if (activeTab === "location") setActiveTab("policies")
    else if (activeTab === "policies") setActiveTab("amenities")
  }

  const prevTab = () => {
    if (activeTab === "amenities") setActiveTab("policies")
    else if (activeTab === "policies") setActiveTab("location")
    else if (activeTab === "location") setActiveTab("basic-info")
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="basic-info">Basic Info</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="amenities">Amenities</TabsTrigger>
          </TabsList>

          <TabsContent value="basic-info" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hotel Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Grand Hotel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="starRating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Star Rating</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number.parseInt(value))}
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select star rating" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 Star</SelectItem>
                        <SelectItem value="2">2 Stars</SelectItem>
                        <SelectItem value="3">3 Stars</SelectItem>
                        <SelectItem value="4">4 Stars</SelectItem>
                        <SelectItem value="5">5 Stars</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Textarea
                      placeholder="A luxury hotel in the heart of the city..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1-212-555-0123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input placeholder="info@grandhotel.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://grandhotel.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="floorCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Floor Count</FormLabel>
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
              name="adminId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Administrator ID</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>ID of the user who will administer this hotel</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="button" onClick={nextTab}>
                Next: Location
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="location" className="space-y-6">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main Street" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="New York" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Province</FormLabel>
                    <FormControl>
                      <Input placeholder="NY" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="USA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zipcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal/Zip Code</FormLabel>
                    <FormControl>
                      <Input placeholder="10001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.000001" placeholder="40.7128" {...field} />
                    </FormControl>
                    <FormDescription>Value between -90 and 90</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.000001" placeholder="-74.0060" {...field} />
                    </FormControl>
                    <FormDescription>Value between -180 and 180</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={prevTab}>
                Back: Basic Info
              </Button>
              <Button type="button" onClick={nextTab}>
                Next: Policies
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="policies" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="checkInTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-in Time</FormLabel>
                    <FormControl>
                      <Input placeholder="14:00" {...field} />
                    </FormControl>
                    <FormDescription>Format: 24-hour (HH:MM)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="checkOutTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-out Time</FormLabel>
                    <FormControl>
                      <Input placeholder="11:00" {...field} />
                    </FormControl>
                    <FormDescription>Format: 24-hour (HH:MM)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cancellationHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cancellation Period</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormDescription>Hours before check-in</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="petPolicy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pet Policy</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select pet policy" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {petPolicyOptions.map((option) => (
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
              name="paymentMethods"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Accepted Payment Methods</FormLabel>
                    <FormDescription>Select all payment methods accepted by your hotel.</FormDescription>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {paymentMethods.map((method) => (
                      <FormField
                        key={method.id}
                        control={form.control}
                        name="paymentMethods"
                        render={({ field }) => {
                          return (
                            <FormItem key={method.id} className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(method.id)}
                                  onCheckedChange={(checked: boolean) => {
                                    return checked
                                      ? field.onChange([...field.value, method.id])
                                      : field.onChange(field.value?.filter((value: string) => value !== method.id))
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">{method.label}</FormLabel>
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

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={prevTab}>
                Back: Location
              </Button>
              <Button type="button" onClick={nextTab}>
                Next: Amenities
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="amenities" className="space-y-6">
            <FormField
              control={form.control}
              name="amenities"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Hotel Amenities</FormLabel>
                    <FormDescription>Select all amenities available at your hotel.</FormDescription>
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

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={prevTab}>
                Back: Policies
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Hotel...
                  </>
                ) : (
                  "Create Hotel"
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  )
}

