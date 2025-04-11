"use client"

import { useState, useEffect } from "react"
import { AnimatePresence } from "framer-motion"
import { MoreVertical, 
  ArrowLeft, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  LogOut,
  ChevronDown} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RoomUpgradeModal } from "../bookings/room-upgrade-modal"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu"

// Fixed interface to use 'booking' instead of 'bookingId'
interface BookingDetailsProps {
  booking: string 
  onBack: () => void
}

export function BookingDetails({ booking, onBack }: BookingDetailsProps) {
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false)
  const [bookingData, setBookingData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [statusLoading, setStatusLoading] = useState(false)
  const [extendLoading, setExtendLoading] = useState(false)
  const [collectPaymentLoading, setCollectPaymentLoading] = useState(false)
  const { toast } = useToast()

  // GraphQL endpoint
  const endpoint = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'https://nexus-backend-uts0.onrender.com/graphql'

  useEffect(() => {
    fetchBookingDetails()
  }, [booking])

  const fetchBookingDetails = async () => {
    setLoading(true)
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            query bookingId($bookingId: String!) {
              booking(bookingId: $bookingId) {
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
                numberOfGuests
                numberOfRooms
                baseAmount
                taxAmount
                payments {
                  method
                  amount
                  transactionId
                  transactionDate
                  status
                  notes
                }
                roomCharges {
                  description
                  amount
                  chargeType
                  chargeDate
                  notes
                }
              }
            }
          `,
          variables: { bookingId: booking }
        }),
      })
      
      const result = await response.json()
      
      if (result.errors) {
        throw new Error(result.errors[0].message)
      }
      
      setBookingData(result.data.booking)
    } catch (error) {
      console.error("Error fetching booking details:", error)
      toast({
        title: "Error",
        description: "Failed to load booking details. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    setStatusLoading(true)
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            mutation CheckInBooking ($bookingId: String!, $status: BookingStatus!, $notes: String) {
              updateBookingStatus(
                bookingId: $bookingId
                status: $status
                notes: $notes
              ) {
                id
                bookingNumber
                bookingStatus
                checkInTime
                updatedAt
              }
            }
          `,
          variables: { 
            bookingId: booking, 
            status: newStatus,
            notes: `Status changed to ${newStatus} at ${format(new Date(), "h:mm a")}` 
          }
        }),
      })
      
      const result = await response.json()
      
      if (result.errors) {
        throw new Error(result.errors[0].message)
      }
      
      // Update local booking status
      setBookingData({
        ...bookingData,
        bookingStatus: newStatus,
        ...(newStatus === "CHECKED_IN" ? { checkInTime: new Date().toISOString() } : {})
      })
      
      let successMessage = "";
      switch(newStatus) {
        case "PENDING": successMessage = "Booking marked as pending"; break;
        case "CONFIRMED": successMessage = "Booking confirmed successfully"; break;
        case "CHECKED_IN": successMessage = "Guest successfully checked in"; break;
        case "CHECKED_OUT": successMessage = "Guest successfully checked out"; break;
        case "CANCELLED": successMessage = "Booking cancelled"; break;
        case "NO_SHOW": successMessage = "Guest marked as no-show"; break;
        default: successMessage = "Booking status updated";
      }
      
      toast({
        title: "Success",
        description: successMessage,
      })
    } catch (error) {
      console.error("Error updating booking status:", error)
      toast({
        title: "Error",
        description: "Failed to update booking status. Please try again.",
        variant: "destructive"
      })
    } finally {
      setStatusLoading(false)
    }
  }

  const handleExtendBooking = async (newCheckOutDate: string) => {
    setExtendLoading(true)
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            mutation ExtendBooking($bookingId: String!, $newCheckOutDate: String!, $notes: String) {
              extendBooking(
                bookingId: $bookingId
                newCheckOutDate: $newCheckOutDate
                notes: $notes
              ) {
                id
                bookingNumber
                checkInDate
                checkOutDate
                baseAmount
                taxAmount
                totalAmount
                updatedAt
              }
            }
          `,
          variables: { 
            bookingId: booking, 
            newCheckOutDate,
            notes: "Guest extended stay" 
          }
        }),
      })
      
      const result = await response.json()
      
      if (result.errors) {
        throw new Error(result.errors[0].message)
      }
      
      // Update local booking data
      setBookingData({
        ...bookingData,
        checkOutDate: result.data.extendBooking.checkOutDate,
        baseAmount: result.data.extendBooking.baseAmount,
        taxAmount: result.data.extendBooking.taxAmount,
        totalAmount: result.data.extendBooking.totalAmount
      })
      
      setIsExtendModalOpen(false)
      toast({
        title: "Success",
        description: "Booking successfully extended!",
      })
    } catch (error) {
      console.error("Error extending booking:", error)
      toast({
        title: "Error",
        description: "Failed to extend booking. Please try again.",
        variant: "destructive"
      })
    } finally {
      setExtendLoading(false)
    }
  }

  const handleCollectPayment = async () => {
    setCollectPaymentLoading(true)
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            mutation AddPayment($bookingId: String!, $paymentData: PaymentInput!) {
              addPayment(
                bookingId: $bookingId
                paymentData: $paymentData
              ) {
                id
                bookingNumber
                paymentStatus
                totalAmount
                payments {
                  method
                  amount
                  transactionId
                  transactionDate
                  status
                  notes
                }
              }
            }
          `,
          variables: { 
            bookingId: booking, 
            paymentData: {
              method: "credit_card",
              amount: bookingData?.totalAmount || 0,
              transactionId: `txn_${Date.now()}`,
              notes: "Full payment collected at check-in"
            }
          }
        }),
      })
      
      const result = await response.json()
      
      if (result.errors) {
        throw new Error(result.errors[0].message)
      }
      
      // Update local booking data
      setBookingData({
        ...bookingData,
        paymentStatus: result.data.addPayment.paymentStatus,
        payments: result.data.addPayment.payments
      })
      
      toast({
        title: "Success",
        description: "Payment successfully collected!",
      })
    } catch (error) {
      console.error("Error collecting payment:", error)
      toast({
        title: "Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive"
      })
    } finally {
      setCollectPaymentLoading(false)
    }
  }

  const handleAddRoomCharge = async (description: string, amount: number, chargeType: string, notes: string) => {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            mutation AddRoomCharge($bookingId: String!, $description: String!, $amount: Float!, $chargeType: String!, $notes: String) {
              addRoomCharge(
                bookingId: $bookingId
                description: $description
                amount: $amount
                chargeType: $chargeType
                notes: $notes
              ) {
                id
                bookingNumber
                totalAmount
                roomCharges {
                  description
                  amount
                  chargeType
                  chargeDate
                  notes
                }
              }
            }
          `,
          variables: { 
            bookingId: booking,
            description,
            amount,
            chargeType,
            notes
          }
        }),
      })
      
      const result = await response.json()
      
      if (result.errors) {
        throw new Error(result.errors[0].message)
      }
      
      // Update local booking data
      setBookingData({
        ...bookingData,
        totalAmount: result.data.addRoomCharge.totalAmount,
        roomCharges: result.data.addRoomCharge.roomCharges
      })
      
      toast({
        title: "Success",
        description: `${description} charge added successfully!`,
      })
    } catch (error) {
      console.error("Error adding room charge:", error)
      toast({
        title: "Error",
        description: "Failed to add room charge. Please try again.",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (!bookingData) {
    return (
      <div className="container mx-auto">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bookings
        </Button>
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold">Booking Not Found</h2>
          <p className="text-gray-500 mt-2">The requested booking could not be found.</p>
        </div>
      </div>
    )
  }

  // Calculate payments collected total
  const paymentsCollected = bookingData.payments?.reduce((sum: number, payment: any) => 
    sum + (Number(payment.amount) || 0), 0) || 0
  
  // Calculate balance to collect
  const balanceToCollect = Number(bookingData.totalAmount) - paymentsCollected

  // Calculate nights between dates
  const calculateNights = (checkInDate: string, checkOutDate: string): number => {
    if (!checkInDate || !checkOutDate) return 1
    
    const checkIn = new Date(checkInDate)
    const checkOut = new Date(checkOutDate)
    
    const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays || 1
  }

  // Format date
  const formatDate = (dateString: string): string => {
    if (!dateString) return ''
    
    const date = new Date(dateString)
    return format(date, 'dd MMM')
  }

  
  if (loading) {
    return (
      <div className="container mx-auto flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (!bookingData) {
    return (
      <div className="container mx-auto">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bookings
        </Button>
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold">Booking Not Found</h2>
          <p className="text-gray-500 mt-2">The requested booking could not be found.</p>
        </div>
      </div>
    )
  }

  // Get status icon and color
  const getStatusDetails = (status: string) => {
    switch(status) {
      case "PENDING":
        return { icon: <AlertCircle className="h-5 w-5" />, color: "text-yellow-500 bg-yellow-50" };
      case "CONFIRMED":
        return { icon: <CheckCircle className="h-5 w-5" />, color: "text-blue-500 bg-blue-50" };
      case "CHECKED_IN":
        return { icon: <CheckCircle className="h-5 w-5" />, color: "text-green-500 bg-green-50" };
      case "CHECKED_OUT":
        return { icon: <LogOut className="h-5 w-5" />, color: "text-purple-500 bg-purple-50" };
      case "CANCELLED":
        return { icon: <XCircle className="h-5 w-5" />, color: "text-red-500 bg-red-50" };
      case "NO_SHOW":
        return { icon: <XCircle className="h-5 w-5" />, color: "text-orange-500 bg-orange-50" };
      default:
        return { icon: <AlertCircle className="h-5 w-5" />, color: "text-gray-500 bg-gray-50" };
    }
  };

  const statusDetails = getStatusDetails(bookingData.bookingStatus);

  return (
    <div className="container mx-auto">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bookings
      </Button>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Bookings {`>`} {bookingData.bookingNumber}</p>
                  <h2 className="mt-1 text-xl font-semibold">
                    {bookingData.guest?.firstName} {bookingData.guest?.lastName}
                  </h2>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">{bookingData.guest?.firstName} {bookingData.guest?.lastName}</h3>
                  <p className="text-gray-500">
                    {bookingData.numberOfGuests || 1} {bookingData.numberOfGuests === 1 ? 'Guest' : 'Guests'} · 
                    {bookingData.numberOfRooms || 1} {bookingData.numberOfRooms === 1 ? 'Room' : 'Rooms'} · 
                    {calculateNights(bookingData.checkInDate, bookingData.checkOutDate)} {calculateNights(bookingData.checkInDate, bookingData.checkOutDate) === 1 ? 'Night' : 'Nights'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="text-red-500">
                    Edit Details
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        className="bg-green-500 hover:bg-green-600"
                        disabled={statusLoading}
                      >
                        {statusLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Change Status <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Set Booking Status</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        disabled={bookingData.bookingStatus === "PENDING"}
                        onClick={() => handleStatusChange("PENDING")}
                        className="text-yellow-500 focus:text-yellow-500 focus:bg-yellow-50"
                      >
                        <AlertCircle className="mr-2 h-4 w-4" /> Pending
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        disabled={bookingData.bookingStatus === "CONFIRMED"}
                        onClick={() => handleStatusChange("CONFIRMED")}
                        className="text-blue-500 focus:text-blue-500 focus:bg-blue-50"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" /> Confirmed
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        disabled={bookingData.bookingStatus === "CHECKED_IN"}
                        onClick={() => handleStatusChange("CHECKED_IN")}
                        className="text-green-500 focus:text-green-500 focus:bg-green-50"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" /> Check In
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        disabled={bookingData.bookingStatus === "CHECKED_OUT"}
                        onClick={() => handleStatusChange("CHECKED_OUT")}
                        className="text-purple-500 focus:text-purple-500 focus:bg-purple-50"
                      >
                        <LogOut className="mr-2 h-4 w-4" /> Check Out
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        disabled={bookingData.bookingStatus === "CANCELLED"}
                        onClick={() => handleStatusChange("CANCELLED")}
                        className="text-red-500 focus:text-red-500 focus:bg-red-50"
                      >
                        <XCircle className="mr-2 h-4 w-4" /> Cancel Booking
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        disabled={bookingData.bookingStatus === "NO_SHOW"}
                        onClick={() => handleStatusChange("NO_SHOW")}
                        className="text-orange-500 focus:text-orange-500 focus:bg-orange-50"
                      >
                        <XCircle className="mr-2 h-4 w-4" /> Mark as No-Show
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
                  <div>
                    <p className="font-medium">
                      {calculateNights(bookingData.checkInDate, bookingData.checkOutDate)} 
                      {calculateNights(bookingData.checkInDate, bookingData.checkOutDate) === 1 ? ' Night' : ' Nights'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(bookingData.checkInDate)} - {formatDate(bookingData.checkOutDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Button 
                      variant="link" 
                      className="text-red-500"
                      onClick={() => setIsExtendModalOpen(true)}
                      disabled={extendLoading}
                    >
                      {extendLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Extend
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{bookingData.numberOfGuests || 1} Guests</p>
                    <p className="text-sm text-gray-500">
                      {bookingData.numberOfGuests || 1} {bookingData.numberOfGuests === 1 ? 'Adult' : 'Adults'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Email: {bookingData.guest?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Room 1</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(bookingData.checkInDate)} - {formatDate(bookingData.checkOutDate)}
                      <br />
                      {bookingData.roomType}
                      <br />
                      {bookingData.numberOfGuests || 1} PAX
                    </p>
                  </div>
                  <div className="text-right">
                    <Button variant="link" className="text-red-500" onClick={() => setIsUpgradeModalOpen(true)}>
                      Change
                    </Button>
                  </div>
                </div>

                {bookingData.roomCharges && bookingData.roomCharges.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <h4 className="font-medium mb-2">Additional Charges</h4>
                    <div className="space-y-2">
                      {bookingData.roomCharges.map((charge: any, index: number) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{charge.description}</span>
                          <span>${Number(charge.amount).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t flex justify-between">
                      <span>Total Additional Charges</span>
                      <span className="font-medium">${bookingData.roomCharges.reduce((sum: number, charge: any) => sum + Number(charge.amount), 0).toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      const description = prompt("Enter charge description (e.g., Room Service)");
                      if (!description) return;
                      
                      const amount = parseFloat(prompt("Enter amount", "0") || "0");
                      if (isNaN(amount) || amount <= 0) {
                        toast({
                          title: "Error",
                          description: "Please enter a valid amount",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      const chargeType = "room_service"; // Default charge type
                      const notes = prompt("Enter notes (optional)") || "";
                      
                      handleAddRoomCharge(description, amount, chargeType, notes);
                    }}
                  >
                    Add Room Charge
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Price Summary</CardTitle>
                <span className="text-sm text-green-500">
                  {bookingData.paymentStatus === "PAID" ? "Paid" : "Pay at Hotel"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-6">
                <Button variant="outline" className="w-full justify-between">
                  <span>Total Bill</span>
                  <span>${Number(bookingData.totalAmount).toLocaleString()}</span>
                </Button>
                <div className="mt-4 px-4">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">{bookingData.roomType}</span>
                    <span>${Number(bookingData.baseAmount || bookingData.totalAmount).toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {bookingData.numberOfRooms || 1} Room × 
                    {calculateNights(bookingData.checkInDate, bookingData.checkOutDate)} Nights × 
                    ${(Number(bookingData.baseAmount || bookingData.totalAmount) / 
                      (calculateNights(bookingData.checkInDate, bookingData.checkOutDate) * 
                      (bookingData.numberOfRooms || 1))).toFixed(2)}
                  </div>
                  
                  {bookingData.taxAmount && Number(bookingData.taxAmount) > 0 && (
                    <div className="flex justify-between py-2 border-t mt-2">
                      <span className="text-gray-600">Taxes & Fees</span>
                      <span>${Number(bookingData.taxAmount).toLocaleString()}</span>
                    </div>
                  )}
                  
                  {bookingData.roomCharges && bookingData.roomCharges.length > 0 && (
                    <div className="border-t mt-2 pt-2">
                      <div className="text-gray-600 mb-1">Additional Charges:</div>
                      {bookingData.roomCharges.map((charge: any, index: number) => (
                        <div key={index} className="flex justify-between py-1 text-sm">
                          <span>{charge.description}</span>
                          <span>${Number(charge.amount).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between border-t pt-4">
                <span>Payment Collected</span>
                <span>${paymentsCollected.toLocaleString()}</span>
              </div>

              {bookingData.payments && bookingData.payments.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600 mb-1">Payment History:</p>
                  {bookingData.payments.map((payment: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{payment.method} ({new Date(payment.transactionDate).toLocaleDateString()})</span>
                      <span>${Number(payment.amount).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex justify-between border-t pt-4">
                <span>Security Deposit</span>
                <span>-</span>
              </div>

              <div className="mt-4 flex justify-between border-t pt-4">
                <span>Balance to Collect</span>
                <span className="font-medium">${balanceToCollect.toLocaleString()}</span>
              </div>

              <Button 
                className="mt-6 w-full bg-green-500 hover:bg-green-600"
                onClick={handleCollectPayment}
                disabled={balanceToCollect <= 0 || collectPaymentLoading}
              >
                {collectPaymentLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {balanceToCollect <= 0 ? "Fully Paid" : "Collect Payment"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <AnimatePresence>
        {isUpgradeModalOpen && (
          <RoomUpgradeModal 
          onClose={() => setIsUpgradeModalOpen(false)} 
          bookingId={booking} // Changed: booking to bookingId to match RoomUpgradeModal props
          currentRoomType={bookingData.roomType}
          />
        )}
      </AnimatePresence>
      
      {/* You would need to create an ExtendBookingModal component */}
      {/* {isExtendModalOpen && (
        <ExtendBookingModal 
          onClose={() => setIsExtendModalOpen(false)} 
          booking={booking}
          currentCheckOutDate={bookingData.checkOutDate}
          onExtend={handleExtendBooking}
          loading={extendLoading}
        />
      )} */}
    </div>
  )
}