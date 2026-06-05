# Guía de Inicio para Desarrolladores - Módulo de Pagos

¡Hola equipo! Esta guía explica cómo trabajar en el frontend del proyecto, cómo configurar su entorno y cómo crear nuevos componentes siguiendo la arquitectura establecida.

## 1. Configuración Inicial (Clonado del Repositorio)

Cuando clones el repositorio por primera vez, debes realizar los siguientes pasos:

1. **Instalar dependencias**:
   ```bash
   cd frontEnd
   pnpm install
   ```

2. **Configurar el entorno**:
   Crea un archivo llamado `.env.development` en la raíz de la carpeta `frontEnd/`. Este archivo es crucial porque contiene las variables que el frontend necesita para comunicarse con el backend.
   
   Contenido base recomendado para `.env.development`:
   ```env
   API_URL=http://localhost:8080/api/v1
   USER_TOKEN=tu_token_de_sesion_aqui
   LOCATION_ID=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
   ```

3. **Generar el archivo de configuración**:
   Ejecuta el script que transforma el `.env.development` en un archivo TypeScript que Angular puede entender:
   ```bash
   node scripts/generate-env.js
   ```
   *Nota: Este script se ejecuta automáticamente al hacer `pnpm start` o `pnpm run dev`.*

## 2. Flujo de Creación de Componentes

Seguimos una arquitectura modular. Para el módulo de pagos, todo vive en `src/app/features/payment/`.

### Estructura de Carpetas
Cada sub-módulo (ej: `cashreceipt`, `paymentmethod`) debe tener esta estructura:
- `models/`: Interfaces de TypeScript para los datos.
- `services/`: Servicios para llamadas a la API.
- `pages/`: Componentes que representan una página completa.
- `[nombre].routes.ts`: Definición de rutas específicas del sub-módulo.

### Pasos para crear un nuevo flujo:
1. **Definir el Modelo**: Crea la interfaz en `models/`.
2. **Crear el Servicio**: Crea el servicio en `services/` usando `ENV.apiUrl` (importado de `@config/env.config`).
3. **Crear la Página**: Crea el componente en `pages/`. Usa **Signals** para el estado y **Standalone Components**.
   Comando recomendado:
   ```bash
   pnpm ng g c features/payment/[sub-modulo]/pages/[nombre] --skip-tests
   ```
   puedes cambiar payment tambien por el nombre de tu modulo.
4. **Registrar Rutas**:
   - Crea el archivo `.routes.ts` en la carpeta del sub-módulo.
   - Regístralo en `src/app/features/payment/payment.routes.ts` (si existe) o directamente en `src/app/app.routes.ts`.

## 3. Rutas y Navegación

Las rutas principales están en `src/app/app.routes.ts`. Usamos **Lazy Loading** para cargar los módulos de funciones:

```typescript
{
  path: 'payment/cashreceipt',
  loadChildren: () => import('./features/payment/cashreceipt/cashreceipt.routes').then(m => m.CASH_RECEIPT_ROUTES)
}
```

## 4. Scripts Importantes

En el `package.json` de `frontEnd/` encontrarás:
- `pnpm run dev`: Inicia el servidor de desarrollo y genera el archivo de entorno.
- `node scripts/generate-env.js`: Solo genera el archivo `src/app/core/config/env.config.ts`.

---
*Cualquier duda con gusto.*
