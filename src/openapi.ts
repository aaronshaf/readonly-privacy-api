export const OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: {
    title: "readonly-privacy-api",
    version: "1.0.0",
    description:
      "A read-only proxy for the Privacy.com API, deployed as a Cloudflare Worker. Exposes virtual card and transaction data with sensitive fields (PAN, CVV, expiry) stripped."
  },
  servers: [{ url: "https://your-worker.workers.dev" }],
  security: [{ bearerAuth: [] }, { tokenQueryParam: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "Pass the READONLY_PRIVACY_BEARER_TOKEN secret as the Bearer token."
      },
      tokenQueryParam: {
        type: "apiKey",
        in: "query",
        name: "token",
        description: "Pass the READONLY_PRIVACY_BEARER_TOKEN secret as a ?token= query parameter."
      }
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" }
            },
            required: ["code", "message"]
          }
        },
        required: ["error"]
      },
      FundingSource: {
        type: "object",
        properties: {
          token: { type: "string", format: "uuid" },
          created: { type: "string", format: "date-time" },
          type: { type: "string" },
          state: { type: "string" },
          nickname: { type: "string" },
          account_name: { type: "string" },
          last_four: { type: "string" }
        }
      },
      Card: {
        type: "object",
        description: "Virtual card with sensitive fields (PAN, CVV, expiry) stripped.",
        properties: {
          token: { type: "string", format: "uuid" },
          created: { type: "string", format: "date-time" },
          last_four: { type: "string" },
          hostname: { type: "string" },
          memo: { type: "string" },
          type: {
            type: "string",
            enum: ["SINGLE_USE", "MERCHANT_LOCKED", "UNLOCKED", "PHYSICAL"]
          },
          spend_limit: {
            type: "integer",
            description: "Spend limit in cents. 0 means no limit."
          },
          spend_limit_duration: {
            type: "string",
            enum: ["TRANSACTION", "MONTHLY", "ANNUALLY", "FOREVER"]
          },
          state: { type: "string", enum: ["OPEN", "PAUSED", "CLOSED"] },
          funding: { $ref: "#/components/schemas/FundingSource" },
          auth_rule_tokens: { type: "array", items: { type: "string" } }
        }
      },
      CardListResponse: {
        type: "object",
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/Card" } },
          has_more: { type: "boolean" }
        },
        required: ["data", "has_more"]
      },
      TransactionEvent: {
        type: "object",
        properties: {
          token: { type: "string", format: "uuid" },
          amount: { type: "integer", description: "Amount in cents." },
          result: { type: "string", enum: ["APPROVED", "DECLINED"] },
          type: { type: "string" },
          created: { type: "string", format: "date-time" }
        }
      },
      TransactionFunding: {
        type: "object",
        properties: {
          token: { type: "string", format: "uuid" },
          amount: { type: "integer", description: "Amount in cents." },
          type: { type: "string" }
        }
      },
      Merchant: {
        type: "object",
        properties: {
          descriptor: { type: "string" },
          city: { type: "string" },
          state: { type: "string" },
          country: { type: "string" },
          mcc: { type: "string" },
          acceptor_id: { type: "string" }
        }
      },
      Transaction: {
        type: "object",
        description: "Transaction with no PAN or sensitive card data exposed. All amounts are in cents.",
        properties: {
          token: { type: "string", format: "uuid" },
          created: { type: "string", format: "date-time" },
          card_token: { type: "string", format: "uuid" },
          amount: { type: "integer", description: "Amount in cents." },
          authorization_amount: { type: "integer", description: "Amount in cents." },
          settled_amount: { type: "integer", description: "Amount in cents." },
          merchant_amount: { type: "integer", description: "Amount in cents." },
          merchant_authorization_amount: { type: "integer", description: "Amount in cents." },
          merchant_currency: { type: "string" },
          acquirer_fee: { type: "integer", description: "Acquirer fee in cents." },
          result: { type: "string", enum: ["APPROVED", "DECLINED"] },
          status: {
            type: "string",
            enum: ["PENDING", "VOIDED", "SETTLING", "SETTLED", "BOUNCED"]
          },
          authorization_code: { type: "string" },
          merchant: { $ref: "#/components/schemas/Merchant" },
          events: { type: "array", items: { $ref: "#/components/schemas/TransactionEvent" } },
          funding: { type: "array", items: { $ref: "#/components/schemas/TransactionFunding" } }
        }
      },
      TransactionListResponse: {
        type: "object",
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/Transaction" } },
          has_more: { type: "boolean" }
        },
        required: ["data", "has_more"]
      }
    }
  },
  paths: {
    "/healthz": {
      get: {
        operationId: "getHealth",
        summary: "Health check",
        description: "Public endpoint. No authentication required.",
        security: [],
        responses: {
          "200": {
            description: "Service is healthy.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    service: { type: "string", example: "readonly-privacy-api" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/openapi.json": {
      get: {
        operationId: "getOpenApiSpec",
        summary: "OpenAPI spec",
        description: "Public endpoint. Returns this OpenAPI 3.1 specification.",
        security: [],
        responses: {
          "200": {
            description: "OpenAPI spec as JSON.",
            content: { "application/json": { schema: { type: "object" } } }
          }
        }
      }
    },
    "/cards": {
      get: {
        operationId: "listCards",
        summary: "List virtual cards",
        description: "Returns virtual cards with sensitive fields (PAN, CVV, expiry) stripped.",
        parameters: [
          {
            name: "page_size",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 1000 },
            description: "Number of results per page."
          },
          {
            name: "starting_after",
            in: "query",
            schema: { type: "string", format: "uuid" },
            description: "Cursor for pagination — token of the last card seen."
          },
          {
            name: "begin",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "Filter cards created on or after this date (YYYY-MM-DD)."
          },
          {
            name: "end",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "Filter cards created on or before this date (YYYY-MM-DD)."
          },
          {
            name: "account_token",
            in: "query",
            schema: { type: "string", format: "uuid" },
            description: "Filter by account."
          }
        ],
        responses: {
          "200": {
            description: "List of cards.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/CardListResponse" } }
            }
          },
          "400": {
            description: "Invalid query parameter.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } }
            }
          },
          "401": {
            description: "Missing or invalid bearer token.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } }
            }
          }
        }
      }
    },
    "/cards/{token}": {
      get: {
        operationId: "getCard",
        summary: "Get a card by token",
        description: "Returns a single virtual card. Same field allowlist as the list route.",
        parameters: [
          {
            name: "token",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "UUID of the card."
          }
        ],
        responses: {
          "200": {
            description: "Card object.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Card" } }
            }
          },
          "400": {
            description: "Invalid or malformed token.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } }
            }
          },
          "401": {
            description: "Missing or invalid bearer token.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } }
            }
          }
        }
      }
    },
    "/transactions": {
      get: {
        operationId: "listTransactions",
        summary: "List transactions",
        description: "Returns transactions. No PAN or sensitive card data is exposed. All amounts are integers in cents.",
        parameters: [
          {
            name: "page_size",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 1000 },
            description: "Number of results per page."
          },
          {
            name: "starting_after",
            in: "query",
            schema: { type: "string", format: "uuid" },
            description: "Cursor for pagination — token of the last transaction seen."
          },
          {
            name: "begin",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "Filter transactions on or after this date (YYYY-MM-DD)."
          },
          {
            name: "end",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "Filter transactions on or before this date (YYYY-MM-DD)."
          },
          {
            name: "card_token",
            in: "query",
            schema: { type: "string", format: "uuid" },
            description: "Filter by card."
          },
          {
            name: "account_token",
            in: "query",
            schema: { type: "string", format: "uuid" },
            description: "Filter by account."
          },
          {
            name: "result",
            in: "query",
            schema: { type: "string", enum: ["APPROVED", "DECLINED"] },
            description: "Filter by authorization result."
          }
        ],
        responses: {
          "200": {
            description: "List of transactions.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TransactionListResponse" }
              }
            }
          },
          "400": {
            description: "Invalid query parameter.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } }
            }
          },
          "401": {
            description: "Missing or invalid bearer token.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } }
            }
          }
        }
      }
    },
    "/transactions/{token}": {
      get: {
        operationId: "getTransaction",
        summary: "Get a transaction by token",
        description:
          "Returns a single transaction. Disabled by default — returns 501 unless ENABLE_TRANSACTION_TOKEN_ROUTE=true is set on the worker.",
        parameters: [
          {
            name: "token",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "UUID of the transaction."
          }
        ],
        responses: {
          "200": {
            description: "Transaction object.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Transaction" }
              }
            }
          },
          "400": {
            description: "Invalid or malformed token.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } }
            }
          },
          "401": {
            description: "Missing or invalid bearer token.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } }
            }
          },
          "501": {
            description: "Route disabled.",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } }
            }
          }
        }
      }
    }
  }
} as const;
