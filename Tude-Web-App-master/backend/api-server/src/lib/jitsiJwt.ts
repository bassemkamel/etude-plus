import { createSign } from "crypto";

function base64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export interface JitsiTokenOptions {
  appId: string;
  apiKeyId: string;
  privateKeyPem: string;
  roomName: string;
  userId: string;
  displayName: string;
  email: string;
  isModerator: boolean;
}

export function generateJaasToken(opts: JitsiTokenOptions): string {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: `${opts.appId}/${opts.apiKeyId}`,
  };

  const payload = {
    aud: "jitsi",
    iss: "chat",
    iat: now,
    exp: now + 7200, // 2 hours
    nbf: now - 10,
    sub: opts.appId,
    room: opts.roomName,
    context: {
      user: {
        id: opts.userId,
        name: opts.displayName,
        email: opts.email,
        moderator: opts.isModerator,
      },
      features: {
        livestreaming: false,
        recording: false,
        transcription: false,
        "outbound-call": false,
      },
    },
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Handle private key — replace literal \n with actual newlines if needed
  const pem = opts.privateKeyPem.replace(/\\n/g, "\n");

  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  const signature = base64url(signer.sign(pem));

  return `${signingInput}.${signature}`;
}

export function jaasConfigured(): boolean {
  return !!(
    process.env["JAAS_APP_ID"] &&
    process.env["JAAS_API_KEY_ID"] &&
    process.env["JAAS_PRIVATE_KEY"]
  );
}
