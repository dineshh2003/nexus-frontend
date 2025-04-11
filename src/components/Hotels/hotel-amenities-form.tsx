"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Loader2, Plus, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useHotelContext } from "@/providers/hotel-provider"
import type { Hotel } from "@/providers/hotel-provider"

// List of common hotel amenities (fixed the duplicate and formatting error)
const commonAmenities = [
  { id: "POOL", label: "Swimming Pool" },
  { id: "SPA", label: "Spa" },
  { id: "RESTAURANT", label: "Restaurant" },
  { id: "GYM", label: "Fitness Center/Gym" },
  { id: "WIFI", label: "Free WiFi" },
  { id: "PARKING", label: "Parking" },
  { id: "ROOM_SERVICE", label: "Room Service" },
  { id: "BAR", label: "Bar/Lounge" },
  { id: "BREAKFAST", label: "Breakfast Included" },
  { id: "CONFERENCE_ROOM", label: "Conference Room" },
  { id: "BUSINESS_CENTER", label: "Business Center" },
  { id: "CONCIERGE", label: "Concierge Service" },
  { id: "LAUNDRY", label: "Laundry Service" },
  { id: "AIRPORT_SHUTTLE", label: "Airport Shuttle" },
  { id: "PET_FRIENDLY", label: "Pet Friendly" },
  { id: "CHILDCARE", label: "Childcare Services" },
  { id: "VALET_PARKING", label: "Valet Parking" },
  { id: "HOT_TUB", label: "Hot Tub/Jacuzzi" },
  { id: "SAUNA", label: "Sauna" },
  { id: "TENNIS_COURT", label: "Tennis Court" },
  { id: "GOLF_COURSE", label: "Golf Course" },
  { id: "BEACH_ACCESS", label: "Beach Access" },
  { id: "WHEELCHAIR_ACCESSIBLE", label: "Wheelchair Accessible" },
  { id: "AIR_CONDITIONING", label: "Air Conditioning" },
  { id: "MINIBAR", label: "Minibar" },
  { id: "SAFE", label: "In-room Safe" },
]

type HotelAmenitiesFormProps = {
  onSuccess: () => void
}

export default function HotelAmenitiesForm({ onSuccess }: HotelAmenitiesFormProps ) {
  // Get the selected hotel from context
  const { selectedHotel, fetchUserHotels } = useHotelContext()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    selectedHotel?.amenities || []
  )
  const [customAmenity, setCustomAmenity] = useState("")
  const [activeTab, setActiveTab] = useState("current")

  const handleToggleAmenity = (amenityId: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenityId) ? prev.filter((id) => id !== amenityId) : [...prev, amenityId],
    )
  }

  const handleAddCustomAmenity = () => {
    if (customAmenity.trim() && !selectedAmenities.includes(customAmenity.trim())) {
      setSelectedAmenities((prev) => [...prev, customAmenity.trim()])
      setCustomAmenity("")
    }
  }

  const handleRemoveAmenity = (amenityId: string) => {
    setSelectedAmenities((prev) => prev.filter((id) => id !== amenityId))
  }

  const getAmenityLabel = (amenityId: string) => {
    const found = commonAmenities.find((a) => a.id === amenityId)
    return found ? found.label : amenityId
  }

  async function handleSaveAmenities() {
    if (!selectedHotel) {
      setError("No hotel selected. Please select a hotel first.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Make the GraphQL mutation call
      const response = await fetch("https://nexus-backend-uts0.onrender.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            mutation UpdateHotelAmenities($hotelId: ID!, $amenities: [String!]!) {
              hotel {
                updateHotelAmenities(hotelId: $hotelId, amenities: $amenities) {
                  id
                  name
                  amenities
                  updatedAt
                }
              }
            }
          `,
          variables: {
            hotelId: selectedHotel.id,
            amenities: selectedAmenities
          }
        }),
      })

      const result = await response.json()
      
      if (result.errors) {
        throw new Error(result.errors[0].message || "Failed to update hotel amenities")
      }

      // Refresh the hotel data
      await fetchUserHotels()
      
      // Call the success callback
      onSuccess()
    } catch (err) {
      setError("Failed to update hotel amenities. Please try again.")
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // If no hotel is selected, show a message
  if (!selectedHotel) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Hotel Selected</AlertTitle>
        <AlertDescription>Please select a hotel to manage its amenities.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-4">
        <h2 className="text-xl font-bold">Managing Amenities for: {selectedHotel.name}</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="current">Current Amenities</TabsTrigger>
          <TabsTrigger value="add">Add Amenities</TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <Card>
            <CardHeader>
              <CardTitle>Current Amenities</CardTitle>
              <CardDescription>These are the amenities currently offered at your hotel.</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedAmenities.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No amenities have been added yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedAmenities.map((amenity) => (
                    <Badge key={amenity} variant="secondary" className="py-2 px-3">
                      {getAmenityLabel(amenity)}
                      <button
                        onClick={() => handleRemoveAmenity(amenity)}
                        className="ml-2 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>Add Amenities</CardTitle>
              <CardDescription>Select from common amenities or add custom ones.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label htmlFor="custom-amenity">Custom Amenity</Label>
                    <Input
                      id="custom-amenity"
                      value={customAmenity}
                      onChange={(e) => setCustomAmenity(e.target.value)}
                      placeholder="Enter custom amenity"
                    />
                  </div>
                  <Button onClick={handleAddCustomAmenity} disabled={!customAmenity.trim()} size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>

                <div>
                  <Label className="mb-2 block">Common Amenities</Label>
                  <ScrollArea className="h-[300px] border rounded-md p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {commonAmenities.map((amenity) => (
                        <div key={amenity.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`amenity-${amenity.id}`}
                            checked={selectedAmenities.includes(amenity.id)}
                            onCheckedChange={() => handleToggleAmenity(amenity.id)}
                          />
                          <label
                            htmlFor={`amenity-${amenity.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {amenity.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button onClick={handleSaveAmenities} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Amenities"
          )}
        </Button>
      </div>
    </div>
  )
}