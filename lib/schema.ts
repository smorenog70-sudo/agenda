// Definición de las colecciones de Appwrite. La usa /api/setup para crear todo
// automáticamente. Si algún día cambias el modelo, edítalo aquí.

export type AttrDef =
  | { name: string; type: "string"; size: number; required: boolean; default?: string }
  | { name: string; type: "integer"; required: boolean; default?: number }
  | { name: string; type: "boolean"; required: boolean; default?: boolean };

export type IndexDef = {
  name: string;
  type: "key" | "unique";
  attributes: string[];
};

export type CollectionDef = {
  id: string;
  name: string;
  attributes: AttrDef[];
  indexes: IndexDef[];
};

export const SCHEMA: CollectionDef[] = [
  {
    id: "accounts",
    name: "accounts",
    attributes: [
      { name: "email", type: "string", size: 320, required: true },
      { name: "access_token", type: "string", size: 4096, required: false },
      { name: "refresh_token", type: "string", size: 1024, required: false },
      { name: "expiry_date", type: "integer", required: false },
      { name: "scope", type: "string", size: 2048, required: false },
      { name: "token_type", type: "string", size: 64, required: false },
    ],
    indexes: [{ name: "email_unique", type: "unique", attributes: ["email"] }],
  },
  {
    id: "calendars",
    name: "calendars",
    attributes: [
      { name: "google_id", type: "string", size: 320, required: true },
      { name: "account_id", type: "string", size: 64, required: false },
      { name: "summary", type: "string", size: 1024, required: false },
      {
        name: "check_for_conflicts",
        type: "boolean",
        required: false,
        default: true,
      },
    ],
    indexes: [
      { name: "google_id_unique", type: "unique", attributes: ["google_id"] },
      { name: "account_idx", type: "key", attributes: ["account_id"] },
    ],
  },
  {
    id: "bookings",
    name: "bookings",
    attributes: [
      { name: "meeting_type", type: "string", size: 128, required: true },
      { name: "invitee_name", type: "string", size: 256, required: true },
      { name: "invitee_email", type: "string", size: 320, required: true },
      { name: "start_time", type: "string", size: 64, required: true },
      { name: "end_time", type: "string", size: 64, required: true },
      { name: "google_event_id", type: "string", size: 256, required: false },
      { name: "notes", type: "string", size: 8000, required: false },
      { name: "status", type: "string", size: 32, required: false },
      { name: "cancel_token", type: "string", size: 64, required: false },
      { name: "account_email", type: "string", size: 320, required: false },
    ],
    indexes: [
      { name: "cancel_token_unique", type: "unique", attributes: ["cancel_token"] },
      { name: "start_idx", type: "key", attributes: ["start_time"] },
    ],
  },
  {
    id: "settings",
    name: "settings",
    attributes: [
      // Un solo documento (id "config") con toda la configuración en JSON.
      { name: "data", type: "string", size: 1000000, required: false },
    ],
    indexes: [],
  },
];
