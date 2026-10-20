import { createClient } from '@replit/revenuecat-sdk/client';

interface ConnectionSettings {
  connector_config_id?: string;
  settings?: {
    expires_at?: string;
    access_token?: string;
    oauth?: { credentials?: { access_token?: string } };
  };
}

interface ConnectionListResponse {
  items?: ConnectionSettings[];
}

let connectionSettings: ConnectionSettings | undefined;

async function getApiKey(): Promise<string> {
  const cachedToken = connectionSettings?.settings?.access_token;
  const expiresAt = connectionSettings?.settings?.expires_at;
  if (cachedToken && expiresAt && new Date(expiresAt).getTime() > Date.now()) {
    return cachedToken;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X-Replit-Token not found for repl/depl');
  }

  const data = (await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&limit=50',
    {
      headers: {
        'Accept': 'application/json',
        'X-Replit-Token': xReplitToken
      }
    }
  ).then(res => res.json())) as ConnectionListResponse;
  connectionSettings = data.items?.find((item) =>
    item.connector_config_id?.toLowerCase().includes('revenuecat')
  );

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('RevenueCat not connected');
  }
  return accessToken;
}

export async function getUncachableRevenueCatClient() {
  const apiKey = await getApiKey();
  return createClient({
    baseUrl: "https://api.revenuecat.com/v2",
    headers: { Authorization: "Bearer " + apiKey },
  });
}
