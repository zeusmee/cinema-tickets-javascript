import sinon from 'sinon';
import assert from 'assert';
import TicketService from '../src/pairtest/TicketService.js';

describe('TicketService', () => {
  let ticketPaymentService;
  let seatReservationService;
  let ticketService;

  beforeEach(() => {
    // Stub ticketPaymentService and seatReservationService
    ticketPaymentService = {
      pay: sinon.stub().resolves(),
    };
    seatReservationService = {
      reserveSeats: sinon.stub().resolves(),
    };
    ticketService = new TicketService(ticketPaymentService, seatReservationService);
  });

  describe('purchase', () => {
    it('should successfully purchase tickets', async () => {
      const accountId = '112233';
      const ticketTypeRequests = [{ getTicketType: () => 'ADULT', noOfTickets: 2 }];

      await ticketService.purchase(accountId, ticketTypeRequests);

      assert.ok(ticketPaymentService.pay.calledOnce, 'pay method should be called once');
      assert.ok(seatReservationService.reserveSeats.calledOnce, 'reserveSeats method should be called once');
    });

    it('should call payment and reservation services with valid request', async () => {
      const validRequest = [
        { getTicketType: () => 'ADULT', noOfTickets: 2 },
        { getTicketType: () => 'CHILD', noOfTickets: 1 },
      ];

      await ticketService.purchase('accountId', validRequest);

      assert.strictEqual(ticketPaymentService.pay.calledOnce, true, 'pay should be called once');
      assert.strictEqual(seatReservationService.reserveSeats.calledOnce, true, 'reserveSeats should be called once');
    });

    it('should handle payment failure', async () => {
      const accountId = '112233';
      const ticketTypeRequests = [{ getTicketType: () => 'ADULT', noOfTickets: 2 }];

      // Mock payment failure
      ticketPaymentService.pay.rejects(new Error('Payment failed'));
      try {
        await ticketService.purchase(accountId, ticketTypeRequests);
        assert.fail('Expected an exception to be thrown');
      } catch (error) {
        assert.ok(error instanceof Error, 'Expected a generic error');
        assert.strictEqual(error.message, 'Payment failed');
      }
    });
  });

  describe('validatePurchase', () => {
    it('should throw an error if more than 20 tickets are requested', function () {
      const ticketTypeRequests = Array.from({ length: 21 }, (_, index) => ({ getTicketType: () => 'ADULT', noOfTickets: 1 }));
      assert.throws(() => ticketService.validatePurchase(ticketTypeRequests), /Maximum of 20 tickets can be purchased at a time/);
    });

    it('should throw an error if no tickets are selected', function () {
      const ticketTypeRequests = [];
      assert.throws(() => ticketService.validatePurchase(ticketTypeRequests), /No tickets selected/);
    });

    it('should throw an error for Child and Infant tickets without an Adult ticket', function () {
      const ticketTypeRequests = [
        { getTicketType: () => 'CHILD', noOfTickets: 1 },
      ];
      assert.throws(() => ticketService.validatePurchase(ticketTypeRequests), /Child and Infant tickets cannot be purchased without purchasing an Adult ticket/);
    });

    it('should not throw an error for valid ticket purchases', function () {
      const ticketTypeRequests = [
        { getTicketType: () => 'ADULT', noOfTickets: 1 },
      ];
      assert.doesNotThrow(() => ticketService.validatePurchase(ticketTypeRequests));
    });
  });

  describe('calculateTotalTickets', function () {
    it('should return 0 for an empty tickets array', function () {
      const ticketTypeRequests = [];
      const result = ticketService.calculateTotalTickets(ticketTypeRequests);
      assert.strictEqual(result, 0);
    });

    it('should calculate the total number of tickets', function () {
      const ticketTypeRequests = [
        { noOfTickets: 2 },
        { noOfTickets: 3 },
        { noOfTickets: 1 },
      ];
      const result = ticketService.calculateTotalTickets(ticketTypeRequests);
      assert.strictEqual(result, 6);
    });
  });

  describe('calculateTotalPrice', function () {
    it('should return 0 for an empty array', function () {
      const accountId = '112233';
      const ticketTypeRequests = [];
      const result = ticketService.calculateTotalPrice(accountId, ticketTypeRequests);
      assert.strictEqual(result, 0);
    });

    it('should calculate the total price based on ticket type and quantity', function () {
      const accountId = '112233';
      const ticketTypeRequests = [
        { getTicketType: () => 'ADULT', noOfTickets: 2 },
        { getTicketType: () => 'CHILD', noOfTickets: 3 },
      ];
      const result = ticketService.calculateTotalPrice(accountId, ticketTypeRequests);
      assert.strictEqual(result, 70);
    });
  });

  describe('reserveSeats', async function () {
    it('should reserve seats for ADULT and CHILD ticket types', function () {
      const ticketTypeRequests = [
        { getTicketType: () => 'ADULT', noOfTickets: 2 },
        { getTicketType: () => 'CHILD', noOfTickets: 3 },
      ];

      const seatReservationService = {
        reserveSeats: sinon.stub(),
      };

      ticketService.seatReservationService = seatReservationService;

      ticketService.reserveSeats(ticketTypeRequests);
      assert.strictEqual(seatReservationService.reserveSeats.calledOnce, true);
      assert.strictEqual(seatReservationService.reserveSeats.firstCall.args[0], 5);
    });

    it('should not reserve seats for INFANT ticket types', function () {
      const ticketTypeRequests = [
        { getTicketType: () => 'INFANT', noOfTickets: 1 },
        { getTicketType: () => 'ADULT', noOfTickets: 2 },
      ];

      const seatReservationService = {
        reserveSeats: sinon.stub(),
      };

      ticketService.seatReservationService = seatReservationService;

      ticketService.reserveSeats(ticketTypeRequests);
      assert.strictEqual(seatReservationService.reserveSeats.calledOnce, true);
      assert.strictEqual(seatReservationService.reserveSeats.firstCall.args[0], 2);
    });
  });

  describe('getTicketPrice', function () {
    it('should throw InvalidPurchaseException for an invalid ticket type', function () {
      const invalidTicketType = 'INVALID_TYPE';
      assert.throws(() => ticketService.getTicketPrice(invalidTicketType), { name: 'Error', message: `Invalid ticket type: ${invalidTicketType}` });
    });

    it('should return the correct price for a valid ticket type', function () {
      const validTicketType = 'ADULT';
      const result = ticketService.getTicketPrice(validTicketType);
      assert.strictEqual(result, 20);
    });
  });
});
