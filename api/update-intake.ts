/**
 * Vercel serverless — POST|PUT /api/update-intake
 * Proxies to GAS updateIntake (keeps GAS URL server-side).
 */
declare const process: { env: Record<string, string | undefined> };

type IntakeBody = {
  bookingId?: string;
  tourCode?: string;
  fullName?: string;
  dob?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  dietary?: string[];
  dietaryOther?: string;
  medical?: string;
  motionSickness?: string;
  photoStyle?: string[];
};

type VercelRequest = {
  method?: string;
  body?: IntakeBody;
};

type VercelResponse = {
  status: (code: number) => {
    json: (body: unknown) => void;
    end: () => void;
  };
};

function gasWebAppUrl(): string | null {
  const url = (process.env.GAS_WEBAPP_URL || process.env.VITE_GAS_WEBAPP_URL || '').trim();
  return url || null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = req.method?.toUpperCase();
  if (method !== 'POST' && method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = req.body ?? {};
  const bookingId = String(payload.bookingId || '').trim();
  if (!bookingId) {
    return res.status(400).json({ error: 'Missing bookingId' });
  }

  const gasUrl = gasWebAppUrl();
  if (!gasUrl) {
    return res.status(500).json({ error: 'GAS_WEBAPP_URL is not configured on the server' });
  }

  try {
    const gasRes = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateIntake', ...payload, bookingId }),
    });

    const text = await gasRes.text();
    let data: { status?: string; message?: string; intakeStatus?: string };
    try {
      data = JSON.parse(text) as typeof data;
    } catch {
      return res.status(502).json({ error: 'Invalid response from intake service' });
    }

    if (data.status === 'error') {
      return res.status(400).json({ error: data.message || 'Intake update failed' });
    }

    return res.status(200).json({
      success: true,
      bookingId,
      intakeStatus: data.intakeStatus || 'Completed',
    });
  } catch {
    return res.status(500).json({ error: 'Failed to update intake' });
  }
}
