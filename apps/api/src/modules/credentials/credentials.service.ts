import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  Credential,
  hashCredentialPayload,
  hashPin,
  generateDynamicQRToken,
  verifyDynamicQRToken,
  makeCredentialId,
  makePersonId,
} from '@umbral/core';
import {
  IssueCredentialDto,
  BlockCredentialDto,
  GenerateDynamicQRDto,
  VerifyCredentialDto,
} from './dto/credentials.dto';
import { v4 as uuidv4 } from './uuid';

@Injectable()
export class CredentialsService {
  private readonly credentialsMap = new Map<string, Credential>();
  private readonly hashToIdMap = new Map<string, string>();

  public issueCredential(dto: IssueCredentialDto) {
    const credentialHash = hashCredentialPayload(dto.rawPayload);

    if (this.hashToIdMap.has(credentialHash)) {
      throw new BadRequestException('A credential with this card/token payload already exists');
    }

    const id = makeCredentialId(uuidv4());
    const validFrom = new Date(dto.validFrom);
    const validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
    const pinHash = dto.pin ? hashPin(dto.pin) : null;
    const duressPinHash = dto.duressPin ? hashPin(dto.duressPin) : null;

    const res = Credential.create({
      id,
      personId: makePersonId(dto.personId),
      credentialType: dto.credentialType,
      credentialHash,
      pinHash,
      duressPinHash,
      status: 'active',
      validFrom,
      validUntil,
    });

    if (res.isErr()) {
      throw new BadRequestException(res.error.message);
    }

    const cred = res.value;
    this.credentialsMap.set(cred.id, cred);
    this.hashToIdMap.set(credentialHash, cred.id);

    return {
      id: cred.id,
      personId: cred.personId,
      credentialType: cred.credentialType,
      credentialHash: cred.credentialHash, // SHA-256 hash only
      status: cred.status,
      validFrom: cred.validFrom,
      validUntil: cred.validUntil,
    };
  }

  public getCredentialsForPerson(personId: string) {
    const list = Array.from(this.credentialsMap.values())
      .filter((c) => c.personId === personId)
      .map((c) => c.props);
    return list;
  }

  public getCredentialById(id: string) {
    const cred = this.credentialsMap.get(id);
    if (!cred) {
      throw new NotFoundException(`Credential ${id} not found`);
    }
    return cred.props;
  }

  public blockCredential(dto: BlockCredentialDto) {
    const cred = this.credentialsMap.get(dto.credentialId);
    if (!cred) {
      throw new NotFoundException(`Credential ${dto.credentialId} not found`);
    }

    const res = cred.block(dto.reason);
    if (res.isErr()) {
      throw new BadRequestException(res.error.message);
    }

    const updated = res.value;
    this.credentialsMap.set(updated.id, updated);
    return updated.props;
  }

  public generateQRToken(dto: GenerateDynamicQRDto) {
    const cred = this.credentialsMap.get(dto.credentialId);
    if (!cred) {
      throw new NotFoundException(`Credential ${dto.credentialId} not found`);
    }
    if (!cred.isActiveAt()) {
      throw new BadRequestException('Cannot generate QR for an inactive or blocked credential');
    }

    const token = generateDynamicQRToken(
      cred.id,
      cred.personId,
      dto.secretKey,
      dto.ttlSeconds ?? 60,
      dto.isSingleUse ?? false
    );

    return {
      credentialId: cred.id,
      qrToken: token,
      expiresInSeconds: dto.ttlSeconds ?? 60,
    };
  }

  public verifyCredential(dto: VerifyCredentialDto) {
    // 1. Check if input is a dynamic QR token
    if (dto.rawPayloadOrQRToken.includes('.')) {
      if (!dto.secretKeyForQR) {
        throw new BadRequestException('Secret key is required to verify signed QR token');
      }

      const qrResult = verifyDynamicQRToken(dto.rawPayloadOrQRToken, dto.secretKeyForQR);
      if (qrResult.isErr()) {
        return {
          valid: false,
          reasonCode: qrResult.error.code,
          message: qrResult.error.message,
        };
      }

      const qrPayload = qrResult.value;
      const cred = this.credentialsMap.get(qrPayload.credentialId);
      if (!cred || !cred.isActiveAt()) {
        return {
          valid: false,
          reasonCode: 'CREDENTIAL_INACTIVE',
          message: 'Credential is not active or has been revoked',
        };
      }

      return {
        valid: true,
        credentialId: cred.id,
        personId: cred.personId,
        credentialType: cred.credentialType,
        isDuress: false,
      };
    }

    // 2. Physical card or PIN lookup by hash
    const inputHash = hashCredentialPayload(dto.rawPayloadOrQRToken);
    const credId = this.hashToIdMap.get(inputHash);

    if (!credId) {
      return {
        valid: false,
        reasonCode: 'CREDENTIAL_NOT_FOUND',
        message: 'No matching credential found',
      };
    }

    const cred = this.credentialsMap.get(credId)!;
    if (!cred.isActiveAt()) {
      return {
        valid: false,
        reasonCode: 'CREDENTIAL_INACTIVE',
        message: `Credential is ${cred.status}`,
        blockReason: cred.blockReason,
      };
    }

    let isDuress = false;
    if (dto.pin) {
      if (cred.isDuressPin(dto.pin)) {
        isDuress = true;
      } else if (!cred.verifyPin(dto.pin)) {
        return {
          valid: false,
          reasonCode: 'INVALID_PIN',
          message: 'PIN code verification failed',
        };
      }
    }

    return {
      valid: true,
      credentialId: cred.id,
      personId: cred.personId,
      credentialType: cred.credentialType,
      isDuress, // Duress PIN grants access but sets alarm flag!
    };
  }
}
