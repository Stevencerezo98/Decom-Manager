# Manual de Instalación y Despliegue en aaPanel

Este manual detalla paso a paso cómo desplegar la aplicación full-stack (React + Express + MySQL) en tu propio servidor utilizando el panel de control **aaPanel**.

---

## 1. Requisitos Previos en tu Servidor / aaPanel

Asegúrate de tener instalados los siguientes componentes a través del **App Store** de aaPanel:
1. **Nginx** (cualquier versión estable como 1.22 o superior).
2. **MySQL Daemon** (versión 5.7 o 8.0).
3. **PM2 Manager** (este administrador de procesos de Node.js se instala gratis desde la tienda de aaPanel para mantener la app corriendo 24/7).
4. **Node.js** (versión 18 o 20 LTS, administrada desde PM2 Manager o Node.js Version Manager de aaPanel).

---

## 2. Preparación de la Base de Datos

En tu aaPanel, ve al menú lateral izquierdo **Database** (Base de Datos) y sigue estos pasos:

1. Haz clic en **Add Database** (Añadir Base de Datos).
2. Configura los datos exactos que proporcionaste:
   - **Database Name**: `decom_manager` *(o el nombre que prefieras)*
   - **Username**: `sql_decom`
   - **Password**: `06129812`
   - **Access Permission**: `Localhost` (recomendado para seguridad si la base de datos corre en el mismo servidor).
3. Haz clic en **Submit** para crearla.

> **Nota:** La aplicación tiene auto-migración. La primera vez que el servidor backend se conecte con éxito a la base de datos MySQL, creará automáticamente la tabla `app_state` y el registro de estado inicial si no existen. No necesitas importar ningún archivo `.sql` manualmente.

---

## 3. Configuración de Variables de Entorno

En la raíz de tu proyecto, crea un archivo llamado `.env` (sin extensión) y añade tus credenciales reales de producción:

```env
PORT=3000
DB_HOST=127.0.0.1
DB_USER=sql_decom
DB_PASSWORD=06129812
DB_NAME=decom_manager
NODE_ENV=production
```

---

## 4. Compilación del Proyecto (Build)

Antes de subirlo a tu hosting o directamente en la consola del aaPanel, ejecuta el comando de compilación. Esto compilará el frontend de React en la carpeta `/dist` y empaquetará el servidor backend de Express en un único archivo ultraligero y rápido en `/dist/server.cjs`.

Abre una terminal en la raíz del proyecto y ejecuta:

```bash
# Instala las dependencias necesarias
npm install

# Compila el frontend y el backend para producción
npm run build
```

---

## 5. Subir los Archivos al Servidor

En aaPanel, ve al menú **Files** (Archivos) y navega a la carpeta de tu sitio web (por ejemplo, `/www/wwwroot/tu-dominio.com/`).

Sube los siguientes archivos y carpetas esenciales:
1. `dist/` *(Contiene todo el frontend y el bundle del backend `server.cjs`)*
2. `package.json` *(Requerido por aaPanel/PM2)*
3. `.env` *(Con tus credenciales de producción creadas en el paso 3)*
4. `node_modules/` *(Opcional: puedes no subirlo y dejar que aaPanel lo instale ejecutando `npm install` en el servidor para evitar subidas pesadas)*

---

## 6. Configuración en PM2 Manager (aaPanel)

Para mantener la aplicación ejecutándose en segundo plano continuamente, sigue estos pasos utilizando la herramienta visual **PM2 Manager** de aaPanel:

1. Abre **PM2 Manager** desde la sección de aplicaciones instaladas.
2. Haz clic en **Add Project** (Añadir Proyecto).
3. Configura el formulario de la siguiente manera:
   - **Startup File**: Selecciona el archivo `dist/server.cjs` (que fue compilado con esbuild).
   - **Run Directory**: Selecciona la carpeta raíz del proyecto (donde reside tu archivo `.env` y el `package.json`).
   - **Project Name**: `decom_manager` *(o el nombre que gustes)*
   - **Node Version**: Elige la versión 18 o 20.
4. Haz clic en **Submit**. PM2 arrancará tu servidor Express automáticamente en el puerto `3000`.

---

## 7. Mapear tu Dominio y Configurar HTTPS/SSL

Para que tus usuarios puedan acceder mediante un dominio o subdominio amigable (como `https://decom.tudominio.com`):

1. En **PM2 Manager**, busca tu proyecto recién creado y haz clic en la opción **Web service mapping** (Mapear servicio web) en la columna de acciones.
2. Introduce el nombre de tu dominio o subdominio y haz clic en **Submit**. Esto creará automáticamente un sitio en la sección **Website** de aaPanel configurando un proxy reverso de Nginx hacia el puerto `3000`.
3. Ve a la sección **Website** en el menú lateral izquierdo de aaPanel.
4. Busca tu dominio asignado, haz clic en **Conf** (Configuración) y ve a la pestaña **SSL**.
5. Selecciona **Let's Encrypt**, marca tu dominio, acepta los términos y haz clic en **Apply** para obtener un certificado SSL HTTPS 100% gratuito y automático.

¡Listo! Tu sistema DECOM Manager estará en vivo de forma segura y permanente con sincronización en tu base de datos MySQL.
