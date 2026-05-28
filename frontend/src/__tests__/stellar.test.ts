import { describe, it, expect, vi, beforeEach } from "vitest";

// 1. Intercept the Stellar SDK's Server class safely with a standalone mock implementation
vi.mock("@stellar/stellar-sdk/rpc", () => {
  return {
    Server: class {
      getEvents = vi.fn();
    },
    assembleTransaction: vi.fn(),
  };
});

// Import the implementation AFTER the mock block is securely established
import { fetchEvents, getChargeHistory, server } from "../stellar";

const getEventsMock = server.getEvents as ReturnType<typeof vi.fn>;

// 2. Define the dummy array we want our fake server pipeline to process
const mockRawEvents = [
  {
    topic: ["subscribed", "user_A"],
    value: { amount: 1000 },
    ledger: 123,
    ledgerCloseTime: 1700000000,
    txHash: "txhash1",
  },
  {
    topic: ["subscribed", "user_B"],
    value: { amount: 2000 },
    ledger: 124,
    ledgerCloseTime: 1700000001,
    txHash: "txhash2",
  },
  {
    topic: ["charged", "user_A"],
    value: { amount: 3000 },
    ledger: 125,
    ledgerCloseTime: 1700000002,
    txHash: "txhash3",
  },
  {
    topic: [],
    value: { unknown: true },
    ledger: 126,
    ledgerCloseTime: 1700000003,
    txHash: "txhash4",
  },
];

describe("fetchEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset our mock to return the test suite payload by default
    getEventsMock.mockResolvedValue({ events: mockRawEvents });
  });

  it("filters by event name correctly", async () => {
    const result = await fetchEvents("subscribed");

    expect(result).toHaveLength(2);
    expect(result[0].eventName).toBe("subscribed");
    expect(result[0].address).toBe("user_A");
    expect(result[1].address).toBe("user_B");
  });

  it("filters by address when provided", async () => {
    const result = await fetchEvents("subscribed", "user_A");

    expect(result).toHaveLength(1);
    expect(result[0].eventName).toBe("subscribed");
    expect(result[0].address).toBe("user_A");
    expect(result[0].data).toEqual({ amount: 1000 });
  });

  it("returns empty array on error", async () => {
    // Override default resolution to force an architecture crash
    getEventsMock.mockRejectedValue(new Error("Stellar RPC Network Failure"));

    const result = await fetchEvents("subscribed");

    // The function's internal catch block should swallow the exception and output [] safely
    expect(result).toEqual([]);
  });
});

describe("getChargeHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns correctly parsed ChargeEvent array", async () => {
    getEventsMock.mockResolvedValue({
      events: [
        {
          topic: ["charged", "user_A"],
          value: {
            _value: {
              merchant: "merchant_A",
              amount: 4500,
              charged_at: 1700000000,
            },
          },
          ledger: 200,
          ledgerCloseTime: 1700000000,
          txHash: "txhash_charged_1",
        },
        {
          topic: ["charged", "user_B"],
          value: {
            _value: {
              merchant: "merchant_B",
              amount: 1200,
              charged_at: 1700000001,
            },
          },
          ledger: 201,
          ledgerCloseTime: 1700000001,
          txHash: "txhash_charged_2",
        },
      ],
    });

    const result = await getChargeHistory("user_A");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      date: new Date(1700000000 * 1000),
      amount: "4500",
      txHash: "txhash_charged_1",
      merchant: "merchant_A",
    });
  });

  it("sorts newest first", async () => {
    getEventsMock.mockResolvedValue({
      events: [
        {
          topic: ["charged", "user_A"],
          value: {
            _value: {
              merchant: "merchant_A",
              amount: 2500,
              charged_at: 1700000000,
            },
          },
          ledger: 300,
          ledgerCloseTime: 1700000000,
          txHash: "txhash_charged_older",
        },
        {
          topic: ["charged", "user_A"],
          value: {
            _value: {
              merchant: "merchant_A",
              amount: 2600,
              charged_at: 1700000100,
            },
          },
          ledger: 301,
          ledgerCloseTime: 1700000100,
          txHash: "txhash_charged_newer",
        },
      ],
    });

    const result = await getChargeHistory("user_A");

    expect(result).toHaveLength(2);
    expect(result[0].txHash).toBe("txhash_charged_newer");
    expect(result[1].txHash).toBe("txhash_charged_older");
  });

  it("returns empty array on error", async () => {
    getEventsMock.mockRejectedValue(new Error("Stellar RPC failure"));

    const result = await getChargeHistory("user_A");

    expect(result).toEqual([]);
  });
});