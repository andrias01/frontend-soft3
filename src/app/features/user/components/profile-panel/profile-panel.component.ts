import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  output,
  signal
} from '@angular/core';
import {
  CityOption,
  DepartmentOption,
  DocumentTypeOption,
  EditableField,
  LocationOption,
  UpdateUserPayload,
  UserEditModel
} from '@features/user/models/user-profile.model';
import { UserProfileService } from '@features/user/services/user-profile.service';

@Component({
  selector: 'app-profile-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-panel.component.html',
  styleUrl: './profile-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePanelComponent implements OnInit {
  private readonly userProfileService = inject(UserProfileService);

  readonly panelClosed = output<void>();

  readonly loadingProfile = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);
  readonly currentUserId = signal<string | null>(null);

  readonly editable = signal<UserEditModel>({
    firstName: '',
    lastName: '',
    documentTypeId: '',
    documentNumber: '',
    phone: '',
    email: '',
    birthDate: '',
    departmentId: '',
    cityId: '',
    address: '',
    locationId: ''
  });

  readonly documentTypes = signal<DocumentTypeOption[]>([]);
  readonly departments = signal<DepartmentOption[]>([]);
  readonly cities = signal<CityOption[]>([]);
  readonly locations = signal<LocationOption[]>([]);

  readonly displayName = computed(() => {
    const first = this.editable().firstName.trim();
    const last = this.editable().lastName.trim();
    const full = `${first} ${last}`.trim();
    return full || 'Mi perfil';
  });

  ngOnInit(): void {
    void this.loadProfile();
  }

  updateField(field: EditableField, value: string): void {
    this.editable.update(current => ({ ...current, [field]: value }));
  }

  async onDepartmentChange(departmentId: string): Promise<void> {
    this.updateField('departmentId', departmentId);
    const cities = await this.userProfileService.loadCities(departmentId);
    this.cities.set(cities);
    const firstCityId = cities[0]?.id ?? '';
    this.updateField('cityId', firstCityId);
  }

  async saveProfile(): Promise<void> {
    const userId = this.currentUserId();
    if (!userId) {
      this.errorMsg.set('No se pudo identificar el usuario autenticado.');
      return;
    }

    this.loadingProfile.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);

    try {
      const payload: UpdateUserPayload = {
        firstName: this.editable().firstName.trim(),
        lastName: this.editable().lastName.trim(),
        documentTypeId: this.editable().documentTypeId,
        documentNumber: this.editable().documentNumber.trim(),
        phone: this.editable().phone.trim(),
        birthDate: this.editable().birthDate,
        departmentId: this.editable().departmentId,
        cityId: this.editable().cityId,
        address: this.editable().address.trim(),
        locationId: this.editable().locationId
      };

      await this.userProfileService.updateProfile(userId, payload);
      this.successMsg.set('Datos actualizados correctamente.');
      await this.loadProfile();
    } catch (error) {
      const detail = this.userProfileService.getBackendErrorMessage(error);
      this.errorMsg.set(detail || 'No fue posible actualizar los datos del usuario.');
    } finally {
      this.loadingProfile.set(false);
    }
  }

  private async loadProfile(): Promise<void> {
    this.loadingProfile.set(true);
    this.errorMsg.set(null);

    try {
      const profileData = await this.userProfileService.loadProfileData();
      this.currentUserId.set(profileData.userId);
      this.editable.set(profileData.editable);
      this.documentTypes.set(profileData.documentTypes);
      this.departments.set(profileData.departments);
      this.cities.set(profileData.cities);
      this.locations.set(profileData.locations);
    } catch (error) {
      const detail = this.userProfileService.getBackendErrorMessage(error);
      this.errorMsg.set(detail || 'No fue posible cargar los datos del usuario.');
    } finally {
      this.loadingProfile.set(false);
    }
  }
}
