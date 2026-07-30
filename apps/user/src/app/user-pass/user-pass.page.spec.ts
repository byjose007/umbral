import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { UserPassPage } from './user-pass.page';

describe('UserPassPage', () => {
  let component: UserPassPage;
  let fixture: ComponentFixture<UserPassPage>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(UserPassPage);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  /** Types a 4-digit PIN and resolves the mocked /user-pass/login call. */
  function loginWithPin(pin: number[], respondOk: boolean): void {
    pin.forEach((n) => component.onPinDigit(n));
    tick(200); // matches the setTimeout in onPinDigit before _checkPin runs

    const req = httpMock.expectOne(`${environment.apiUrl}/user-pass/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.personId).toBeTruthy();
    expect(req.request.body.pinHash).toBeTruthy();

    if (respondOk) {
      req.flush({ seedSecret: 's', encryptedSeed: 'e', salt: 'salt' });
    } else {
      req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    }
    tick();
  }

  it('should create the page and start unauthenticated', () => {
    expect(component).toBeTruthy();
    expect(component.isAuthenticated()).toBe(false);
  });

  it('should reject an incorrect PIN', fakeAsync(() => {
    loginWithPin([9, 9, 9, 9], false);
    expect(component.isAuthenticated()).toBe(false);
    expect(component.loginError()).toBeTruthy();
  }));

  it('should authenticate with a PIN the backend accepts', fakeAsync(() => {
    loginWithPin([1, 2, 3, 4], true);
    expect(component.isAuthenticated()).toBe(true);
  }));

  it('should logout and clear authentication', fakeAsync(() => {
    loginWithPin([1, 2, 3, 4], true);
    expect(component.isAuthenticated()).toBe(true);
    component.logout();
    expect(component.isAuthenticated()).toBe(false);
  }));

  it('should switch tabs correctly', fakeAsync(() => {
    loginWithPin([1, 2, 3, 4], true);
    component.setTab('history');
    expect(component.activeTab()).toBe('history');
    component.setTab('visitors');
    expect(component.activeTab()).toBe('visitors');
    component.setTab('pass');
    expect(component.activeTab()).toBe('pass');
  }));

  it('should toggle duress mode', fakeAsync(() => {
    loginWithPin([1, 2, 3, 4], true);
    expect(component.passMode()).toBe('normal');
    component.toggleDuress();
    expect(component.passMode()).toBe('duress');
    component.toggleDuress();
    expect(component.passMode()).toBe('normal');
  }));

  it('should issue a visitor pass and add it to the list', fakeAsync(() => {
    loginWithPin([1, 2, 3, 4], true);
    component.newPass.visitorName = 'Ana Visitante';
    component.newPass.validFrom = new Date().toISOString();
    component.newPass.validTo = new Date(Date.now() + 3600 * 1000).toISOString();
    component.newPass.maxUses = 2;
    component.issueVisitorPass();
    expect(component.visitorPasses().length).toBe(1);
    expect(component.visitorPasses()[0]!.visitorName).toBe('Ana Visitante');
    expect(component.visitorPasses()[0]!.status).toBe('active');
  }));

  it('should load demo access history on login', fakeAsync(() => {
    loginWithPin([1, 2, 3, 4], true);
    expect(component.accessHistory().length).toBeGreaterThan(0);
  }));
});
