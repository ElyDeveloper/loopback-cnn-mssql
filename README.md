# loopback-cnn-mssql

[![Read in Spanish](https://img.shields.io/badge/Leer%20en-Espa%C3%B1ol-blue)](README.es.md)

[Microsoft SQL Server](https://www.microsoft.com/en-us/sql-server/default.aspx) is a relational database management system developed by Microsoft.
The `loopback-cnn-mssql` module is a modern, maintained fork of the Microsoft SQL Server connector for the LoopBack framework.

## Features

- **Modernized Codebase**: Refactored to use ES6+ classes and async/await.
- **Latest Dependencies**: Updated to use `mssql` v12+.
- **Flexible Configuration**: Supports both object-based configuration and connection strings (URLs) with intelligent merging.
- **Security Focused**: Regular updates and dependency audits.
- **Prettier & ESLint**: Enforced code style and quality.

## Installation

In your application root directory, enter:

```shell
$ npm install loopback-cnn-mssql --save
```

This will install the module from npm and add it as a dependency to the application's `package.json` file.

## Usage

Use the [Data source generator](http://loopback.io/doc/en/lb3/Data-source-generator.html) to add a SQL Server data source to your application.
Select `other` and enter `loopback-cnn-mssql` as the connector name if it's not listed, or manually configure it.

### Configuration Examples

#### Standard Configuration

The entry in the application's `/server/datasources.json` will look like this:

```javascript
"sqlserverdb": {
    "name": "sqlserverdb",
    "connector": "loopback-cnn-mssql",
    "host": "localhost", // or "USER\\SQLEXPRESS" for named instances
    "port": 1433,
    "database": "mydb",
    "user": "sa",
    "password": "Password123!",
    "trustServerCertificate": true, // Useful for local self-signed certs
    "options": {
        "encrypt": true,
        "appName": "MyApp"
    }
}
```

#### URL Configuration

You can also use a connection string. Explicit properties will override values parsed from the URL.

```javascript
"sqlserverdb": {
    "name": "sqlserverdb",
    "connector": "loopback-cnn-mssql",
    "url": "mssql://sa:Password123!@localhost/mydb?encrypt=true&trustServerCertificate=true"
}
```

### Connector settings

To configure the data source to use your MS SQL Server database, edit `datasources.json` and add the following settings as appropriate.
The MSSQL connector uses [node-mssql](https://github.com/patriksimek/node-mssql) as the driver. For more information about configuration parameters,
see [node-mssql documentation](https://github.com/patriksimek/node-mssql#configuration-1).

**Note:** Configuration properties can be placed at the root level or within an `options` object. Root-level properties take precedence over `options`.

| Property               | Type    | Default   | Description                                        |
| ---------------------- | ------- | --------- | -------------------------------------------------- |
| connector              | String  |           | "loopback-cnn-mssql"                               |
| host                   | String  | localhost | Database host name (or server name)                |
| port                   | Number  | 1433      | Database TCP port                                  |
| database               | String  |           | Database name                                      |
| user                   | String  |           | Database username                                  |
| password               | String  |           | Password to connect to database                    |
| url                    | String  |           | Connection URL (mssql://...)                       |
| schema                 | String  | dbo       | Database schema                                    |
| trustServerCertificate | Boolean | false     | Set to `true` to accept self-signed certificates |
| encrypt                | Boolean | true      | Encrypt the connection                             |

### Troubleshooting

#### Self-signed Certificate Error

If you encounter `ConnectionError: Failed to connect to ... - self-signed certificate`, it means the driver is rejecting the server's certificate.
To fix this in development environments, add `trustServerCertificate: true` to your configuration.

#### URL vs Explicit Config

If you provide both a `url` and explicit properties (like `host` or `user`), the explicit properties will **override** the values found in the URL. This is useful when you have a base URL but need to override specific parameters (like the host for a named instance).

## Running tests

The tests require a running SQL Server instance. You can use Docker to run one.

```shell
$ npm test
```

## License

MIT
