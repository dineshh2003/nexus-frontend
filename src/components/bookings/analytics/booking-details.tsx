"use client"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useSession } from "next-auth/react"
import { useToast } from "@/components/ui/use-toast"
import { Booking, Room } from "./booking-analytics"

interface ConfirmDialog {
  open: boolean;
  title: string;
  description: string;
  action: () => void;
}

interface BookingDetailsProps {
  booking: Booking;
  onClose: () => void;
  roomDetails?: Room; // Optional detailed room information
  onRefresh?: () => void; // Added callback for parent refresh
}

export default function BookingDetails({ booking, onClose, roomDetails, onRefresh }: BookingDetailsProps) {
  const [activeTab, setActiveTab] = useState<string>("booking-details")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({
    open: false,
    title: "",
    description: "",
    action: () => {},
  })

  const { data: session } = useSession()
  const { toast } = useToast()

  const handleModifyDates = () => {
    setConfirmDialog({
      open: true,
      title: "Modify Booking Dates",
      description: "Are you sure you want to modify the dates for this booking?",
      action: async () => {
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
                mutation {
                  updateBooking(
                    bookingId: "${booking.id}",
                    input: {
                      checkInDate: "${booking.checkInDate}",
                      checkOutDate: "${booking.checkOutDate}"
                    }
                  ) {
                    id
                    checkInDate
                    checkOutDate
                  }
                }
              `
            }),
          })
          
          const result = await response.json()
          if (result.data?.updateBooking) {
            toast({
              title: "Success",
              description: "Booking dates updated successfully",
            })
            // Call the refresh callback if provided
            if (onRefresh) onRefresh();
          } else {
            throw new Error("Failed to update booking dates")
          }
        } catch (error) {
          console.error("Error updating booking dates:", error)
          toast({
            title: "Error",
            description: "Failed to update booking dates",
            variant: "destructive"
          })
        } finally {
          setIsLoading(false)
          setConfirmDialog((prev) => ({ ...prev, open: false }))
        }
      },
    })
  }

  const handleChangeOccupancy = () => {
    setConfirmDialog({
      open: true,
      title: "Change Occupancy",
      description: "Are you sure you want to change the occupancy for this booking?",
      action: async () => {
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
                mutation {
                  updateBooking(
                    bookingId: "${booking.id}",
                    input: {
                      numberOfGuests: ${booking.numberOfGuests}
                    }
                  ) {
                    id
                    numberOfGuests
                  }
                }
              `
            }),
          })
          
          const result = await response.json()
          if (result.data?.updateBooking) {
            toast({
              title: "Success",
              description: "Occupancy updated successfully",
            })
            if (onRefresh) onRefresh();
          } else {
            throw new Error("Failed to update occupancy")
          }
        } catch (error) {
          console.error("Error updating occupancy:", error)
          toast({
            title: "Error",
            description: "Failed to update occupancy",
            variant: "destructive"
          })
        } finally {
          setIsLoading(false)
          setConfirmDialog((prev) => ({ ...prev, open: false }))
        }
      },
    })
  }

  const handleCheckout = async () => {
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
            mutation {
              updateBookingStatus(
                bookingId: "${booking.id}",
                status: "CHECKED_OUT"
              ) {
                id
                bookingStatus
              }
            }
          `
        }),
      })
      
      const result = await response.json()
      if (result.data?.updateBookingStatus) {
        toast({
          title: "Success",
          description: "Guest checked out successfully",
        })
        if (onRefresh) onRefresh();
        onClose()
      } else {
        throw new Error("Failed to check out guest")
      }
    } catch (error) {
      console.error("Error during checkout:", error)
      toast({
        title: "Error",
        description: "Failed to check out guest",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckin = async () => {
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
            mutation {
              updateBookingStatus(
                bookingId: "${booking.id}",
                status: "CHECKED_IN"
              ) {
                id
                bookingStatus
              }
            }
          `
        }),
      })
      
      const result = await response.json()
      if (result.data?.updateBookingStatus) {
        toast({
          title: "Success",
          description: "Guest checked in successfully",
        })
        if (onRefresh) onRefresh();
        onClose()
      } else {
        throw new Error("Failed to check in guest")
      }
    } catch (error) {
      console.error("Error during check-in:", error)
      toast({
        title: "Error",
        description: "Failed to check in guest",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddBill = () => {
    setConfirmDialog({
      open: true,
      title: "Add Charges",
      description: "Add additional charges to this booking?",
      action: async () => {
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
                mutation {
                  addRoomCharge(
                    bookingId: "${booking.id}",
                    input: {
                      amount: 50,
                      chargeDate: "${new Date().toISOString()}",
                      chargeType: "EXTRA_SERVICE",
                      description: "Room service"
                    }
                  ) {
                    id
                    totalAmount
                    roomCharges {
                      amount
                      chargeType
                    }
                  }
                }
              `
            }),
          })
          
          const result = await response.json()
          if (result.data?.addRoomCharge) {
            toast({
              title: "Success",
              description: "Charges added successfully",
            })
            if (onRefresh) onRefresh();
          } else {
            throw new Error("Failed to add charges")
          }
        } catch (error) {
          console.error("Error adding charges:", error)
          toast({
            title: "Error",
            description: "Failed to add charges",
            variant: "destructive"
          })
        } finally {
          setIsLoading(false)
          setConfirmDialog((prev) => ({ ...prev, open: false }))
        }
      },
    })
  }

  const handleCollectPayment = () => {
    setConfirmDialog({
      open: true,
      title: "Collect Payment",
      description: "Process payment collection for this booking?",
      action: async () => {
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
                mutation {
                  addPayment(
                    bookingId: "${booking.id}",
                    input: {
                      amount: ${booking.pendingAmount || booking.totalAmount},
                      paymentMethod: "CASH",
                      transactionId: "${Date.now()}",
                      transactionDate: "${new Date().toISOString()}"
                    }
                  ) {
                    id
                    paymentStatus
                    payments {
                      amount
                      status
                    }
                  }
                }
              `
            }),
          })
          
          const result = await response.json()
          if (result.data?.addPayment) {
            toast({
              title: "Success",
              description: "Payment collected successfully",
            })
            if (onRefresh) onRefresh();
          } else {
            throw new Error("Failed to collect payment")
          }
        } catch (error) {
          console.error("Error collecting payment:", error)
          toast({
            title: "Error",
            description: "Failed to collect payment",
            variant: "destructive"
          })
        } finally {
          setIsLoading(false)
          setConfirmDialog((prev) => ({ ...prev, open: false }))
        }
      },
    })
  }

  const handlePinRoom = () => {
    if (!booking.roomId) {
      toast({
        title: "Error",
        description: "No room associated with this booking",
        variant: "destructive"
      })
      return
    }

    setConfirmDialog({
      open: true,
      title: "Pin Room",
      description: "Are you sure you want to pin this room? This will mark it as a priority for housekeeping.",
      action: async () => {
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
                mutation {
                  updateRoom(
                    roomId: "${booking.roomId}",
                    input: {
                      isPinned: true
                    }
                  ) {
                    id
                    isPinned
                  }
                }
              `
            }),
          })
          
          const result = await response.json()
          if (result.data?.updateRoom) {
            toast({
              title: "Success",
              description: "Room pinned successfully",
            })
            if (onRefresh) onRefresh();
          } else {
            throw new Error("Failed to pin room")
          }
        } catch (error) {
          console.error("Error pinning room:", error)
          toast({
            title: "Error",
            description: "Failed to pin room",
            variant: "destructive"
          })
        } finally {
          setIsLoading(false)
          setConfirmDialog((prev) => ({ ...prev, open: false }))
        }
      },
    })
  }

  const handleUnpinRoom = () => {
    if (!booking.roomId) {
      toast({
        title: "Error",
        description: "No room associated with this booking",
        variant: "destructive"
      })
      return
    }
    
    setConfirmDialog({
      open: true,
      title: "Unpin Room",
      description: "Are you sure you want to unpin this room?",
      action: async () => {
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
                mutation {
                  updateRoom(
                    roomId: "${booking.roomId}",
                    input: {
                      isPinned: false
                    }
                  ) {
                    id
                    isPinned
                  }
                }
              `
            }),
          })
          
          const result = await response.json()
          if (result.data?.updateRoom) {
            toast({
              title: "Success",
              description: "Room unpinned successfully",
            })
            if (onRefresh) onRefresh();
          } else {
            throw new Error("Failed to unpin room")
          }
        } catch (error) {
          console.error("Error unpinning room:", error)
          toast({
            title: "Error",
            description: "Failed to unpin room",
            variant: "destructive"
          })
        } finally {
          setIsLoading(false)
          setConfirmDialog((prev) => ({ ...prev, open: false }))
        }
      },
    })
  }

  const handleUpdateRoom = () => {
    if (!booking.roomId) {
      toast({
        title: "Error",
        description: "No room associated with this booking",
        variant: "destructive"
      })
      return
    }
    
    setConfirmDialog({
      open: true,
      title: "Update Room Status",
      description: "Update the room status for this booking?",
      action: async () => {
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
                mutation {
                  updateRoom(
                    roomId: "${booking.roomId}",
                    input: {
                      status: "MAINTENANCE"
                    }
                  ) {
                    id
                    status
                  }
                }
              `
            }),
          })
          
          const result = await response.json()
          if (result.data?.updateRoom) {
            toast({
              title: "Success",
              description: "Room status updated successfully",
            })
            if (onRefresh) onRefresh();
          } else {
            throw new Error("Failed to update room status")
          }
        } catch (error) {
          console.error("Error updating room status:", error)
          toast({
            title: "Error",
            description: "Failed to update room status",
            variant: "destructive"
          })
        } finally {
          setIsLoading(false)
          setConfirmDialog((prev) => ({ ...prev, open: false }))
        }
      },
    })
  }

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd MMM - dd MMM")
    } catch (e) {
      return "Invalid date"
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const handleAddNote = async (note: string) => {
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
            mutation {
              updateBooking(
                bookingId: "${booking.id}",
                input: {
                  notes: "${note}"
                }
              ) {
                id
                notes
              }
            }
          `
        }),
      })
      
      const result = await response.json()
      if (result.data?.updateBooking) {
        toast({
          title: "Success",
          description: "Note added successfully",
        })
        if (onRefresh) onRefresh();
      } else {
        throw new Error("Failed to add note")
      }
    } catch (error) {
      console.error("Error adding note:", error)
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="fixed inset-y-0 right-0 w-full max-w-md shadow-xl border-l z-50 overflow-auto">
      <div className="sticky top-0 bg-background z-10 border-b">
        <div className="flex justify-between items-center p-4">
          <h3 className="text-lg font-semibold">Room {booking.roomNumber}</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="booking-details" className="flex-1">
              Booking Details
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex-1">
              Notes/To Do
            </TabsTrigger>
            {roomDetails && (
              <TabsTrigger value="room-details" className="flex-1">
                Room Info
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </div>

      <CardContent className="p-0">
        <TabsContent value="booking-details" className="m-0">
          <div className="p-4 border-b">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold">
                  {booking.guest.firstName} {booking.guest.lastName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {booking.guest.email}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{booking.bookingNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {booking.externalReference ? `Booking.com #${booking.externalReference}` : "Direct Booking"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 border-b">
            <div className="flex justify-between items-center mb-2">
              <div>
                <p className="text-sm font-medium">Dates</p>
                <p className="text-base">{formatDate(`${booking.checkInDate}`)}</p>
                <p className="text-sm">{booking.roomNumber}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleModifyDates}>
                Modify
              </Button>
            </div>
          </div>

          <div className="p-4 border-b">
            <div className="flex justify-between items-center mb-2">
              <div>
                <p className="text-sm font-medium">Guests</p>
                <p className="text-base">
                  {booking.numberOfGuests} Adults, {booking.children || 0} Kids
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleChangeOccupancy}>
                Change Occupancy
              </Button>
            </div>
          </div>

          <div className="p-4 border-b">
            <div className="mb-2">
              <p className="text-sm font-medium">Total Bill</p>
              <p className="text-xl font-bold">{formatCurrency(booking.totalAmount)}</p>
            </div>
            <div className="mb-2">
              <p className="text-sm font-medium">Pending Amount</p>
              <p className="text-base">{formatCurrency(booking.pendingAmount || 0)}</p>
            </div>
          </div>

          <div className="p-4 grid grid-cols-2 gap-3">
            {booking.bookingStatus === "CHECKED_IN" && (
              <Button 
                className="bg-red-500 hover:bg-red-600 text-white" 
                onClick={handleCheckout} 
                disabled={isLoading}
              >
                Checkout
              </Button>
            )}
            {booking.bookingStatus === "CONFIRMED" && (
              <Button 
                className="bg-green-500 hover:bg-green-600 text-white" 
                onClick={handleCheckin} 
                disabled={isLoading}
              >
                Checkin
              </Button>
            )}
            <Button variant="outline" onClick={() => setActiveTab("notes")}>
              View Notes
            </Button>
            {roomDetails && (
              <Button variant="outline" onClick={() => setActiveTab("room-details")}>
                Room Details
              </Button>
            )}
          </div>

          <div className="p-4 grid grid-cols-3 gap-3">
            <Button variant="outline" size="sm" onClick={handleAddBill}>
              Add Bill
            </Button>
            <Button variant="outline" size="sm" onClick={handleCollectPayment}>
              Collect Payment
            </Button>
            {booking.bookingStatus !== "CHECKED_IN" && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCheckin}
                disabled={booking.bookingStatus === "CHECKED_OUT" || booking.bookingStatus === "CANCELLED"}
              >
                Checkin
              </Button>
            )}
          </div>

          <div className="p-4 grid grid-cols-3 gap-3">
            <Button variant="outline" size="sm" onClick={handlePinRoom}>
              Pin Room
            </Button>
            <Button variant="outline" size="sm" onClick={handleUnpinRoom}>
              Unpin Room
            </Button>
            <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={handleUpdateRoom}>
              Update Room
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="notes" className="m-0 p-4">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Notes</h3>
            <div className="border rounded-md p-3 bg-muted/30">
              <p className="text-sm">{booking.notes || "No notes available for this booking."}</p>
            </div>

            <h3 className="text-lg font-medium mt-6">To Do</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="todo-1" className="rounded" />
                <label htmlFor="todo-1" className="text-sm">
                  Prepare welcome package
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="todo-2" className="rounded" />
                <label htmlFor="todo-2" className="text-sm">
                  Verify payment method
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="todo-3" className="rounded" />
                <label htmlFor="todo-3" className="text-sm">
                  Check special requests
                </label>
              </div>
            </div>

            <div className="pt-4">
              <Button className="w-full" onClick={() => {
                const note = prompt("Enter a new note:");
                if (note) handleAddNote(note);
              }}>
                Add New Note
              </Button>
            </div>
          </div>
        </TabsContent>

        {roomDetails && (
          <TabsContent value="room-details" className="m-0 p-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Room Information</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Room Number</p>
                  <p className="font-medium">{roomDetails.roomNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Room Type</p>
                  <p className="font-medium">{roomDetails.roomType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Floor</p>
                  <p className="font-medium">{roomDetails.floor}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{roomDetails.status}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bed Type</p>
                  <p className="font-medium">{roomDetails.bedType || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="font-medium">{formatCurrency(roomDetails.pricePerNight)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Max Occupancy</p>
                  <p className="font-medium">{roomDetails.maxOccupancy || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Room Size</p>
                  <p className="font-medium">{roomDetails.roomSize ? `${roomDetails.roomSize} sqm` : "N/A"}</p>
                </div>
              </div>

              {roomDetails.amenities && roomDetails.amenities.length > 0 && (
                <div>
                  <h4 className="text-md font-medium mt-4 mb-2">Amenities</h4>
                  <div className="flex flex-wrap gap-2">
                    {roomDetails.amenities.map((amenity, index) => (
                      <span key={index} className="px-2 py-1 bg-muted rounded-md text-xs">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {roomDetails.description && (
                <div>
                  <h4 className="text-md font-medium mt-4 mb-2">Description</h4>
                  <p className="text-sm">{roomDetails.description}</p>
                </div>
              )}

              {roomDetails.lastCleaned && (
                <div>
                  <h4 className="text-md font-medium mt-4 mb-2">Housekeeping</h4>
                  <p className="text-sm">Last Cleaned: {format(parseISO(roomDetails.lastCleaned), "dd MMM yyyy")}</p>
                  {roomDetails.lastMaintained && (
                    <p className="text-sm">Last Maintained: {format(parseISO(roomDetails.lastMaintained), "dd MMM yyyy")}</p>
                  )}
                  {roomDetails.maintenanceNotes && (
                    <p className="text-sm mt-2">Maintenance Notes: {roomDetails.maintenanceNotes}</p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </CardContent>

      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}>
              Cancel
            </Button>
            <Button onClick={confirmDialog.action} disabled={isLoading}>
              {isLoading ? "Processing..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}