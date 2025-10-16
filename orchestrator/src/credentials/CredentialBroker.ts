export interface CredentialRequest {
  service: string;
  scope: string;
  vaultPath?: string;
}

export interface CredentialResponse {
  token: string;
  expiresAt?: string;
}

/**
 * Credential broker interface described in the architecture spec. Implementations
 * retrieve scoped tokens (e.g., from Vault) without persisting secrets to disk.
 */
export interface CredentialBroker {
  getToken(request: CredentialRequest): Promise<CredentialResponse>;
}
