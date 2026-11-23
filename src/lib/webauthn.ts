/**
 * Suporte opcional a biometria local via WebAuthn (Platform Authenticator)
 * para confirmação rápida de retirada no celular do sorveteiro.
 */

const CREDENTIAL_STORAGE_KEY = 'picole-webauthn-cred-id'

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export async function isBiometricsAvailable(): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !window.PublicKeyCredential ||
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function'
  ) {
    return false
  }
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export function hasRegisteredBiometrics(userId: string): boolean {
  return Boolean(localStorage.getItem(`${CREDENTIAL_STORAGE_KEY}:${userId}`))
}

export async function registerBiometrics(userId: string, userEmail: string, userName: string): Promise<boolean> {
  const available = await isBiometricsAvailable()
  if (!available) return false

  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const userIdBytes = new TextEncoder().encode(userId)

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'Picole - Romaneio' },
      user: {
        id: userIdBytes,
        name: userEmail,
        displayName: userName,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
      },
      timeout: 60000,
    },
  })) as PublicKeyCredential | null

  if (!credential) return false
  localStorage.setItem(`${CREDENTIAL_STORAGE_KEY}:${userId}`, bufferToBase64(credential.rawId))
  return true
}

export async function verifyBiometrics(userId: string): Promise<boolean> {
  const storedId = localStorage.getItem(`${CREDENTIAL_STORAGE_KEY}:${userId}`)
  if (!storedId) return false

  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [
        {
          id: base64ToBuffer(storedId) as BufferSource,
          type: 'public-key',
        },
      ],
      userVerification: 'required',
      timeout: 60000,
    },
  })

  return Boolean(assertion)
}
