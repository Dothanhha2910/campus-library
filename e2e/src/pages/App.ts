import type { Page } from '@playwright/test';
import { AdminDashboardPage } from './admin/AdminDashboardPage';
import { AdminLoansPage } from './admin/AdminLoansPage';
import { AdminUsersPage } from './admin/AdminUsersPage';
import { BooksPage } from './BooksPage';
import { ToastComponent } from './components/ToastComponent';
import { TopBarComponent } from './components/TopBarComponent';
import { LoansPage } from './LoansPage';
import { LoginPage } from './LoginPage';
import { ProfilePage } from './ProfilePage';
import { RegisterPage } from './RegisterPage';

/**
 * Registry of every page object bound to one browser page. Page objects do not create each other
 * (that would make them depend on each other); specs reach all of them through this one object.
 */
export class App {
  readonly toasts: ToastComponent;
  readonly topBar: TopBarComponent;
  readonly login: LoginPage;
  readonly register: RegisterPage;
  readonly books: BooksPage;
  readonly loans: LoansPage;
  readonly profile: ProfilePage;
  readonly adminDashboard: AdminDashboardPage;
  readonly adminUsers: AdminUsersPage;
  readonly adminLoans: AdminLoansPage;

  constructor(page: Page) {
    this.toasts = new ToastComponent(page);
    this.topBar = new TopBarComponent(page);
    this.login = new LoginPage(page);
    this.register = new RegisterPage(page);
    this.books = new BooksPage(page);
    this.loans = new LoansPage(page);
    this.profile = new ProfilePage(page);
    this.adminDashboard = new AdminDashboardPage(page);
    this.adminUsers = new AdminUsersPage(page);
    this.adminLoans = new AdminLoansPage(page);
  }
}
