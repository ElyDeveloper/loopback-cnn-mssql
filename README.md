# loopback-cnn-mssql

[Microsoft SQL Server](https://www.microsoft.com/en-us/sql-server/default.aspx) is a relational database management system developed by Microsoft.
The `loopback-cnn-mssql` module is a modern, maintained fork of the Microsoft SQL Server connector for the LoopBack framework.

## Features

- **Modernized Codebase**: Refactored to use ES6+ classes and async/await.
- **Latest Dependencies**: Updated to use `mssql` v12+.
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

The entry in the application's `/server/datasources.json` will look like this (for example):

```javascript
"sqlserverdb": {
    "name": "sqlserverdb",
    "connector": "loopback-cnn-mssql",
    "host": "myhost",
    "port": 1433,
    "url": "mssql://username:password@dbhost/dbname",
    "database": "mydb",
    "password": "admin",
    "user": "admin",
    "options": {
        "encrypt": true,
        "trustServerCertificate": true // for local dev
    }
}
```

### Connector settings

To configure the data source to use your MS SQL Server database, edit `datasources.json` and add the following settings as appropriate.
The MSSQL connector uses [node-mssql](https://github.com/patriksimek/node-mssql) as the driver. For more information about configuration parameters,
see [node-mssql documentation](https://github.com/patriksimek/node-mssql#configuration-1).

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| connector | String | | "loopback-cnn-mssql" |
| database | String | | Database name |
| debug | Boolean | | If true, turn on verbose mode to debug database queries and lifecycle. |
| host | String | localhost | Database host name |
| password | String | | Password to connect to database |
| port | Number | 1433 | Database TCP port |
| schema | String | dbo | Database schema |
| url | String | | Connection URL |
| user | String | | Database username |

## Running tests

The tests require a running SQL Server instance. You can use Docker to run one.

```shell
$ npm test
```

## License

MIT
