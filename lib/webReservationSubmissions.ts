import { env } from "@/lib/config";
import { createGoogleAccessToken } from "@/lib/googleAuth";

const googleSheetsWriteScope = "https://www.googleapis.com/auth/spreadsheets";
const reservationSheetName = "HP予約";

export type WebReservationSubmission = {
  storeName: string;
  slotLabel: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  ageGroup: string;
  message: string;
};

type GoogleSheetsMetadataResponse = {
  sheets?: Array<{
    properties?: {
      title?: string;
    };
  }>;
};

export async function saveWebReservationSubmission(submission: WebReservationSubmission) {
  const spreadsheetId = extractSpreadsheetId(env.googleSheetsSpreadsheetId);
  const missingCredentials = [
    env.googleServiceAccountEmail ? null : "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    env.googleServiceAccountPrivateKey ? null : "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
    spreadsheetId ? null : "GOOGLE_SHEETS_SPREADSHEET_ID",
  ].filter((value): value is string => Boolean(value));

  if (missingCredentials.length > 0) {
    throw new Error(`Missing required Google Sheets environment variables: ${missingCredentials.join(", ")}`);
  }

  const accessToken = await createGoogleAccessToken(googleSheetsWriteScope);
  await ensureReservationSheetExists(spreadsheetId, accessToken);

  const submittedAt = new Date().toISOString();
  const values = [[
    submittedAt,
    submission.storeName,
    submission.slotLabel,
    submission.customerName,
    submission.customerPhone,
    submission.customerEmail,
    submission.ageGroup,
    submission.message,
  ]];
  const params = new URLSearchParams({
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
  });
  const range = `${quoteSheetName(reservationSheetName)}!A:H`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?${params.toString()}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google Sheets append request failed: ${response.status} ${errorBody}`);
  }

  return {
    submittedAt,
    sheetName: reservationSheetName,
  };
}

async function ensureReservationSheetExists(spreadsheetId: string, accessToken: string) {
  const metadataResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!metadataResponse.ok) {
    const errorBody = await metadataResponse.text();
    throw new Error(`Google Sheets metadata request failed: ${metadataResponse.status} ${errorBody}`);
  }

  const metadata = (await metadataResponse.json()) as GoogleSheetsMetadataResponse;
  const sheetExists = (metadata.sheets ?? []).some((sheet) => sheet.properties?.title === reservationSheetName);

  if (sheetExists) {
    return;
  }

  const createResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: {
              title: reservationSheetName,
              gridProperties: {
                rowCount: 1000,
                columnCount: 8,
              },
            },
          },
        },
      ],
    }),
    cache: "no-store",
  });

  if (!createResponse.ok) {
    const errorBody = await createResponse.text();
    throw new Error(`Google Sheets create sheet request failed: ${createResponse.status} ${errorBody}`);
  }

  await appendHeaderRow(spreadsheetId, accessToken);
}

async function appendHeaderRow(spreadsheetId: string, accessToken: string) {
  const range = `${quoteSheetName(reservationSheetName)}!A:H`;
  const params = new URLSearchParams({
    valueInputOption: "USER_ENTERED",
  });
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?${params.toString()}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [["送信日時", "店舗", "希望日時", "お名前", "電話番号", "メールアドレス", "年代", "ご質問・ご要望"]],
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google Sheets header write request failed: ${response.status} ${errorBody}`);
  }
}

function extractSpreadsheetId(value?: string) {
  if (!value) {
    return "";
  }

  const trimmedValue = value.trim();
  const match = trimmedValue.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] ?? trimmedValue;
}

function quoteSheetName(sheetName: string) {
  return `'${sheetName.replace(/'/g, "''")}'`;
}
