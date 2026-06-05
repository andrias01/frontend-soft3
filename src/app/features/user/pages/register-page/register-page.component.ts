import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  CityOption,
  DepartmentOption,
  DocumentTypeOption,
  LocationOption,
  RegisterUserPayload
} from '@features/user/models/user-profile.model';
import { UserRegisterService } from '@features/user/services/user-register.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterPageComponent implements OnInit {
  private readonly registerService = inject(UserRegisterService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly loadingCatalogs = signal(true);
  protected readonly errorMsg = signal('');
  protected readonly successMsg = signal('');

  protected readonly documentTypes = signal<DocumentTypeOption[]>([]);
  protected readonly departments = signal<DepartmentOption[]>([]);
  protected readonly cities = signal<CityOption[]>([]);
  protected readonly locations = signal<LocationOption[]>([]);

  protected readonly model: RegisterUserPayload & { confirmPassword: string } = {
    firstName: '',
    lastName: '',
    documentTypeId: '',
    documentNumber: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthDate: '',
    departmentId: '',
    cityId: '',
    address: '',
    locationId: ''
  };

  protected passwordsMismatch = false;

  ngOnInit(): void {
    void this.loadCatalogs();
  }

  protected async submit(form: NgForm): Promise<void> {
    this.errorMsg.set('');
    this.successMsg.set('');
    this.passwordsMismatch = this.model.password !== this.model.confirmPassword;

    if (form.invalid || this.passwordsMismatch) {
      return;
    }

    const payload: RegisterUserPayload = {
      firstName: this.model.firstName.trim(),
      lastName: this.model.lastName.trim(),
      documentTypeId: this.model.documentTypeId,
      documentNumber: this.model.documentNumber.trim(),
      phone: this.model.phone.trim(),
      email: this.model.email.trim(),
      password: this.model.password,
      birthDate: this.model.birthDate,
      departmentId: this.model.departmentId,
      cityId: this.model.cityId,
      address: this.model.address.trim(),
      locationId: this.model.locationId
    };

    this.loading.set(true);
    try {
      await this.registerService.registerUser(payload);
      this.successMsg.set('Usuario registrado correctamente. Ahora puedes iniciar sesion.');
      this.resetModel();
      form.resetForm(this.model);
      this.cities.set([]);
      void this.router.navigate(['/login']);
    } catch (error) {
      this.errorMsg.set(
        this.registerService.getBackendErrorMessage(error) ||
          'No se pudo registrar el usuario. Verifica los datos e intenta nuevamente.'
      );
    } finally {
      this.loading.set(false);
    }
  }

  protected async onDepartmentChange(): Promise<void> {
    this.model.cityId = '';
    await this.loadCities(this.model.departmentId);
  }

  private async loadCatalogs(): Promise<void> {
    this.loadingCatalogs.set(true);
    this.errorMsg.set('');

    try {
      const catalogs = await this.registerService.loadCatalogs();
      this.documentTypes.set(catalogs.documentTypes);
      this.departments.set(catalogs.departments);

      const locations = catalogs.locations;

      this.locations.set(locations);
      
      if (!this.model.locationId && locations.length === 1) {
        this.model.locationId = locations[0].id;
      }
      
      if (locations.length === 0) {
        this.errorMsg.set('No hay sedes activas disponibles para registrar usuarios. Crea o activa una sede antes de continuar.');
      }
    } catch {
      this.errorMsg.set('No se pudieron cargar los catalogos del formulario.');
    } finally {
      this.loadingCatalogs.set(false);
    }
  }

  private async loadCities(departmentId: string): Promise<void> {
    this.cities.set(await this.registerService.loadCities(departmentId));
  }

  private resetModel(): void {
    this.model.firstName = '';
    this.model.lastName = '';
    this.model.documentTypeId = '';
    this.model.documentNumber = '';
    this.model.phone = '';
    this.model.email = '';
    this.model.password = '';
    this.model.confirmPassword = '';
    this.model.birthDate = '';
    this.model.departmentId = '';
    this.model.cityId = '';
    this.model.address = '';
    this.model.locationId = '';
    this.passwordsMismatch = false;
  }
}
