// Import necessary modules and classes
import TicketTypeRequest from './lib/TicketTypeRequest.js';
import InvalidPurchaseException from './lib/InvalidPurchaseException.js';
import TicketPaymentService from '../thirdparty/paymentgateway/TicketPaymentService.js';
import SeatReservationService from '../thirdparty/seatbooking/SeatReservationService.js';

// TicketType class to represent different ticket types with their prices
class TicketType {
  constructor(type, price) {
    this.type = type;
    this.price = price;
  }
}

export default class TicketService {
  // Class properties
  ticketPaymentService;
  seatReservationService;
  maxTicketsLimit = 20;
  ticketTypes = {
    'ADULT': new TicketType('ADULT', 20),
    'CHILD': new TicketType('CHILD', 10),
    'INFANT': new TicketType('INFANT', 0),
  };

  // To initialize the TicketService with payment and seat reservation services
  constructor(ticketPaymentService, seatReservationService) {
    this.ticketPaymentService = ticketPaymentService;
    this.seatReservationService = seatReservationService;
  }

  // Main method to handle ticket purchases
  purchase(accountId, ticketTypeRequests) {
    // Validate the purchase
    this._validatePurchase(ticketTypeRequests);

    // Calculate total price
    const totalPrice = this._calculateTotalPrice(accountId, ticketTypeRequests);

    // Perform payment and seat reservation, handle exceptions
    return this.ticketPaymentService.pay(accountId, totalPrice)
      .then(() => this._reserveSeats(ticketTypeRequests))
      .catch(error => {
        throw new InvalidPurchaseException(error.message);
      });
  }

  // To validate the purchase based on specified scenarios
  _validatePurchase(ticketTypeRequests) {
    const totalTickets = this._calculateTotalTickets(ticketTypeRequests);

    // Scenario: Only a maximum of 20 tickets can be purchased at a time.
    if (ticketTypeRequests.length > this.maxTicketsLimit) {
      throw new Error(`Maximum of ${this.maxTicketsLimit} tickets can be purchased at a time`);
    }

    // Scenario: No tickets selected
    if (totalTickets === 0) {
      throw new Error('No tickets selected');
    }

    // Scenario: Child and Infant tickets cannot be purchased without purchasing an Adult ticket.
    const adultTickets = ticketTypeRequests.find(({ getTicketType }) => getTicketType() === 'ADULT');
    const hasChildOrInfantWithoutAdult = ticketTypeRequests.some(
      ({ getTicketType, noOfTickets }) =>
        (getTicketType() === 'CHILD' || getTicketType() === 'INFANT') && noOfTickets > 0 && !adultTickets
    );

    if (hasChildOrInfantWithoutAdult) {
      throw new Error('Child and Infant tickets cannot be purchased without purchasing an Adult ticket');
    }
  }

  // To calculate the total number of tickets in the request
  _calculateTotalTickets(ticketTypeRequests) {
    return ticketTypeRequests.reduce((acc, { noOfTickets }) => acc + noOfTickets, 0);
  }

  // To calculate the total price based on ticket types and quantities
  _calculateTotalPrice(accountId, ticketTypeRequests) {
    return ticketTypeRequests.reduce((acc, { getTicketType, noOfTickets }) => {
      const price = this._getTicketPrice(getTicketType());
      return acc + (noOfTickets * price);
    }, 0);
  }

  // To reserve seats based on the ticket types and quantities
  _reserveSeats(ticketTypeRequests) {
    const seatsToReserve = ticketTypeRequests.reduce((acc, { getTicketType, noOfTickets }) => {
      const ticketType = getTicketType();
      const seatsRequired = ticketType === 'ADULT' || ticketType === 'CHILD' ? noOfTickets : 0;
      return acc + seatsRequired;
    }, 0);

    return this.seatReservationService.reserveSeats(seatsToReserve);
  }

  // To get the price of a specific ticket type
  _getTicketPrice(ticketType) {
    const ticketTypeObj = this.ticketTypes[ticketType];
    if (!ticketTypeObj) {
      throw new InvalidPurchaseException(`Invalid ticket type: ${ticketType}`);
    }
    return ticketTypeObj.price;
  }
}
