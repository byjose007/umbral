import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  AccessRequest,
  AccessRequestStatus,
  assertRequiredDocumentsCurrent,
  makeAccessRequestId,
  makeSiteId,
  makeAccessLevelId,
  makePersonId,
} from '@umbral/core';
import { IdentityService } from '../identity/identity.service';
import { AccessRightsService } from '../access-rights/access-rights.service';
import { SubmitAccessRequestDto, AccessRequestDecisionDto } from './dto/workflow.dto';
import { v4 as uuidv4 } from './uuid';

@Injectable()
export class WorkflowService {
  private readonly requestsMap = new Map<string, AccessRequest>();

  constructor(
    private readonly identityService: IdentityService,
    private readonly accessRightsService: AccessRightsService
  ) {}

  public submitRequest(dto: SubmitAccessRequestDto) {
    const levels = this.accessRightsService.getAccessLevels(dto.siteId);
    const level = levels.find((l) => l.id === dto.requestedAccessLevelId);
    if (!level) {
      throw new BadRequestException(
        `Access level ${dto.requestedAccessLevelId} not found for site ${dto.siteId}`
      );
    }

    const id = makeAccessRequestId(uuidv4());
    const res = AccessRequest.create({
      id,
      siteId: makeSiteId(dto.siteId),
      applicantType: dto.applicantType,
      applicantName: dto.applicantName,
      applicantDocumentNumber: dto.applicantDocumentNumber,
      applicantPersonId: dto.applicantPersonId ? makePersonId(dto.applicantPersonId) : null,
      requestedAccessLevelId: makeAccessLevelId(dto.requestedAccessLevelId),
      reason: dto.reason,
      validFrom: new Date(dto.validFrom),
      validUntil: new Date(dto.validUntil),
      requiredDocumentTypes: dto.requiredDocumentTypes ?? [],
    });

    if (res.isErr()) {
      throw new BadRequestException(res.error.message);
    }

    const request = res.value;
    this.requestsMap.set(request.id, request);
    return request.props;
  }

  public listRequests(status?: AccessRequestStatus) {
    const now = new Date();
    let list = Array.from(this.requestsMap.values()).map((r) => this.reconcileExpiry(r, now));
    if (status) {
      list = list.filter((r) => r.status === status);
    }
    return list.map((r) => r.props);
  }

  public getRequestById(id: string) {
    const request = this.getExisting(id);
    return this.reconcileExpiry(request, new Date()).props;
  }

  public moveToReview(id: string, actor: string) {
    const request = this.getExisting(id);
    const res = request.transitionTo('in_review', actor);
    return this.persistTransition(res);
  }

  public approve(id: string, dto: AccessRequestDecisionDto) {
    const request = this.getExisting(id);

    if (request.requiredDocumentTypes.length > 0) {
      if (!request.applicantPersonId) {
        throw new BadRequestException(
          'Applicant has no linked identity record to verify required documents'
        );
      }

      const documents = this.identityService.getPersonDocuments(request.applicantPersonId);
      const check = assertRequiredDocumentsCurrent(documents, request.requiredDocumentTypes);
      if (check.isErr()) {
        throw new BadRequestException(check.error.message);
      }
    }

    const approvedRes = request.transitionTo('approved', dto.actor, new Date(), dto.reason);
    if (approvedRes.isErr()) {
      throw new BadRequestException(approvedRes.error.message);
    }

    const activeRes = approvedRes.value.transitionTo(
      'active',
      dto.actor,
      new Date(),
      'Acceso concedido con vigencia efectiva'
    );
    return this.persistTransition(activeRes);
  }

  public reject(id: string, dto: AccessRequestDecisionDto) {
    const request = this.getExisting(id);
    const res = request.transitionTo('rejected', dto.actor, new Date(), dto.reason);
    return this.persistTransition(res);
  }

  private getExisting(id: string): AccessRequest {
    const request = this.requestsMap.get(id);
    if (!request) {
      throw new NotFoundException(`Access request ${id} not found`);
    }
    return request;
  }

  private persistTransition(
    res: ReturnType<AccessRequest['transitionTo']>
  ) {
    if (res.isErr()) {
      throw new BadRequestException(res.error.message);
    }

    const request = res.value;
    this.requestsMap.set(request.id, request);
    return request.props;
  }

  private reconcileExpiry(request: AccessRequest, at: Date): AccessRequest {
    if (request.status === 'active' && at.getTime() > request.validUntil.getTime()) {
      const res = request.transitionTo('expired', 'system', at, 'Vigencia terminada');
      if (res.isOk()) {
        this.requestsMap.set(request.id, res.value);
        return res.value;
      }
    }
    return request;
  }
}
