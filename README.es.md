# loopback-cnn-mssql

[Microsoft SQL Server](https://www.microsoft.com/en-us/sql-server/default.aspx) es un sistema de gestión de bases de datos relacionales desarrollado por Microsoft.
El módulo `loopback-cnn-mssql` es un fork moderno y mantenido del conector de Microsoft SQL Server para el framework LoopBack.

## Características

- **Código Modernizado**: Refactorizado para usar clases ES6+ y async/await.
- **Últimas Dependencias**: Actualizado para usar `mssql` v12+.
- **Configuración Flexible**: Soporta tanto configuración basada en objetos como cadenas de conexión (URLs) con fusión inteligente.
- **Enfoque en Seguridad**: Actualizaciones regulares y auditorías de dependencias.
- **Prettier & ESLint**: Estilo de código y calidad forzados.

## Instalación

En el directorio raíz de tu aplicación, ejecuta:

```shell
$ npm install loopback-cnn-mssql --save
```

Esto instalará el módulo desde npm y lo añadirá como una dependencia en el archivo `package.json` de la aplicación.

## Uso

Usa el [Generador de fuentes de datos](http://loopback.io/doc/en/lb3/Data-source-generator.html) para añadir una fuente de datos SQL Server a tu aplicación.
Selecciona `other` e introduce `loopback-cnn-mssql` como el nombre del conector si no aparece en la lista, o configúralo manualmente.

### Ejemplos de Configuración

#### Configuración Estándar

La entrada en el archivo `/server/datasources.json` de la aplicación se verá así:

```javascript
"sqlserverdb": {
    "name": "sqlserverdb",
    "connector": "loopback-cnn-mssql",
    "host": "localhost", // o "USER\\SQLEXPRESS" para instancias con nombre
    "port": 1433,
    "database": "mydb",
    "user": "sa",
    "password": "Password123!",
    "trustServerCertificate": true, // Útil para certificados auto-firmados locales
    "options": {
        "encrypt": true,
        "appName": "MiApp"
    }
}
```

#### Configuración por URL

También puedes usar una cadena de conexión. Las propiedades explícitas sobrescribirán los valores analizados desde la URL.

```javascript
"sqlserverdb": {
    "name": "sqlserverdb",
    "connector": "loopback-cnn-mssql",
    "url": "mssql://sa:Password123!@localhost/mydb?encrypt=true&trustServerCertificate=true"
}
```

### Ajustes del conector

Para configurar la fuente de datos para usar tu base de datos MS SQL Server, edita `datasources.json` y añade los siguientes ajustes según corresponda.
El conector MSSQL usa [node-mssql](https://github.com/patriksimek/node-mssql) como driver. Para más información sobre parámetros de configuración,
consulta la [documentación de node-mssql](https://github.com/patriksimek/node-mssql#configuration-1).

**Nota:** Las propiedades de configuración pueden colocarse en el nivel raíz o dentro de un objeto `options`. Las propiedades del nivel raíz tienen prioridad sobre `options`.

| Propiedad              | Tipo    | Predeterminado | Descripción                                          |
| ---------------------- | ------- | -------------- | ---------------------------------------------------- |
| connector              | String  |                | "loopback-cnn-mssql"                                 |
| host                   | String  | localhost      | Nombre del host de la base de datos (o nombre del servidor) |
| port                   | Number  | 1433           | Puerto TCP de la base de datos                       |
| database               | String  |                | Nombre de la base de datos                           |
| user                   | String  |                | Usuario de la base de datos                          |
| password               | String  |                | Contraseña para conectar a la base de datos          |
| url                    | String  |                | URL de conexión (mssql://...)                        |
| schema                 | String  | dbo            | Esquema de la base de datos                          |
| trustServerCertificate | Boolean | false          | Establecer en `true` para aceptar certificados auto-firmados |
| encrypt                | Boolean | true           | Cifrar la conexión                                   |

### Solución de Problemas

#### Error de Certificado Auto-firmado

Si encuentras `ConnectionError: Failed to connect to ... - self-signed certificate`, significa que el driver está rechazando el certificado del servidor.
Para solucionar esto en entornos de desarrollo, añade `trustServerCertificate: true` a tu configuración.

#### URL vs Configuración Explícita

Si proporcionas tanto una `url` como propiedades explícitas (como `host` o `user`), las propiedades explícitas **sobrescribirán** los valores encontrados en la URL. Esto es útil cuando tienes una URL base pero necesitas sobrescribir parámetros específicos (como el host para una instancia con nombre).

## Ejecutar pruebas

Las pruebas requieren una instancia de SQL Server en ejecución. Puedes usar Docker para ejecutar una.

```shell
$ npm test
```

## Licencia

MIT
