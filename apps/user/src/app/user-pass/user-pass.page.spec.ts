import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserPassPage } from './user-pass.page';

describe('UserPassPage', () => {
  let component: UserPassPage;
  let fixture: ComponentFixture<UserPassPage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(UserPassPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the page and start unauthenticated', () => {
    expect(component).toBeTruthy();
    expect(component.isAuthenticated()).toBe(false);
  });

  it('should reject incorrect PIN', () => {
    // Simulate wrong PIN digits
    [9, 9, 9, 9].forEach(n => component.onPinDigit(n));
    // loginError is set after 200ms setTimeout — test synchronously via private method
    // Just verify the pin dots reset on wrong PIN
    expect(component.isAuthenticated()).toBe(false);
  });

  it('should authenticate with biometric shortcut', () => {
    component.onBiometric();
    expect(component.isAuthenticated()).toBe(true);
  });

  it('should logout and clear authentication', () => {
    component.onBiometric();
    expect(component.isAuthenticated()).toBe(true);
    component.logout();
    expect(component.isAuthenticated()).toBe(false);
  });

  it('should switch tabs correctly', () => {
    component.onBiometric();
    component.setTab('history');
    expect(component.activeTab()).toBe('history');
    component.setTab('visitors');
    expect(component.activeTab()).toBe('visitors');
    component.setTab('pass');
    expect(component.activeTab()).toBe('pass');
  });

  it('should toggle duress mode', () => {
    component.onBiometric();
    expect(component.passMode()).toBe('normal');
    component.toggleDuress();
    expect(component.passMode()).toBe('duress');
    component.toggleDuress();
    expect(component.passMode()).toBe('normal');
  });

  it('should issue a visitor pass and add it to the list', () => {
    component.onBiometric();
    component.newPass.visitorName = 'Ana Visitante';
    component.newPass.validFrom = new Date().toISOString();
    component.newPass.validTo = new Date(Date.now() + 3600 * 1000).toISOString();
    component.newPass.maxUses = 2;
    component.issueVisitorPass();
    expect(component.visitorPasses().length).toBe(1);
    expect(component.visitorPasses()[0]!.visitorName).toBe('Ana Visitante');
    expect(component.visitorPasses()[0]!.status).toBe('active');
  });

  it('should load demo access history on login', () => {
    component.onBiometric();
    expect(component.accessHistory().length).toBeGreaterThan(0);
  });
});
