"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

// Updated interface to use bookingId instead of booking
export interface RoomUpgradeModalProps {
  onClose: () => void
  bookingId: string // Changed from booking to bookingId for clarity
  currentRoomType: string
}

export function RoomUpgradeModal({ onClose, bookingId, currentRoomType }: RoomUpgradeModalProps) {
  const [selectedRoom, setSelectedRoom] = useState(currentRoomType)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  
  // GraphQL endpoint
  const endpoint = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'https://nexus-backend-uts0.onrender.com/graphql'
  
  // Room upgrade options with prices
  const roomOptions = [
    { value: "Edited Single Bed", label: "Edited Single Bed (2 Avail)", priceChange: 0 },
    { value: "Premium Single Bed", label: "Premium Single Bed (2 Avail)", priceChange: 100 },
    { value: "Standard Double Room", label: "Standard Double Room (4 Avail)", priceChange: 150 },
    { value: "Deluxe Room", label: "Deluxe Room (1 Avail)", priceChange: 250 }
  ]
  
  const handleRoomChange = (value: string) => {
    setSelectedRoom(value)
  }
  
  const handleUpgrade = async () => {
    // Only proceed if room type actually changed
    if (selectedRoom === currentRoomType) {
      onClose()
      return
    }
    
    setLoading(true)
    try {
      const selectedOption = roomOptions.find(option => option.value === selectedRoom)
      const priceChange = selectedOption?.priceChange || 0
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            mutation ChangeRoomType($bookingId: ID!, $newRoomType: String!, $addCharge: Boolean, $amount: Float) {
              changeRoomType(
                bookingId: $bookingId
                newRoomType: $newRoomType
                addCharge: $addCharge
                amount: $amount
              ) {
                id
                bookingNumber
                roomType
                totalAmount
                roomCharges {
                  description
                  amount
                  chargeDate
                }
              }
            }
          `,
          variables: { 
            bookingId, 
            newRoomType: selectedRoom,
            addCharge: priceChange > 0,
            amount: priceChange
          }
        }),
      })
      
      const result = await response.json()
      
      if (result.errors) {
        throw new Error(result.errors[0].message)
      }
      
      toast({
        title: "Room Upgraded",
        description: `Successfully changed room to ${selectedRoom}${priceChange > 0 ? ` with additional charge of $${priceChange}` : ''}.`,
      })
      
      onClose()
    } catch (error) {
      console.error("Error upgrading room:", error)
      toast({
        title: "Error",
        description: "Failed to upgrade room. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg bg-white p-6"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Select New Room Category</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <RadioGroup defaultValue={currentRoomType} onValueChange={handleRoomChange}>
          <div className="space-y-4">
            {roomOptions.map((option) => (
              <div key={option.value} className="rounded-lg border p-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value}>{option.label}</Label>
                  <span className="ml-auto text-sm text-gray-500">
                    {option.priceChange === 0 ? 
                      '$0 Extra' : 
                      `$${option.priceChange} Extra`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </RadioGroup>
        
        <div className="mt-6 flex justify-end">
          <Button 
            className="bg-green-500 hover:bg-green-600"
            onClick={handleUpgrade}
            disabled={loading || selectedRoom === currentRoomType}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {selectedRoom === currentRoomType ? "No Change" : "Upgrade"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}